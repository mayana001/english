
import React from 'react';
import { Language, AppPage } from '../types';
import { UI_TEXT } from '../constants';
import { HomeIcon } from './icons/HomeIcon';
import { QuizIcon } from './icons/QuizIcon';
import { UserIcon } from './icons/UserIcon';
import { BotIcon } from './icons/BotIcon';
import { MicIcon } from './icons/MicIcon';

interface NavBarProps {
  language: Language;
  activePage: AppPage;
  setPage: (page: AppPage) => void;
}

const navItems = [
  { id: 'home', icon: HomeIcon, labelKey: 'nav_home' },
  { id: 'sets', icon: QuizIcon, labelKey: 'nav_sets' },
  { id: 'voice', icon: MicIcon, labelKey: 'nav_voice' },
  { id: 'generator', icon: BotIcon, labelKey: 'nav_generator' },
  { id: 'profile', icon: UserIcon, labelKey: 'nav_profile' },
] as const;

export const NavBar: React.FC<NavBarProps> = ({ language, activePage, setPage }) => {
  const text = UI_TEXT[language];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/80 dark:bg-dark-surface/80 backdrop-blur-lg border-t border-primary-200 dark:border-dark-primary/20 z-20">
      <div className="max-w-5xl mx-auto flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id as AppPage)}
              className={`flex flex-col items-center justify-center w-full transition-colors duration-200 ${
                isActive
                  ? 'text-primary-600 dark:text-dark-primary'
                  : 'text-gray-500 dark:text-gray-400 hover:text-primary-500 dark:hover:text-dark-primary'
              }`}
            >
              <item.icon className="w-6 h-6 mb-1" />
              <span className="text-xs font-semibold">{text[item.labelKey]}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
