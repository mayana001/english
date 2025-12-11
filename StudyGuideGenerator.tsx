import React, { useState } from 'react';
import { Language, UserProfile, StudyGuide, Card, StudySet, AppPage } from '../types';
import { UI_TEXT } from '../constants';
import { generateStudyGuide } from '../services/geminiService';
import { BotIcon } from './icons/BotIcon';

interface StudyGuideGeneratorProps {
  language: Language;
  updateUserProfile: (updater: (prev: UserProfile) => UserProfile) => void;
  setPage: (page: AppPage) => void;
}

export const StudyGuideGenerator: React.FC<StudyGuideGeneratorProps> = ({ language, updateUserProfile, setPage }) => {
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [studyGuide, setStudyGuide] = useState<StudyGuide | null>(null);
  const [error, setError] = useState<string | null>(null);

  const text = UI_TEXT[language];

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsLoading(true);
    setError(null);
    setStudyGuide(null);
    try {
      const result = await generateStudyGuide(topic, language);
      setStudyGuide(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveSet = () => {
      if (!studyGuide) return;
      const newSet: StudySet = {
          id: Date.now().toString(),
          title: studyGuide.title,
          description: `AI-generated guide for "${topic}"`,
          cards: studyGuide.flashcards.map((fc, index) => ({
              id: `ai-${Date.now()}-${index}`,
              term: fc.term,
              definition: fc.definition,
          })),
          mastery: {}
      };

      updateUserProfile(prev => ({
          ...prev,
          studySets: [...prev.studySets, newSet],
          stats: {
              ...prev.stats,
              setsCreated: prev.stats.setsCreated + 1,
          }
      }));
      
      alert('Set saved!');
      setPage('sets');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <BotIcon className="w-12 h-12 mx-auto text-primary dark:text-dark-primary mb-2" />
        <h2 className="text-3xl font-bold font-display">{text.generator_title}</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">{text.generator_instructions}</p>
      </div>

      <div className="flex gap-2 mb-8">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={text.topic_placeholder}
          disabled={isLoading}
          className="flex-grow p-3 bg-primary-50 dark:bg-primary-900 border border-primary-200 dark:border-primary-700 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-500"
        />
        <button onClick={handleGenerate} disabled={isLoading || !topic.trim()} className="px-6 py-3 bg-primary text-white rounded-lg font-bold disabled:bg-gray-400">
          {isLoading ? text.loading : text.generate_btn}
        </button>
      </div>
      
      {error && <p className="text-center text-red-500">{error}</p>}
      
      {studyGuide && (
          <div className="p-6 bg-white dark:bg-dark-surface rounded-lg shadow border dark:border-dark-primary/20 animate-fade-in">
              <h3 className="text-2xl font-bold font-display mb-4">{studyGuide.title}</h3>

              <div className="mb-6">
                <h4 className="text-xl font-semibold font-display mb-2">{text.key_concepts}</h4>
                <ul className="space-y-3">
                    {studyGuide.keyConcepts.map((concept, index) => (
                        <li key={index} className="p-3 bg-secondary/30 dark:bg-primary/10 rounded-md">
                            <strong className="block">{concept.concept}</strong>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{concept.explanation}</p>
                        </li>
                    ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xl font-semibold font-display mb-2">{text.generated_flashcards}</h4>
                 <div className="space-y-2 mb-6">
                     {studyGuide.flashcards.map((card, index) => (
                        <div key={index} className="p-3 border-l-4 border-primary dark:border-dark-primary bg-background dark:bg-dark-background rounded-r-md">
                            <strong>{card.term}:</strong> {card.definition}
                        </div>
                     ))}
                 </div>
                 <button onClick={handleSaveSet} className="w-full py-2 bg-green-600 text-white rounded-lg font-semibold">{text.save_generated_set}</button>
              </div>
          </div>
      )}
    </div>
  );
};