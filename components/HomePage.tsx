
import React from 'react';
import { Language, UserProfile, AppPage } from '../types';
import { UI_TEXT } from '../constants';
import { QuizIcon } from './icons/QuizIcon';
import { BotIcon } from './icons/BotIcon';
import { TrophyIcon } from './icons/TrophyIcon';
import { MicIcon } from './icons/MicIcon';


interface HomePageProps {
  language: Language;
  userProfile: UserProfile;
  setPage: (page: AppPage) => void;
}

const Card: React.FC<{title: string, subtitle: string, icon: React.ElementType, onClick: () => void, accentColor?: string}> = ({ title, subtitle, icon: Icon, onClick, accentColor = 'bg-secondary dark:bg-primary/20' }) => (
    <div
        onClick={onClick}
        className="bg-white dark:bg-dark-surface rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.03] transition-all cursor-pointer p-6 border border-primary-100 dark:border-dark-primary/20 flex items-center space-x-5"
    >
        <div className="flex-shrink-0">
            <div className={`w-14 h-14 ${accentColor} rounded-lg flex items-center justify-center`}>
                <Icon className="w-7 h-7 text-primary dark:text-dark-primary"/>
            </div>
        </div>
        <div className="flex-1">
            <h3 className="text-xl font-bold font-display text-gray-800 dark:text-white">{title}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{subtitle}</p>
        </div>
    </div>
);


export const HomePage: React.FC<HomePageProps> = ({ language, userProfile, setPage }) => {
  const text = UI_TEXT[language];
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-10">
        <h1 className="text-4xl font-bold font-display text-gray-800 dark:text-white">
          {text.home_greeting}, {userProfile.name}!
        </h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card 
            title={text.home_sets_card_title}
            subtitle={text.home_sets_card_subtitle}
            icon={QuizIcon}
            onClick={() => setPage('sets')}
        />
        <Card 
            title={text.home_voice_card_title}
            subtitle={text.home_voice_card_subtitle}
            icon={MicIcon}
            onClick={() => setPage('voice')}
            accentColor="bg-red-100 dark:bg-red-900/30 text-red-600"
        />
        <Card 
            title={text.home_generator_card_title}
            subtitle={text.home_generator_card_subtitle}
            icon={BotIcon}
            onClick={() => setPage('generator')}
        />
        <Card 
            title={text.home_stats_card_title}
            subtitle={text.home_stats_card_subtitle}
            icon={TrophyIcon}
            onClick={() => setPage('profile')}
        />
      </div>
    </div>
  );
};
