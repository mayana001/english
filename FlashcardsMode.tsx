
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Language, StudySet, Card, UserProfile } from '../types';
import { UI_TEXT } from '../constants';
import { SpeakerIcon } from './icons/SpeakerIcon';

export const FlashcardsMode: React.FC<{
  language: Language;
  studySet: StudySet;
  userProfile: UserProfile;
  onSessionEnd: () => void;
  onUpdateMastery: (cardId: string, newMastery: number) => void;
}> = ({ language, studySet, userProfile, onSessionEnd, onUpdateMastery }) => {
  const text = UI_TEXT[language];
  const settings = userProfile.settings;

  // Session State
  const [sessionState, setSessionState] = useState<'setup' | 'active' | 'finished'>('setup');
  const [mode, setMode] = useState<'standard' | 'memorise_all'>(settings.defaultMode);
  
  // Active State
  const [queue, setQueue] = useState<Card[]>([]);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0); // For Standard Mode
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionMasteredCount, setSessionMasteredCount] = useState(0); // For Memorise All

  // Shuffle Cards based on settings
  const initialCards = useMemo(() => {
    const cards = [...studySet.cards];
    if (settings.preferences.shuffle) {
        return cards.sort(() => Math.random() - 0.5);
    }
    return cards;
  }, [studySet.cards, settings.preferences.shuffle]);

  const startSession = () => {
    setQueue([...initialCards]);
    setCurrentIndex(0);
    setSessionMasteredCount(0);
    setMasteredIds(new Set());
    setIsFlipped(false);
    setSessionState('active');
  };

  const currentCard = mode === 'standard' ? queue[currentIndex] : queue[0];
  const totalCards = initialCards.length;

  const handleNextCardStandard = () => {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false); // Ensure new card starts front-side
    } else {
      setSessionState('finished');
    }
  };

  const handleNextCardMemorise = (rating: 'know' | 'dont_know') => {
      // Current card is queue[0]
      const card = queue[0];
      let newQueue = [...queue];

      if (rating === 'know') {
          // Remove from queue
          newQueue.shift();
          setSessionMasteredCount(prev => prev + 1);
          setMasteredIds(prev => new Set(prev).add(card.id));
      } else {
          // Move to back (or insert at index 3 for spaced feel)
          newQueue.shift();
          const insertIndex = Math.min(newQueue.length, 3);
          newQueue.splice(insertIndex, 0, card);
      }
      
      setQueue(newQueue);
      setIsFlipped(false); // Ensure new card starts front-side
      
      if (newQueue.length === 0) {
          setSessionState('finished');
      }
  };

  const handleRating = useCallback((rating: 'know' | 'dont_know') => {
    if (!currentCard) return;

    // Update Mastery Persistence
    const currentMastery = studySet.mastery[currentCard.id]?.mastery || 0;
    let newMastery = currentMastery;

    if (rating === 'dont_know') {
        newMastery = Math.max(0, currentMastery - 20); // Decrease slightly on fail
    } else {
        newMastery = Math.min(100, currentMastery + 20); // Increase on success
    }
    
    onUpdateMastery(currentCard.id, newMastery);

    if (mode === 'standard') {
        handleNextCardStandard();
    } else {
        handleNextCardMemorise(rating);
    }
  }, [currentCard, studySet.mastery, onUpdateMastery, mode, currentIndex, queue]); // Added dependencies

  const speak = (textToSpeak: string, langCode?: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); 
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      const localeMap: {[key: string]: string} = {
          'en': 'en-US',
          'no': 'no-NO',
          'es': 'es-ES',
          'fr': 'fr-FR',
          'de': 'de-DE',
          'ru': 'ru-RU',
          'zh': 'zh-CN',
          'ja': 'ja-JP',
          'ko': 'ko-KR',
          'it': 'it-IT',
      };
      
      let voiceLang = language === 'en' ? 'en-US' : 'no-NO';
      if (langCode && localeMap[langCode]) {
          voiceLang = localeMap[langCode];
      }
      
      utterance.lang = voiceLang;
      window.speechSynthesis.speak(utterance);
    }
  };
  
  // Audio Autoplay Logic
  useEffect(() => {
      if (sessionState === 'active' && currentCard && settings.preferences.audioAutoplay) {
          // Speak term when card appears (front side)
          if (!isFlipped) {
              speak(currentCard.term, currentCard.termLang);
          } 
          // Speak definition when flipped (back side)
          else {
              speak(currentCard.definition, currentCard.definitionLang);
          }
      }
  }, [currentCard, isFlipped, sessionState, settings.preferences.audioAutoplay]);
  
  const handleFlip = useCallback(() => {
     setIsFlipped(prev => !prev);
  }, []);

  // Keyboard Controls
  useEffect(() => {
    if (sessionState !== 'active') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && settings.flashcardControls.spaceToFlip) {
        event.preventDefault();
        handleFlip();
      }
      
      if (settings.flashcardControls.arrowKeysResponse) {
          if (event.code === 'ArrowRight') {
             handleRating('know');
          }
          if (event.code === 'ArrowLeft') {
             handleRating('dont_know');
          }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleFlip, sessionState, settings.flashcardControls, handleRating]);


  if (initialCards.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-500 mb-4">This set has no cards to study.</p>
        <button onClick={onSessionEnd} className="px-5 py-2 bg-primary text-white rounded-lg font-bold">{text.back}</button>
      </div>
    );
  }

  // --- Render Setup Screen ---
  if (sessionState === 'setup') {
      return (
          <div className="max-w-xl mx-auto px-4 py-12 text-center animate-fade-in">
              <h2 className="text-3xl font-bold font-display mb-8">{text.session_setup}</h2>
              
              <div className="bg-white dark:bg-dark-surface p-6 rounded-xl shadow-lg border dark:border-dark-primary/20 mb-8">
                  <h3 className="text-lg font-semibold mb-4 text-gray-500 dark:text-gray-400 uppercase tracking-wide">{text.select_mode}</h3>
                  <div className="flex flex-col gap-4">
                      <button 
                        onClick={() => setMode('standard')}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${mode === 'standard' ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-1 ring-primary' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}`}
                      >
                          <div className="font-bold text-lg mb-1">{text.mode_standard}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{text.mode_standard_desc}</div>
                      </button>
                      <button 
                        onClick={() => setMode('memorise_all')}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${mode === 'memorise_all' ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-1 ring-primary' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}`}
                      >
                          <div className="font-bold text-lg mb-1">{text.mode_memorise_all}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{text.mode_memorise_all_desc}</div>
                      </button>
                  </div>
              </div>

              <div className="flex gap-4 justify-center">
                  <button onClick={onSessionEnd} className="px-6 py-3 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-dark-surface rounded-lg transition-colors">
                      {text.back}
                  </button>
                  <button onClick={startSession} className="px-10 py-3 bg-primary text-white rounded-lg font-bold shadow-lg hover:bg-primary-600 hover:scale-105 transition-all">
                      {text.start_session}
                  </button>
              </div>
          </div>
      );
  }

  // --- Render Finished Screen ---
  if (sessionState === 'finished') {
      return (
        <div className="max-w-2xl mx-auto px-4 py-12 text-center animate-fade-in">
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                🎉
            </div>
            <h2 className="text-3xl font-bold font-display mb-4">{text.all_mastered}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">{text.mode_memorise_all_desc}</p> {/* Reusing desc for context */}
            
            <div className="flex gap-4 justify-center">
                <button onClick={startSession} className="px-6 py-3 bg-secondary text-primary dark:bg-primary/20 dark:text-dark-primary rounded-lg font-bold">
                    {text.continue_review}
                </button>
                <button onClick={onSessionEnd} className="px-6 py-3 bg-primary text-white rounded-lg font-bold">
                    {text.back_to_dashboard}
                </button>
            </div>
        </div>
      );
  }

  // --- Render Active Session ---
  if (!currentCard) return null; // Should handle queue empty logic inside finished state, but safe guard.

  // Button config
  const dontKnowBtn = (
       <button onClick={() => handleRating('dont_know')} className="flex-1 py-4 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 rounded-xl font-bold hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors shadow-sm">
         {text.rate_dont_know}
         <span className="block text-xs font-normal opacity-70 mt-1">({settings.flashcardControls.arrowKeysResponse ? '←' : ''})</span>
       </button>
  );
  const knowBtn = (
       <button onClick={() => handleRating('know')} className="flex-1 py-4 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 rounded-xl font-bold hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors shadow-sm">
         {text.rate_know}
         <span className="block text-xs font-normal opacity-70 mt-1">({settings.flashcardControls.arrowKeysResponse ? '→' : ''})</span>
       </button>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col items-center h-full">
      {/* Header Stats */}
      <div className="w-full flex justify-between items-center mb-6 text-sm font-medium text-gray-500 dark:text-gray-400">
        <button onClick={onSessionEnd} className="hover:text-primary transition-colors">&larr; {text.finish_session}</button>
        {mode === 'standard' ? (
            <span>{currentIndex + 1} / {totalCards}</span>
        ) : (
            <div className="text-right">
                <span className="text-green-600 dark:text-green-400 font-bold">{sessionMasteredCount} {text.progress_mastered}</span>
                <span className="mx-2">•</span>
                <span>{queue.length} {text.left_to_learn}</span>
            </div>
        )}
      </div>
      
      {/* Progress Bar for Memorise Mode */}
      {mode === 'memorise_all' && (
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-6 overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-500 ease-out"
                style={{ width: `${(sessionMasteredCount / totalCards) * 100}%` }}
              />
          </div>
      )}

      {/* Card Area */}
      <div 
        className="w-full h-80 md:h-96 [perspective:1000px] cursor-pointer group" 
        onClick={() => { if(settings.flashcardControls.tapToFlip) handleFlip(); }}
      >
        <div className={`relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
          
          {/* Front */}
          <div className="absolute w-full h-full [backface-visibility:hidden] bg-white dark:bg-dark-surface rounded-2xl shadow-xl border dark:border-dark-primary/20 flex flex-col justify-center items-center p-8 text-center">
            {currentCard.imageUrl && (
              <img src={currentCard.imageUrl} alt={currentCard.term} className="max-h-40 max-w-full object-contain rounded-md mb-4" />
            )}
            <p className="text-2xl md:text-3xl font-bold font-display">{currentCard.term}</p>
            {currentCard.termLang && currentCard.termLang !== 'en' && (
                 <span className="mt-2 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded uppercase tracking-wider font-bold">{currentCard.termLang}</span>
            )}

            <button onClick={(e) => { e.stopPropagation(); speak(currentCard.term, currentCard.termLang); }} className="absolute bottom-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-background transition-colors text-gray-400 hover:text-primary">
              <SpeakerIcon className="w-6 h-6"/>
            </button>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-gray-300 text-xs uppercase tracking-widest pointer-events-none">
                {settings.flashcardControls.tapToFlip ? text.tap_to_flip : ''}
            </div>
          </div>
          
          {/* Back */}
          <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-white dark:bg-dark-surface rounded-2xl shadow-xl border dark:border-dark-primary/20 flex flex-col justify-center items-center p-8 text-center">
            <p className="text-xl md:text-2xl font-medium">{currentCard.definition}</p>
             {currentCard.definitionLang && currentCard.definitionLang !== 'en' && (
                 <span className="mt-2 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded uppercase tracking-wider font-bold">{currentCard.definitionLang}</span>
            )}
            <button onClick={(e) => { e.stopPropagation(); speak(currentCard.definition, currentCard.definitionLang); }} className="absolute bottom-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-background transition-colors text-gray-400 hover:text-primary">
              <SpeakerIcon className="w-6 h-6"/>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 w-full flex gap-4">
        {settings.flashcardControls.swapButtons ? (
            <>
                {knowBtn}
                {dontKnowBtn}
            </>
        ) : (
            <>
                {dontKnowBtn}
                {knowBtn}
            </>
        )}
      </div>
      
      <div className="mt-4 text-xs text-gray-400 text-center">
          {settings.flashcardControls.spaceToFlip && <span>{text.space_to_flip} • </span>}
          {settings.flashcardControls.arrowKeysResponse && <span>{text.arrow_keys}</span>}
      </div>
    </div>
  );
};
