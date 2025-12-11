
import React from 'react';
import { Language, StudySet, StudyMode } from '../types';
import { UI_TEXT, STUDY_MODE_DETAILS } from '../constants';

interface StudyDashboardProps {
  language: Language;
  studySet: StudySet;
  onStartSession: (mode: StudyMode) => void;
  onBack: () => void;
  onEdit: () => void;
}

const ModeCard: React.FC<{title: string, description: string, onClick: () => void}> = ({ title, description, onClick }) => (
    <div onClick={onClick} className="p-6 bg-white dark:bg-dark-surface rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border dark:border-dark-primary/20">
        <h3 className="text-xl font-bold font-display text-primary dark:text-dark-primary">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{description}</p>
    </div>
);


export const StudyDashboard: React.FC<StudyDashboardProps> = ({ language, studySet, onStartSession, onBack, onEdit }) => {
  const text = UI_TEXT[language];

  // Define the order of modes to display
  const modes = [StudyMode.MEMORISE, StudyMode.FLASHCARDS, StudyMode.TEST];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex justify-between items-start">
        <div>
            <button onClick={onBack} className="mb-2 text-sm text-primary-600 dark:text-dark-primary font-semibold hover:underline">&larr; {text.back}</button>
            <h2 className="text-3xl font-bold font-display">{studySet.title}</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{studySet.description}</p>
        </div>
        <button onClick={onEdit} className="px-4 py-2 text-sm bg-gray-200 dark:bg-dark-surface rounded-md font-semibold">{text.edit}</button>
      </div>

      <div className="mt-10">
        <h3 className="text-2xl font-semibold font-display mb-4">{text.choose_your_mode}</h3>
        <div className="grid grid-cols-1 gap-4">
            {modes.map(mode => (
                <ModeCard 
                    key={mode}
                    title={text[STUDY_MODE_DETAILS[mode].titleKey]}
                    description={text[STUDY_MODE_DETAILS[mode].descKey]}
                    onClick={() => onStartSession(mode)}
                />
            ))}
        </div>
      </div>
    </div>
  );
};
