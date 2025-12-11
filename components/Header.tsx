
import React from 'react';
import { Language, AppTheme, AppPage } from '../types';
import { UI_TEXT } from '../constants';
import { NorwayFlagIcon } from './icons/NorwayFlagIcon';
import { UKFlagIcon } from './icons/UKFlagIcon';
import { UserIcon } from './icons/UserIcon';

interface HeaderProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  page: AppPage;
  setPage: (page: AppPage) => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ language, setLanguage, page, setPage, onOpenSettings }) => {
  const toggleLanguage = () => {
    setLanguage(language === Language.EN ? Language.NO : Language.EN);
  };

  const text = UI_TEXT[language];

  return (
    <header className="bg-background/80 backdrop-blur-lg p-4 border-b border-gray-200 dark:border-gray-700 fixed top-0 left-0 right-0 z-20 transition-colors duration-300">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xl font-display shadow-lg shadow-primary/30">
            <span>S</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold font-display text-gray-800 dark:text-white">
            {text.title}
          </h1>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={toggleLanguage}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle language"
          >
            {language === Language.EN ? (
              <NorwayFlagIcon className="w-6 h-6 rounded-sm" />
            ) : (
              <UKFlagIcon className="w-6 h-6 rounded-sm" />
            )}
          </button>
          
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
            aria-label="Settings"
          >
             <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="24" height="24" viewBox="0 0 24 24" 
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="group-hover:rotate-90 transition-transform duration-300"
            >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>

           <button
            onClick={() => setPage('profile')}
            className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="View profile"
          >
             <UserIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
