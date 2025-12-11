
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Language, StudySet, Card, StudyMode } from '../types';
import { UI_TEXT } from '../constants';
import { generateDistractors } from '../services/geminiService';

const getFallbackDistractors = (correctCard: Card, allCards: Card[], count: number): string[] => {
    const options = new Set<string>();
    const distractors = allCards.filter(c => c.id !== correctCard.id);
    
    // Attempt to get random unique distractors from the set
    while (options.size < count && distractors.length > 0) {
        const randomIndex = Math.floor(Math.random() * distractors.length);
        options.add(distractors[randomIndex].definition);
        distractors.splice(randomIndex, 1);
    }
    
    // Fill remaining with generic placeholders if set is too small
    const genericDistractors = ["Incorrect Answer A", "Incorrect Answer B", "Incorrect Answer C", "Incorrect Answer D"];
    let genIdx = 0;
    while (options.size < count && genIdx < genericDistractors.length) {
        options.add(genericDistractors[genIdx]);
        genIdx++;
    }
    
    return Array.from(options);
};

interface Question {
    id: string; // Unique ID per instance
    questionText: string;
    correctAnswer: string;
    options: string[];
    originalCardId: string;
    hint?: string;
}

export const TestMode: React.FC<{
  language: Language;
  studySet: StudySet;
  onSessionEnd: () => void;
}> = ({ language, studySet, onSessionEnd }) => {
    const text = UI_TEXT[language];
    
    // Load Settings
    const storedProfile = localStorage.getItem('studymate_user_profile_v3');
    const profile = storedProfile ? JSON.parse(storedProfile) : null;
    const settings = profile?.settings?.testMode || {
        behavior: 'memorise_all',
        numberOfChoices: 4,
        masteryThreshold: 3,
        animations: true,
        autoSave: true,
        hintPenalty: true,
        shuffleChoices: true,
    };
    const masteryData = studySet.mastery || {};

    const [queue, setQueue] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFinished, setIsFinished] = useState(false);
    const [consecutiveCorrectMap, setConsecutiveCorrectMap] = useState<{[key: string]: number}>({});

    // Question State
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
    const [shake, setShake] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [hintRevealed, setHintRevealed] = useState(false);

    // Initial Load
    useEffect(() => {
        const initTest = async () => {
            setIsLoading(true);
            
            // Filter cards not yet mastered (if continuing) or use all
            // For this implementation, we re-verify everything in the session, 
            // but prioritize ones with low global mastery if we were doing strict SRS.
            // Simplified: Load all cards into the queue.
            
            let cardsToLoad = [...studySet.cards];
            if (profile?.settings?.preferences?.shuffle) {
                cardsToLoad.sort(() => Math.random() - 0.5);
            }
            
            // Generate Questions
            const newQueue: Question[] = [];
            
            // For a better UX, we might load distractors in batches, but here we pre-load for the session
            // to ensure smoothness. If set is > 20, we might want to optimize.
            // Limit API calls for demo purposes to first 10 if set is huge, or simple fallback.
            
            const distractorPromises = cardsToLoad.map(card => 
                generateDistractors(card.term, card.definition, language, (settings.numberOfChoices || 4) - 1)
            );
            
            const allDistractors = await Promise.all(distractorPromises);
            
            cardsToLoad.forEach((card, index) => {
                const distractors = allDistractors[index].length > 0 
                    ? allDistractors[index] 
                    : getFallbackDistractors(card, studySet.cards, (settings.numberOfChoices || 4) - 1);
                
                const options = [card.definition, ...distractors];
                if (settings.shuffleChoices) {
                    options.sort(() => Math.random() - 0.5);
                }

                newQueue.push({
                    id: `q-${card.id}-${Date.now()}`,
                    questionText: card.term,
                    correctAnswer: card.definition,
                    options,
                    originalCardId: card.id,
                    hint: card.term.substring(0, 1) + "..." // Simple hint logic
                });
            });

            setQueue(newQueue);
            
            // Initialize local streak map from global if needed, or 0
            const initialMap: {[key: string]: number} = {};
            cardsToLoad.forEach(c => {
                initialMap[c.id] = masteryData[c.id]?.consecutiveCorrect || 0;
            });
            setConsecutiveCorrectMap(initialMap);
            
            setIsLoading(false);
        };
        
        initTest();
    }, [studySet, language]);

    const saveProgress = (cardId: string, isCorrect: boolean) => {
        if (!settings.autoSave) return;

        // We need to update the global profile state in localStorage (and ideally lift state up)
        // Since we are inside a component, we read/write to localStorage directly for this implementation
        // In a real Redux/Context app, we'd dispatch an action.
        
        try {
            const currentProfileStr = localStorage.getItem('studymate_user_profile_v3');
            if (currentProfileStr) {
                const currentProfile = JSON.parse(currentProfileStr);
                const currentSetIndex = currentProfile.studySets.findIndex((s: StudySet) => s.id === studySet.id);
                
                if (currentSetIndex >= 0) {
                    const currentSet = currentProfile.studySets[currentSetIndex];
                    const cardMastery = currentSet.mastery[cardId] || { mastery: 0, attempts: 0, consecutiveCorrect: 0 };
                    
                    const newConsecutive = isCorrect ? (cardMastery.consecutiveCorrect || 0) + 1 : 0;
                    // Simple mastery calculation: if threshold reached, 100%, else proportional
                    const threshold = settings.masteryThreshold || 3;
                    const newMasteryPct = Math.min(100, Math.round((newConsecutive / threshold) * 100));

                    currentSet.mastery[cardId] = {
                        ...cardMastery,
                        consecutiveCorrect: newConsecutive,
                        mastery: newMasteryPct,
                        lastReviewed: new Date().toISOString(),
                        attempts: (cardMastery.attempts || 0) + 1
                    };
                    
                    currentProfile.studySets[currentSetIndex] = currentSet;
                    localStorage.setItem('studymate_user_profile_v3', JSON.stringify(currentProfile));
                }
            }
        } catch (e) {
            console.error("Auto-save failed", e);
        }
    };

    const handleAnswer = (option: string) => {
        if (isAnswered) return;
        
        const currentQ = queue[0];
        const isCorrect = option === currentQ.correctAnswer;
        
        setSelectedAnswer(option);
        setIsAnswered(true);
        setFeedback(isCorrect ? 'correct' : 'incorrect');
        
        if (isCorrect) {
            if (settings.animations) setShowConfetti(true);
            
            const currentStreak = (consecutiveCorrectMap[currentQ.originalCardId] || 0) + 1;
            setConsecutiveCorrectMap(prev => ({ ...prev, [currentQ.originalCardId]: currentStreak }));
            
            saveProgress(currentQ.originalCardId, true);
        } else {
            if (settings.animations) setShake(true);
            
            setConsecutiveCorrectMap(prev => ({ ...prev, [currentQ.originalCardId]: 0 }));
            saveProgress(currentQ.originalCardId, false);
        }
        
        // Auto-advance logic could go here, but prompt says "Immediate feedback... reveal options"
        // We wait for user to click Next or auto-advance if configured?
        // Let's enforce manual "Next" for clarity unless correct? 
        // For Memorise All flow, let's keep it snappy.
    };
    
    const handleNext = () => {
        const currentQ = queue[0];
        const isCorrect = selectedAnswer === currentQ.correctAnswer;
        const currentStreak = consecutiveCorrectMap[currentQ.originalCardId] || 0;
        const threshold = settings.masteryThreshold || 3;
        
        let newQueue = [...queue];
        newQueue.shift(); // Remove current
        
        // Adaptive Logic
        if (isCorrect) {
            if (currentStreak < threshold) {
                // Not mastered yet, put back in queue (spaced out)
                // Insert at end or middle
                newQueue.push({
                    ...currentQ,
                    id: `retry-${currentQ.id}-${Date.now()}` // New ID to force re-render
                });
            }
            // Else mastered, stays removed
        } else {
            // Incorrect: Reset streak (already done in handleAnswer)
            // Re-queue sooner (e.g., position 2 or 3)
            const insertIdx = Math.min(newQueue.length, 2);
            newQueue.splice(insertIdx, 0, {
                 ...currentQ,
                 id: `retry-wrong-${currentQ.id}-${Date.now()}`
            });
        }
        
        setQueue(newQueue);
        
        if (newQueue.length === 0) {
            setIsFinished(true);
        } else {
            // Reset State
            setSelectedAnswer(null);
            setIsAnswered(false);
            setFeedback(null);
            setShake(false);
            setShowConfetti(false);
            setHintRevealed(false);
        }
    };
    
    const handleExit = () => {
        // Trigger save if needed (auto-save handles per question, so just notify)
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in-up';
        toast.innerText = text.progress_saved;
        document.body.appendChild(toast);
        setTimeout(() => {
            document.body.removeChild(toast);
            onSessionEnd();
        }, 2000);
    };

    if (isLoading) {
        return (
             <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-gray-500 animate-pulse">{text.generating_test}</p>
            </div>
        );
    }

    if (isFinished) {
         return (
            <div className="max-w-xl mx-auto px-4 py-12 text-center animate-fade-in">
                <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                    🏆
                </div>
                <h2 className="text-3xl font-bold font-display mb-4">{text.all_mastered}</h2>
                <div className="p-6 bg-white dark:bg-dark-surface rounded-xl shadow mb-8">
                     <p className="text-gray-600 dark:text-gray-400">You have met the mastery requirement for all cards in this set.</p>
                </div>
                <button onClick={onSessionEnd} className="px-8 py-3 bg-primary text-white rounded-lg font-bold shadow hover:bg-primary-600 transition-colors">
                    {text.finish_session}
                </button>
            </div>
        );
    }
    
    if (queue.length === 0) return null;

    const currentQ = queue[0];
    const currentStreak = consecutiveCorrectMap[currentQ.originalCardId] || 0;
    const threshold = settings.masteryThreshold || 3;

    return (
        <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col h-full">
            {/* Top Bar */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                     <span className="text-sm font-bold text-gray-500">{text.questions_remaining}: {queue.length}</span>
                </div>
                 <button onClick={handleExit} className="text-sm font-semibold text-gray-500 hover:text-primary">
                    {text.exit_save}
                </button>
            </div>
            
            {/* Progress Bar for Current Card Mastery */}
            <div className="mb-6 bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-yellow-400 transition-all duration-300" 
                    style={{ width: `${Math.min(100, (currentStreak / threshold) * 100)}%` }}
                />
            </div>

            {/* Question Card */}
            <div className={`bg-white dark:bg-dark-surface p-8 rounded-2xl shadow-lg border-2 border-transparent transition-all duration-300 ${shake ? 'animate-shake border-red-200' : ''} ${showConfetti ? 'border-green-200' : ''}`}>
                <h2 className="text-3xl font-bold text-center font-display mb-8 text-gray-800 dark:text-gray-100">
                    {currentQ.questionText}
                </h2>
                
                {/* Options Grid */}
                <div className="grid grid-cols-1 gap-3">
                    {currentQ.options.map((option, idx) => {
                        let btnClass = "p-4 rounded-xl border-2 text-left font-medium transition-all duration-200 ";
                        
                        if (isAnswered) {
                            if (option === currentQ.correctAnswer) {
                                btnClass += "bg-green-100 border-green-500 text-green-800 dark:bg-green-900/40 dark:text-green-300 dark:border-green-500";
                            } else if (option === selectedAnswer) {
                                btnClass += "bg-red-100 border-red-500 text-red-800 dark:bg-red-900/40 dark:text-red-300 dark:border-red-500";
                            } else {
                                btnClass += "opacity-50 border-gray-200 dark:border-gray-700";
                            }
                        } else {
                             btnClass += "bg-gray-50 dark:bg-dark-background border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary-50 dark:hover:border-primary dark:hover:bg-primary-900/20";
                        }
                        
                        return (
                            <button 
                                key={idx}
                                onClick={() => handleAnswer(option)}
                                disabled={isAnswered}
                                className={btnClass}
                            >
                                <span className="mr-3 inline-block w-6 h-6 rounded-full bg-white dark:bg-black/20 text-xs flex items-center justify-center border border-current opacity-50 font-bold">
                                    {String.fromCharCode(65 + idx)}
                                </span>
                                {option}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Feedback & Actions */}
            <div className="mt-6 min-h-[80px]">
                {isAnswered ? (
                    <div className={`p-4 rounded-xl flex justify-between items-center animate-fade-in ${feedback === 'correct' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'}`}>
                        <div className="font-bold flex items-center gap-2">
                             {feedback === 'correct' ? (
                                 <>{text.correct_msg} <span className="text-xl">✨</span></>
                             ) : (
                                 <>{text.incorrect_msg} <span className="text-xl">❌</span></>
                             )}
                        </div>
                        <button onClick={handleNext} className="px-6 py-2 bg-white dark:bg-dark-surface shadow-sm rounded-lg font-bold text-sm text-gray-800 dark:text-white hover:scale-105 transition-transform">
                            {text.next_question} &rarr;
                        </button>
                    </div>
                ) : (
                   <div className="flex justify-center">
                        {!hintRevealed && (
                            <button 
                                onClick={() => setHintRevealed(true)}
                                className="text-sm text-gray-400 hover:text-primary underline"
                            >
                                Need a hint?
                            </button>
                        )}
                        {hintRevealed && (
                            <div className="text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded">
                                {text.hint_label}: {currentQ.hint}
                            </div>
                        )}
                   </div>
                )}
            </div>
            
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
                    20%, 40%, 60%, 80% { transform: translateX(4px); }
                }
                .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
                .animate-fade-in { animation: fadeIn 0.3s ease-in; }
                .animate-fade-in-up { animation: fadeInUp 0.5s ease-out; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fadeInUp { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }
            `}</style>
        </div>
    );
};
