
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Language, StudySet, Card, UserProfile } from '../types';
import { UI_TEXT } from '../constants';
import { SpeakerIcon } from './icons/SpeakerIcon';

interface MemoriseModeProps {
  language: Language;
  studySet: StudySet;
  userProfile: UserProfile;
  onSessionEnd: () => void;
}

interface Question {
    card: Card;
    type: 'mcq' | 'input';
    options?: string[]; // Only for MCQ
}

// Helper to get random distractors from the set itself
const getDistractors = (correctCard: Card, allCards: Card[], count: number = 3): string[] => {
    const distractors = allCards.filter(c => c.id !== correctCard.id);
    const shuffled = [...distractors].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).map(c => c.term); // Assuming we are testing Definition -> Term
};

export const MemoriseMode: React.FC<MemoriseModeProps> = ({ language, studySet, userProfile, onSessionEnd }) => {
    const text = UI_TEXT[language];
    const settings = userProfile.settings.memoriseMode || { wordsPerLevel: 7, mixQuestionTypes: true, inputQuestionRatio: 0.3, enableRetryLevel1: true };
    
    // --- Session State ---
    const [level, setLevel] = useState(1);
    const [overallMasteredIds, setOverallMasteredIds] = useState<Set<string>>(new Set());
    const [view, setView] = useState<'question' | 'summary' | 'transition' | 'finished'>('question');
    const [phase, setPhase] = useState<'normal' | 'retry'>('normal');
    
    // --- Level State ---
    const [currentQueue, setCurrentQueue] = useState<Question[]>([]);
    const [unmasteredFromPrevLevel, setUnmasteredFromPrevLevel] = useState<Card[]>([]);
    const [remainingSetCards, setRemainingSetCards] = useState<Card[]>([]);
    
    // Tracking current level progress
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [levelMasteredIds, setLevelMasteredIds] = useState<Set<string>>(new Set());
    const [answeredIncorrectlyIds, setAnsweredIncorrectlyIds] = useState<Set<string>>(new Set());

    // --- Interaction State ---
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [inputText, setInputText] = useState('');
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | 'almost' | null>(null);
    
    // Refs
    const inputRef = useRef<HTMLInputElement>(null);
    
    const totalCards = studySet.cards.length;

    // --- Initialization ---
    useEffect(() => {
        // Shuffle full set initially
        const shuffled = [...studySet.cards].sort(() => 0.5 - Math.random());
        setRemainingSetCards(shuffled);
        startLevel(1, [], shuffled);
    }, []);
    
    // Auto-focus input on change
    useEffect(() => {
        if (currentQueue[currentQuestionIndex]?.type === 'input' && !feedback && inputRef.current) {
            inputRef.current.focus();
        }
    }, [currentQuestionIndex, currentQueue, feedback]);

    const startLevel = (lvl: number, unmastered: Card[], remaining: Card[]) => {
        const slotsAvailable = settings.wordsPerLevel - unmastered.length;
        const newCards = remaining.slice(0, slotsAvailable);
        const newRemaining = remaining.slice(slotsAvailable);
        
        const rawQueue = [...unmastered, ...newCards];
        // Shuffle queue so "old" cards don't always appear first
        const shuffledRaw = rawQueue.sort(() => 0.5 - Math.random());
        
        // Convert to Questions with assigned types
        const questions: Question[] = shuffledRaw.map(card => {
            let type: 'mcq' | 'input' = 'mcq';
            if (settings.mixQuestionTypes) {
                type = Math.random() < (settings.inputQuestionRatio || 0.3) ? 'input' : 'mcq';
            }
            
            let options: string[] | undefined = undefined;
            if (type === 'mcq') {
                 const distractors = getDistractors(card, studySet.cards, 3);
                 options = [card.term, ...distractors].sort(() => 0.5 - Math.random());
            }
            
            return { card, type, options };
        });

        setCurrentQueue(questions);
        setUnmasteredFromPrevLevel(unmastered); 
        setRemainingSetCards(newRemaining);
        setLevel(lvl);
        setCurrentQuestionIndex(0);
        setLevelMasteredIds(new Set());
        setAnsweredIncorrectlyIds(new Set());
        setPhase('normal');
        setView('question');
        setFeedback(null);
        setSelectedOption(null);
        setInputText('');
    };
    
    const startRetryPhase = (mistakes: Set<string>) => {
        const mistakeCards = studySet.cards.filter(c => mistakes.has(c.id));
        
        // Keep question types consistent or just defaults? Let's use same types logic or keep simpler.
        const questions: Question[] = mistakeCards.map(card => {
             // Re-generate MCQ options if needed to ensure randomness
             const distractors = getDistractors(card, studySet.cards, 3);
             const options = [card.term, ...distractors].sort(() => 0.5 - Math.random());
             // For retry, maybe stick to MCQ for ease? Or reuse mixed settings. Let's use mixed.
             let type: 'mcq' | 'input' = 'mcq';
             if (settings.mixQuestionTypes) type = Math.random() < 0.3 ? 'input' : 'mcq';
             
             return { card, type, options };
        });
        
        setCurrentQueue(questions);
        setCurrentQuestionIndex(0);
        setPhase('retry');
        setView('question');
        setFeedback(null);
        setSelectedOption(null);
        setInputText('');
    };

    const handleMCQAnswer = (option: string) => {
        if (feedback) return; // Prevent double click
        
        const currentQ = currentQueue[currentQuestionIndex];
        const isCorrect = option === currentQ.card.term;
        
        setSelectedOption(option);
        processAnswer(isCorrect, currentQ.card.id);
    };
    
    const handleInputAnswer = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (feedback || !inputText.trim()) return;
        
        const currentQ = currentQueue[currentQuestionIndex];
        const userAnswer = inputText.trim().toLowerCase();
        const correctAnswer = currentQ.card.term.toLowerCase();
        
        // Exact match
        if (userAnswer === correctAnswer) {
            processAnswer(true, currentQ.card.id);
            return;
        }
        
        // Fuzzy / Almost (simple check: if only 1-2 chars different)
        // For simplicity: check if correct answer contains user answer or vice versa if length > 4
        // Or strictly wrong. Let's allow simple case-insensitive exact for now.
        // We can add "Almost" state if length diff is small and levenshtein distance is low.
        // Implementing simple "Almost" if it starts with same 2 letters and length is close
        
        processAnswer(false, currentQ.card.id);
    };
    
    const processAnswer = (isCorrect: boolean, cardId: string) => {
         setFeedback(isCorrect ? 'correct' : 'incorrect');
         
         if (phase === 'normal') {
            if (isCorrect) {
                // Only mark mastered if we haven't already got it wrong this level
                if (!answeredIncorrectlyIds.has(cardId)) {
                    setLevelMasteredIds(prev => new Set(prev).add(cardId));
                }
            } else {
                setAnsweredIncorrectlyIds(prev => new Set(prev).add(cardId));
            }
         }
         
         // Auto-advance
        setTimeout(() => {
            advance();
        }, isCorrect ? 1000 : 2000); // Longer delay for error to read feedback
    };
    
    const handleDontKnow = () => {
        if (feedback) return;
        const currentQ = currentQueue[currentQuestionIndex];
        
        if (phase === 'normal') {
             setAnsweredIncorrectlyIds(prev => new Set(prev).add(currentQ.card.id));
        }
        
        setFeedback('incorrect');
        setSelectedOption('__DONT_KNOW__'); // Special marker
        
         setTimeout(() => {
            advance();
        }, 1500);
    };
    
    const advance = () => {
        if (currentQuestionIndex < currentQueue.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setFeedback(null);
            setSelectedOption(null);
            setInputText('');
        } else {
            handleEndOfQueue();
        }
    };

    const handleEndOfQueue = () => {
        if (phase === 'normal' && level === 1 && settings.enableRetryLevel1 && answeredIncorrectlyIds.size > 0) {
            startRetryPhase(answeredIncorrectlyIds);
        } else {
            finishLevel();
        }
    };

    const finishLevel = () => {
        // Update global mastered list
        const newOverallMastered = new Set(overallMasteredIds);
        levelMasteredIds.forEach(id => newOverallMastered.add(id));
        setOverallMasteredIds(newOverallMastered);
        
        // Transition screen
        setView('transition');
    };
    
    const proceedToNextLevel = () => {
        // Calculate unmastered cards to carry over
        // Any card in original currentQueue (before retry) that is NOT in levelMasteredIds
        // We need to re-construct from studySet based on answeredIncorrectlyIds basically
        // Or easier:
        // unmastered = currentQueue (from normal phase) where id NOT in levelMasteredIds
        // BUT currentQueue was replaced if we went to retry phase. 
        // We need to fetch from set or logic.
        
        // Simplest: Iterate over all cards in this level (tracked via a new state ref or just diffing)
        // Or just filter `remainingSetCards` (already done) + `unmasteredFromPrevLevel` (already done)
        
        // Wait, `remainingSetCards` are FUTURE cards. 
        // We need to know which of the CURRENT level cards failed.
        
        // Cards in this level were: `unmasteredFromPrevLevel` + some new from `remainingSetCards` (before slice)
        // We can't easily reconstruct without state.
        
        // Correct approach: Track `currentLevelCards` state.
        // unmastered = currentLevelCards.filter(c => !levelMasteredIds.has(c.id))
        
        // Wait, `levelMasteredIds` is accurate. We just need the list of all cards that were in this level.
        // We can check `studySet.cards` and see which ones are NOT in `overallMasteredIds` AND NOT in `remainingSetCards`.
        
        const allMastered = new Set([...overallMasteredIds, ...levelMasteredIds]); // Updated set
        const futureCards = new Set(remainingSetCards.map(c => c.id));
        
        const carryOver = studySet.cards.filter(c => !allMastered.has(c.id) && !futureCards.has(c.id));
        
        if (carryOver.length === 0 && remainingSetCards.length === 0) {
            setView('finished');
        } else {
            startLevel(level + 1, carryOver, remainingSetCards);
        }
    };

    // --- Helpers for UI ---
    const formatString = (str: string, ...args: (string | number)[]) => {
        return str.replace(/{(\d+)}/g, (match, number) => { 
            return typeof args[number] !== 'undefined' ? String(args[number]) : match;
        });
    };

    const currentQ = currentQueue[currentQuestionIndex];
    
    // --- Render: Finished ---
    if (view === 'finished') {
        return (
            <div className="max-w-2xl mx-auto px-4 py-12 text-center animate-fade-in">
                 <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                    🧠
                </div>
                <h2 className="text-3xl font-bold font-display mb-4">{text.memorise_complete}</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">{text.memorise_complete_desc}</p>
                
                <div className="bg-white dark:bg-dark-surface p-6 rounded-xl shadow border dark:border-dark-primary/20 mb-8">
                    <p className="text-lg font-bold text-primary">{totalCards} / {totalCards} {text.progress_mastered}</p>
                    <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-blue-500" style={{width: '100%'}}></div>
                    </div>
                </div>

                <button onClick={onSessionEnd} className="px-8 py-3 bg-primary text-white rounded-lg font-bold shadow hover:bg-primary-600 transition-colors">
                    {text.back_to_dashboard}
                </button>
            </div>
        );
    }

    // --- Render: Transition Screen ---
    if (view === 'transition') {
        const masteredCount = levelMasteredIds.size;
        
        // Find Card objects for mastered IDs
        const masteredCards = studySet.cards.filter(c => levelMasteredIds.has(c.id));
        
        return (
             <div className="max-w-xl mx-auto px-4 py-8 text-center animate-fade-in flex flex-col h-full">
                <div className="flex-grow overflow-y-auto">
                    <h2 className="text-2xl font-bold font-display mb-2">{formatString(text.level_complete, level)} 🎉</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {formatString(text.level_summary_msg, masteredCount, currentQueue.length - masteredCount)}
                    </p>
                    
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                         <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-100 dark:border-green-900/30">
                             <div className="text-2xl font-bold text-green-600 dark:text-green-400">{masteredCount}</div>
                             <div className="text-xs uppercase text-gray-500">{text.rate_mastered}</div>
                         </div>
                         <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30">
                             <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{Math.round((overallMasteredIds.size / totalCards) * 100)}%</div>
                             <div className="text-xs uppercase text-gray-500">{text.total_progress}</div>
                         </div>
                    </div>

                    {/* Mastered List */}
                    {masteredCards.length > 0 && (
                        <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border dark:border-dark-primary/20 text-left overflow-hidden mb-6">
                            <div className="bg-gray-50 dark:bg-dark-background px-4 py-3 border-b dark:border-dark-primary/10">
                                <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide">{text.mastered_words_list}</h3>
                            </div>
                            <ul className="divide-y divide-gray-100 dark:divide-gray-800 max-h-60 overflow-y-auto">
                                {masteredCards.map(card => (
                                    <li key={card.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-background/50 transition-colors">
                                        <div className="font-bold text-primary-800 dark:text-primary-300">{card.term}</div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">{card.definition}</div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t dark:border-dark-primary/10">
                    <button onClick={proceedToNextLevel} className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-primary-600 hover:scale-[1.02] transition-all">
                        {formatString(text.continue_next_level, level + 1)} &rarr;
                    </button>
                </div>
            </div>
        );
    }

    // --- Render: Question ---
    if (!currentQ) return null;

    return (
        <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col h-full">
            {/* Header / Progress */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-700 dark:text-gray-200">{text.level_label} {level}</span>
                        {phase === 'retry' && (
                            <span className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full font-bold animate-pulse border border-orange-200">
                                {text.lets_try_again}
                            </span>
                        )}
                    </div>
                    <button onClick={onSessionEnd} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">Exit</button>
                </div>
                
                {/* Total Progress Bar (Thin) */}
                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mb-3 overflow-hidden">
                    <div 
                        className="h-full bg-blue-500 transition-all duration-300" 
                        style={{ width: `${(overallMasteredIds.size / totalCards) * 100}%` }}
                    />
                </div>
                
                {/* Level Progress (Text) */}
                 <div className="flex justify-between text-xs font-semibold text-gray-400 uppercase tracking-wide">
                     <span>{text.total_progress}: {Math.round((overallMasteredIds.size / totalCards) * 100)}%</span>
                     <span>{phase === 'retry' ? text.review_mistakes : `${levelMasteredIds.size} ${text.mastered_in_level}`}</span>
                 </div>
            </div>

            {/* Question Card */}
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-lg border dark:border-dark-primary/20 p-8 mb-6 flex-grow flex flex-col justify-center text-center">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 block">{text.definition_label_caps}</span>
                <h3 className="text-xl md:text-2xl font-medium text-gray-800 dark:text-gray-100 leading-relaxed mb-6">
                    {currentQ.card.definition}
                </h3>
                
                {currentQ.type === 'input' && (
                    <form onSubmit={handleInputAnswer} className="w-full max-w-sm mx-auto">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            disabled={!!feedback}
                            placeholder={text.enter_answer}
                            className={`w-full p-4 text-center text-lg border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
                                feedback === 'correct' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
                                feedback === 'incorrect' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                                'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-background focus:border-primary'
                            }`}
                        />
                         {feedback === 'incorrect' && (
                            <div className="mt-3 text-red-600 font-medium animate-fade-in">
                                {formatString(text.almost_correct, currentQ.card.term)}
                            </div>
                        )}
                        <button type="submit" className="hidden">Submit</button>
                    </form>
                )}
            </div>

            {/* Options (MCQ Only) */}
            {currentQ.type === 'mcq' && (
                <div className="space-y-3 mb-6">
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">{text.choose_answer}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {currentQ.options?.map((opt, idx) => {
                            let btnClass = "p-4 rounded-xl border-2 text-left text-sm font-semibold transition-all duration-200 ";
                            
                            if (feedback) {
                                if (opt === currentQ.card.term) {
                                    btnClass += "bg-green-100 border-green-500 text-green-800 dark:bg-green-900/40 dark:text-green-300 dark:border-green-500";
                                } else if (opt === selectedOption) {
                                    btnClass += "bg-red-100 border-red-500 text-red-800 dark:bg-red-900/40 dark:text-red-300 dark:border-red-500";
                                } else {
                                    btnClass += "opacity-50 border-gray-200 dark:border-gray-700";
                                }
                            } else {
                                 btnClass += "bg-white dark:bg-dark-surface border-gray-200 dark:border-gray-700 hover:border-primary hover:shadow-md";
                            }
    
                            return (
                                <button 
                                    key={idx}
                                    onClick={() => handleMCQAnswer(opt)}
                                    disabled={!!feedback}
                                    className={btnClass}
                                >
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
            
            {/* Input Submit Button (Mobile/Explicit) */}
             {currentQ.type === 'input' && !feedback && (
                <div className="mb-4">
                    <button 
                        onClick={() => handleInputAnswer()} 
                        disabled={!inputText.trim()}
                        className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow hover:bg-primary-600 disabled:opacity-50 transition-colors"
                    >
                        {text.submit_answer}
                    </button>
                </div>
            )}

            {/* Footer */}
            <div className="flex justify-center">
                <button 
                    onClick={handleDontKnow}
                    disabled={!!feedback}
                    className="text-gray-400 hover:text-primary font-bold text-sm transition-colors disabled:opacity-0"
                >
                    {text.rate_dont_know}?
                </button>
            </div>
        </div>
    );
};
