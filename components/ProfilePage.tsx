
import React from 'react';
import { Language, UserProfile } from '../types';
import { UI_TEXT } from '../constants';
import { TrophyIcon } from './icons/TrophyIcon';

interface ProfilePageProps {
  language: Language;
  userProfile: UserProfile;
  updateUserProfile: (updater: (prev: UserProfile) => UserProfile) => void;
  onLogout: () => void;
}

const StatCard: React.FC<{label: string, value: string | number}> = ({label, value}) => (
    <div className="bg-secondary/20 p-4 rounded-lg text-center border border-secondary/30">
        <p className="text-2xl font-bold font-display text-primary">{value}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
    </div>
);

export const ProfilePage: React.FC<ProfilePageProps> = ({ language, userProfile, onLogout }) => {
  const text = UI_TEXT[language];

  const totalLearnedTerms = userProfile.studySets.reduce((total, set) => {
    const learnedInSet = Object.values(set.mastery).filter(m => m.mastery === 100).length;
    return total + learnedInSet;
  }, 0);
  
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
            <div className="w-24 h-24 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl text-primary font-display border-2 border-primary/20">
                {userProfile.name.charAt(0)}
            </div>
            <h2 className="text-3xl font-bold font-display text-gray-800 dark:text-white">{userProfile.name}</h2>
            <p className="text-gray-500 dark:text-gray-400">{userProfile.grade} &bull; {userProfile.age} {text.years_old}</p>
        </div>

        <div className="p-6 bg-white dark:bg-dark-surface rounded-xl shadow-sm mb-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold font-display mb-4 text-gray-800 dark:text-white">{text.stats_title}</h3>
            <div className="grid grid-cols-3 gap-4">
               <StatCard label={text.study_streak} value={`${userProfile.stats.studyStreak} ${text.days}`} />
               <StatCard label={text.sets_created} value={userProfile.stats.setsCreated} />
               <StatCard label={text.terms_learned} value={totalLearnedTerms} />
            </div>
        </div>
        
         <div className="p-6 bg-white dark:bg-dark-surface rounded-xl shadow-sm mb-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold font-display mb-4 text-gray-800 dark:text-white">{text.achievements_title}</h3>
            <div className="flex flex-wrap gap-4">
                {userProfile.achievements.map(ach => (
                    <div key={ach} className="flex items-center space-x-2 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 px-3 py-1 rounded-full text-sm font-semibold border border-yellow-200 dark:border-yellow-800">
                        <TrophyIcon className="w-4 h-4" />
                        <span>{ach}</span>
                    </div>
                ))}
            </div>
        </div>
        
        <button onClick={onLogout} className="w-full py-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg font-semibold transition-colors border border-red-200 dark:border-red-900/50">
            {text.log_out}
        </button>
    </div>
  );
};
