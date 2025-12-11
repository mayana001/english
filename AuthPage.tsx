
import React, { useState } from 'react';
import { Language, UserProfile, AppTheme } from '../types';
import { UI_TEXT } from '../constants';
import { MoonIcon } from './icons/MoonIcon';
import { SunIcon } from './icons/SunIcon';

interface AuthPageProps {
  language: Language;
  onLogin: (profile: UserProfile) => void;
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ language, onLogin, theme, setTheme }) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [grade, setGrade] = useState('');
  const [goal, setGoal] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && age.trim() && grade.trim() && goal.trim()) {
      onLogin({
        name: name.trim(),
        age: parseInt(age, 10),
        grade: grade.trim(),
        goal: goal.trim(),
        studySets: [],
        voiceNotes: [],
        stats: {
          studyStreak: 0,
          lastStudiedDate: null,
          setsCreated: 0,
          termsLearned: 0,
        },
        achievements: ['Welcome Aboard!'],
        settings: {
            appearance: {
                theme: AppTheme.Blue,
                fontSize: 'medium',
                reduceAnimations: false
            },
            flashcardControls: {
                tapToFlip: true,
                spaceToFlip: true,
                arrowKeysResponse: true,
                swapButtons: false
            },
            testMode: {
                behavior: 'memorise_all',
                numberOfChoices: 4,
                masteryThreshold: 3,
                animations: true,
                audioEnabled: false,
                autoSave: true,
                hintPenalty: true,
                shuffleChoices: true,
                languageDetectionConfidence: 0.7
            },
            memoriseMode: {
                wordsPerLevel: 7,
                requireCorrectTwice: false,
                showProgressBar: true,
                showLevelSummary: true,
                mixQuestionTypes: true,
                inputQuestionRatio: 0.3,
                enableRetryLevel1: true,
            },
            preferences: {
                shuffle: true,
                audioAutoplay: false,
                typingMode: false,
                notifications: false,
                cardStyle: 'simple'
            },
            defaultMode: 'standard'
        }
      });
    }
  };
  
  const toggleTheme = () => {
    setTheme(theme === AppTheme.Dark ? AppTheme.Blue : AppTheme.Dark);
  };

  const text = UI_TEXT[language];

  const inputClasses = "mt-1 block w-full px-3 py-2 bg-primary-50 dark:bg-primary-900 border border-primary-200 dark:border-primary-700 rounded-md shadow-sm placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-500";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background dark:bg-dark-background p-4 relative">
        <div className="absolute top-4 right-4">
             <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-primary-100 dark:hover:bg-dark-surface transition-colors"
                aria-label="Toggle theme"
              >
                {theme !== AppTheme.Dark ? (
                  <MoonIcon className="w-5 h-5" />
                ) : (
                  <SunIcon className="w-5 h-5" />
                )}
              </button>
        </div>
      <div className="max-w-md w-full bg-white dark:bg-dark-surface rounded-2xl shadow-xl p-8 border border-primary-100 dark:border-dark-primary/20">
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white font-bold text-4xl font-display mx-auto mb-4">
                <span>S</span>
            </div>
          <h1 className="text-3xl font-bold font-display text-gray-800 dark:text-white">{text.welcome_title}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">{text.welcome_subtitle}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{text.name_label}</label>
            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={text.name_placeholder} required className={inputClasses}/>
          </div>
          <div>
            <label htmlFor="age" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{text.age_label}</label>
            <input type="number" id="age" value={age} onChange={(e) => setAge(e.target.value)} placeholder={text.age_placeholder} required className={inputClasses}/>
          </div>
          <div>
            <label htmlFor="grade" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{text.grade_label}</label>
            <input type="text" id="grade" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder={text.grade_placeholder} required className={inputClasses}/>
          </div>
          <div>
            <label htmlFor="goal" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{text.goal_label}</label>
            <input type="text" id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder={text.goal_placeholder} required className={inputClasses}/>
          </div>
          <div>
            <button type="submit" className="w-full flex justify-center py-3 px-4 mt-2 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background dark:focus:ring-offset-dark-background focus:ring-primary transition-colors">
              {text.create_profile_btn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
