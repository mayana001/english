
import React, { useState } from 'react';
import { Language, UserProfile, StudySet, StudyMode } from '../types';
import { UI_TEXT } from '../constants';
import { SetCreator } from './SetCreator';
import { StudyDashboard } from './StudyDashboard';
import { FlashcardsMode } from './FlashcardsMode';
import { TestMode } from './TestMode';
import { MemoriseMode } from './MemoriseMode';

type View = 'list' | 'create' | 'edit' | 'dashboard' | 'study';

// Helper to check if two dates are consecutive days
const areDatesConsecutive = (date1Str: string, date2Str: string) => {
    const d1 = new Date(date1Str);
    const d2 = new Date(date2Str);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    return d2.getTime() - d1.getTime() === 24 * 60 * 60 * 1000;
};

// Helper to get today's date as a string YYYY-MM-DD
const getTodayDateString = () => new Date().toISOString().split('T')[0];

export const StudySetsPage: React.FC<{
  language: Language;
  userProfile: UserProfile;
  updateUserProfile: (updater: (prev: UserProfile) => UserProfile) => void;
}> = ({ language, userProfile, updateUserProfile }) => {
  const [view, setView] = useState<View>('list');
  const [activeSet, setActiveSet] = useState<StudySet | null>(null);
  const [activeStudyMode, setActiveStudyMode] = useState<StudyMode | null>(null);

  const text = UI_TEXT[language];

  const handleSaveSet = (set: StudySet) => {
    updateUserProfile(prev => {
      const isEditing = prev.studySets.some(s => s.id === set.id);
      const newSets = isEditing 
        ? prev.studySets.map(s => s.id === set.id ? set : s)
        : [...prev.studySets, set];
      
      return {
        ...prev,
        studySets: newSets,
        stats: {
            ...prev.stats,
            setsCreated: isEditing ? prev.stats.setsCreated : prev.stats.setsCreated + 1,
        }
      };
    });
    setView('list');
    setActiveSet(null);
  };

  const handleSelectSet = (set: StudySet) => {
    setActiveSet(set);
    setView('dashboard');
  };

  const handleStartSession = (mode: StudyMode) => {
    setActiveStudyMode(mode);
    setView('study');
  };
  
  const handleEditSet = (set: StudySet) => {
    setActiveSet(set);
    setView('edit');
  };
  
  const handleUpdateMastery = (cardId: string, newMastery: number) => {
    if (!activeSet) return;
    
    updateUserProfile(prev => {
      const newSets = prev.studySets.map(set => {
        if (set.id === activeSet.id) {
          return {
            ...set,
            mastery: {
              ...set.mastery,
              [cardId]: {
                consecutiveCorrect: 0,
                attempts: 0,
                ...(set.mastery[cardId] || {}),
                mastery: Math.min(100, Math.max(0, newMastery)), // Clamp between 0 and 100
                lastReviewed: new Date().toISOString(),
              }
            }
          };
        }
        return set;
      });
      return { ...prev, studySets: newSets };
    });
  };
  
  const handleSessionEnd = () => {
    updateUserProfile(prev => {
        const today = getTodayDateString();
        const lastStudied = prev.stats.lastStudiedDate;
        let newStreak = prev.stats.studyStreak;

        if (lastStudied !== today) {
            if (lastStudied && areDatesConsecutive(lastStudied, today)) {
                newStreak++;
            } else {
                newStreak = 1;
            }
        }
        
        return {
            ...prev,
            stats: {
                ...prev.stats,
                studyStreak: newStreak,
                lastStudiedDate: today,
            }
        };
    });
    setView('dashboard');
  };

  const renderContent = () => {
    switch(view) {
      case 'create':
        return <SetCreator language={language} onSave={handleSaveSet} onBack={() => setView('list')} />;
      case 'edit':
        return <SetCreator language={language} onSave={handleSaveSet} onBack={() => setView('dashboard')} existingSet={activeSet!} />;
      case 'dashboard':
        return <StudyDashboard language={language} studySet={activeSet!} onStartSession={handleStartSession} onBack={() => setView('list')} onEdit={() => handleEditSet(activeSet!)} />;
      case 'study':
        if (activeStudyMode === StudyMode.MEMORISE) {
            return <MemoriseMode language={language} studySet={activeSet!} onSessionEnd={handleSessionEnd} userProfile={userProfile} />;
        }
        if (activeStudyMode === StudyMode.FLASHCARDS) {
            return <FlashcardsMode language={language} studySet={activeSet!} userProfile={userProfile} onSessionEnd={handleSessionEnd} onUpdateMastery={handleUpdateMastery} />;
        }
        if (activeStudyMode === StudyMode.TEST) {
            return <TestMode language={language} studySet={activeSet!} onSessionEnd={() => setView('dashboard')} />;
        }
        // Placeholder for other modes
        return <div className="p-4"><p>Mode '{activeStudyMode}' coming soon!</p><button onClick={() => setView('dashboard')}>Back to Dashboard</button></div>;
      case 'list':
      default:
        return (
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold font-display">{text.my_study_sets}</h2>
              <button onClick={() => setView('create')} className="px-5 py-2 bg-primary text-white rounded-lg font-bold">{text.create_new_set}</button>
            </div>
            {userProfile.studySets.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 mb-4">{text.no_sets_yet}</p>
                <button onClick={() => setView('create')} className="px-6 py-3 bg-primary text-white rounded-lg font-bold">{text.create_first_set}</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userProfile.studySets.map(set => (
                  <div key={set.id} onClick={() => handleSelectSet(set)} className="p-6 bg-white dark:bg-dark-surface rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border dark:border-dark-primary/20">
                    <h3 className="font-bold font-display text-xl">{set.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{set.cards.length} cards</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
    }
  };
  
  return renderContent();
};
