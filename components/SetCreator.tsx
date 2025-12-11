
import React, { useState, useEffect, useRef } from 'react';
import { Language, StudySet, Card } from '../types';
import { UI_TEXT } from '../constants';
import { PlusIcon } from './icons/PlusIcon';
import { ImageIcon } from './icons/ImageIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ImportIcon } from './icons/ImportIcon';
import { ExportIcon } from './icons/ExportIcon';

interface SetCreatorProps {
  language: Language;
  onSave: (set: StudySet) => void;
  onBack: () => void;
  existingSet?: StudySet;
}

const emptyCard = (): Card => ({
  id: `new-${Date.now()}-${Math.random()}`,
  term: '',
  definition: '',
  termLang: 'en',
  definitionLang: 'en',
});

const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'no', label: 'Norwegian' },
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'ru', label: 'Russian' },
    { code: 'zh', label: 'Chinese' },
    { code: 'ja', label: 'Japanese' },
    { code: 'ko', label: 'Korean' },
    { code: 'it', label: 'Italian' },
    { code: 'pt', label: 'Portuguese' },
];

const detectLanguage = (text: string): string => {
    if (!text) return 'en';
    
    // Simple heuristics for client-side detection
    const cyrillicPattern = /[\u0400-\u04FF]/;
    if (cyrillicPattern.test(text)) return 'ru';
    
    const chinesePattern = /[\u4E00-\u9FFF]/;
    if (chinesePattern.test(text)) return 'zh';

    const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF]/;
    if (japanesePattern.test(text)) return 'ja';

    const koreanPattern = /[\uAC00-\uD7AF]/;
    if (koreanPattern.test(text)) return 'ko';
    
    const norwegianPattern = /[æøåÆØÅ]/;
    if (norwegianPattern.test(text)) return 'no';
    
    const spanishPattern = /[ñÑ¿¡]/;
    if (spanishPattern.test(text)) return 'es';
    
    const germanPattern = /[ßäöüÄÖÜ]/; 
    if (germanPattern.test(text)) return 'de';

    const frenchPattern = /[œŒçÇ]/; 
    if (frenchPattern.test(text)) return 'fr';
    
    const portuguesePattern = /[ãõÃÕ]/; 
    if (portuguesePattern.test(text)) return 'pt';
    
    return 'en'; // Default fallback
}

export const SetCreator: React.FC<SetCreatorProps> = ({ language, onSave, onBack, existingSet }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cards, setCards] = useState<Card[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  
  // Modal states
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    if (existingSet) {
      setTitle(existingSet.title);
      setDescription(existingSet.description);
      setCards(existingSet.cards);
    } else {
      setCards([emptyCard(), emptyCard()]);
    }
  }, [existingSet]);

  const text = UI_TEXT[language];

  const handleCardChange = (index: number, field: keyof Card, value: string) => {
    const newCards = [...cards];
    newCards[index] = { ...newCards[index], [field]: value };
    setCards(newCards);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && selectedCardIndex !== null) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert("File is too large. Please select an image under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const newCards = [...cards];
        newCards[selectedCardIndex] = { ...newCards[selectedCardIndex], imageUrl: reader.result as string };
        setCards(newCards);
      };
      reader.readAsDataURL(file);
      setSelectedCardIndex(null); 
      e.target.value = ''; // Reset file input
    }
  };

  const triggerImageUpload = (index: number) => {
    setSelectedCardIndex(index);
    fileInputRef.current?.click();
  };

  const removeImage = (index: number) => {
    const newCards = [...cards];
    const { imageUrl, ...rest } = newCards[index];
    newCards[index] = rest;
    setCards(newCards);
  };

  const addCard = () => {
    setCards([...cards, emptyCard()]);
  };

  const removeCard = (index: number) => {
    if (cards.length > 1) {
      const newCards = cards.filter((_, i) => i !== index);
      setCards(newCards);
    }
  };
  
  const handleImportCards = (importedCards: Card[]) => {
      const cleanedCurrent = cards.filter(c => c.term.trim() !== '' || c.definition.trim() !== '');
      setCards([...cleanedCurrent, ...importedCards]);
      setShowImport(false);
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('Please enter a title for your set.');
      return;
    }
    const finalCards = cards.filter(c => c.term.trim() && c.definition.trim());
    if (finalCards.length === 0) {
      alert('Please add at least one card with both a term and definition.');
      return;
    }

    const set: StudySet = {
      id: existingSet?.id || Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      cards: finalCards,
      mastery: existingSet?.mastery || {},
    };
    onSave(set);
  };
  
  const inputClasses = "w-full p-2 bg-primary-50 dark:bg-primary-900 border border-primary-200 dark:border-primary-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-500";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 relative">
      <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
      <button onClick={onBack} className="mb-4 text-sm text-primary-600 dark:text-dark-primary font-semibold hover:underline">&larr; {text.back}</button>
      <h2 className="text-3xl font-bold font-display mb-6">{existingSet ? text.edit_set_title : text.create_set_title}</h2>

      <div className="space-y-6">
        <div className="p-6 bg-white dark:bg-dark-surface rounded-lg shadow border dark:border-dark-primary/20">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{text.set_title_label}</label>
            <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={text.set_title_placeholder} required className={`mt-1 text-lg ${inputClasses}`} />
          </div>
          <div className="mt-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{text.set_description_label}</label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={text.set_description_placeholder} rows={2} className={`mt-1 ${inputClasses}`} />
          </div>
          
          <div className="flex gap-3 mt-4">
              <button 
                onClick={() => setShowImport(true)} 
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/50 rounded-md hover:bg-primary-100 dark:hover:bg-primary-900 transition-colors"
              >
                  <ImportIcon className="w-4 h-4" />
                  {text.import_text}
              </button>
              <button 
                onClick={() => setShowExport(true)} 
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/50 rounded-md hover:bg-primary-100 dark:hover:bg-primary-900 transition-colors"
              >
                  <ExportIcon className="w-4 h-4" />
                  {text.export_text}
              </button>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-dark-surface rounded-lg shadow border dark:border-dark-primary/20">
          <h3 className="text-xl font-semibold font-display mb-4">{text.cards_title}</h3>
          <div className="space-y-4">
            {cards.map((card, index) => (
              <div key={card.id} className="flex gap-4 items-start p-4 bg-background dark:bg-dark-background rounded-md border dark:border-dark-primary/10">
                <div className="flex-shrink-0">
                  {card.imageUrl ? (
                      <div className="relative group w-24 h-24">
                          <img src={card.imageUrl} alt={card.term} className="w-full h-full object-cover rounded-md" />
                          <button onClick={() => removeImage(index)} className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100" aria-label="Remove image">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                      </div>
                  ) : (
                      <button onClick={() => triggerImageUpload(index)} className="w-24 h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md flex flex-col items-center justify-center text-gray-500 hover:bg-primary-50 dark:hover:bg-primary-900/50 transition-colors" aria-label="Add image">
                          <ImageIcon className="w-8 h-8" />
                          <span className="text-xs mt-1">Add Image</span>
                      </button>
                  )}
                </div>

                <div className="flex-grow space-y-2">
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <div className="flex justify-between mb-1">
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{text.term_label}</label>
                                <select 
                                    value={card.termLang || 'en'} 
                                    onChange={(e) => handleCardChange(index, 'termLang', e.target.value)}
                                    className="text-[10px] uppercase font-bold bg-transparent border-none text-primary-600 dark:text-primary-400 cursor-pointer focus:ring-0 p-0"
                                >
                                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.code}</option>)}
                                </select>
                            </div>
                            <input
                              type="text"
                              placeholder={text.term_label}
                              value={card.term}
                              onChange={(e) => handleCardChange(index, 'term', e.target.value)}
                              className={inputClasses}
                            />
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <div className="flex-1">
                             <div className="flex justify-between mb-1">
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{text.definition_label}</label>
                                <select 
                                    value={card.definitionLang || 'en'} 
                                    onChange={(e) => handleCardChange(index, 'definitionLang', e.target.value)}
                                    className="text-[10px] uppercase font-bold bg-transparent border-none text-primary-600 dark:text-primary-400 cursor-pointer focus:ring-0 p-0"
                                >
                                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.code}</option>)}
                                </select>
                            </div>
                             <textarea
                              placeholder={text.definition_label}
                              value={card.definition}
                              onChange={(e) => handleCardChange(index, 'definition', e.target.value)}
                              rows={2}
                              className={`${inputClasses} flex-grow`}
                            />
                        </div>
                    </div>
                </div>

                <button onClick={() => removeCard(index)} disabled={cards.length <= 1} className="p-2 text-red-500 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed mt-6" aria-label="Remove card">
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
          <button onClick={addCard} className="mt-4 flex items-center gap-2 px-4 py-2 bg-secondary text-primary dark:bg-primary/20 dark:text-dark-primary rounded-md font-semibold hover:bg-primary-100 dark:hover:bg-primary/30 transition-colors">
            <PlusIcon className="w-5 h-5" />
            {text.add_card}
          </button>
        </div>
        
        <button onClick={handleSave} className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-600 transition-colors">
            {text.save_set}
        </button>
      </div>
      
      {showImport && (
          <ImportModal 
            language={language} 
            onClose={() => setShowImport(false)} 
            onImport={handleImportCards} 
          />
      )}
      
      {showExport && (
          <ExportModal 
            language={language} 
            onClose={() => setShowExport(false)} 
            cards={cards.filter(c => c.term.trim() || c.definition.trim())}
          />
      )}
    </div>
  );
};

// --- Sub-components for Modals ---

const SEPARATORS = {
    TAB: '\t',
    COMMA: ',',
    DASH: '-',
};

const ImportModal: React.FC<{
    language: Language;
    onClose: () => void;
    onImport: (cards: Card[]) => void;
}> = ({ language, onClose, onImport }) => {
    const text = UI_TEXT[language];
    const [inputText, setInputText] = useState('');
    const [separatorType, setSeparatorType] = useState<'TAB' | 'COMMA' | 'DASH' | 'CUSTOM'>('TAB');
    const [customSeparator, setCustomSeparator] = useState(';');
    const [autoDetect, setAutoDetect] = useState(true);
    
    // Intermediate state for parsed cards to allow editing language
    const [previewCards, setPreviewCards] = useState<Card[]>([]);

    const getSeparator = () => {
        if (separatorType === 'CUSTOM') return customSeparator;
        return SEPARATORS[separatorType];
    };
    
    // Parsing logic
    useEffect(() => {
        const sep = getSeparator();
        if (!inputText.trim()) {
            setPreviewCards([]);
            return;
        }

        const cards = inputText.split('\n')
            .filter(line => line.trim() !== '')
            .map((line, idx) => {
                const parts = line.split(sep);
                // If separator not found, put everything in term
                const term = parts[0]?.trim() || '';
                const definition = parts.length > 1 ? parts.slice(1).join(sep).trim() : '';
                
                return {
                    id: `preview-${idx}`,
                    term,
                    definition,
                    termLang: autoDetect ? detectLanguage(term) : 'en',
                    definitionLang: autoDetect ? detectLanguage(definition) : 'en',
                };
            });
            
        setPreviewCards(cards);
    }, [inputText, separatorType, customSeparator, autoDetect]);

    const updateLang = (index: number, field: 'termLang' | 'definitionLang', lang: string) => {
        const updated = [...previewCards];
        updated[index] = { ...updated[index], [field]: lang };
        setPreviewCards(updated);
    };

    const applyAllLang = (field: 'termLang' | 'definitionLang') => {
        if (previewCards.length === 0) return;
        // Use the first card's language as the source of truth for "Apply All"
        const langToApply = previewCards[0][field] || 'en';
        const updated = previewCards.map(card => ({ ...card, [field]: langToApply }));
        setPreviewCards(updated);
    };

    const handleImport = () => {
        const cardsToImport = previewCards.map(c => ({
            id: `imported-${Date.now()}-${Math.random()}`,
            term: c.term,
            definition: c.definition,
            termLang: c.termLang,
            definitionLang: c.definitionLang
        }));
        onImport(cardsToImport);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-dark-surface w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b dark:border-dark-primary/10">
                    <h3 className="text-2xl font-bold font-display">{text.import_modal_title}</h3>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    <div>
                        <textarea
                            className="w-full h-40 p-3 bg-primary-50 dark:bg-primary-900/50 border border-primary-200 dark:border-primary-700 rounded-lg focus:ring-2 focus:ring-primary font-mono text-sm"
                            placeholder={text.paste_text_placeholder}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                        />
                    </div>
                    
                    <div>
                        <div className="flex justify-between items-center mb-2">
                             <label className="block text-sm font-semibold">{text.separator_label}</label>
                             <label className="flex items-center space-x-2 cursor-pointer text-sm">
                                <input type="checkbox" checked={autoDetect} onChange={(e) => setAutoDetect(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                                <span>{text.detect_language}</span>
                            </label>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="radio" checked={separatorType === 'TAB'} onChange={() => setSeparatorType('TAB')} className="text-primary focus:ring-primary" />
                                <span>{text.sep_tab}</span>
                            </label>
                             <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="radio" checked={separatorType === 'COMMA'} onChange={() => setSeparatorType('COMMA')} className="text-primary focus:ring-primary" />
                                <span>{text.sep_comma}</span>
                            </label>
                             <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="radio" checked={separatorType === 'DASH'} onChange={() => setSeparatorType('DASH')} className="text-primary focus:ring-primary" />
                                <span>{text.sep_dash}</span>
                            </label>
                             <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="radio" checked={separatorType === 'CUSTOM'} onChange={() => setSeparatorType('CUSTOM')} className="text-primary focus:ring-primary" />
                                <span>{text.sep_custom}</span>
                            </label>
                            {separatorType === 'CUSTOM' && (
                                <input 
                                    type="text" 
                                    value={customSeparator} 
                                    onChange={(e) => setCustomSeparator(e.target.value)}
                                    className="w-20 px-2 py-1 bg-gray-50 dark:bg-dark-background border rounded ml-2"
                                    placeholder={text.custom_sep_placeholder}
                                />
                            )}
                        </div>
                    </div>
                    
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <h4 className="font-semibold">{text.preview_label}</h4>
                            {previewCards.length > 0 && (
                                <div className="flex gap-2 text-xs">
                                    <button onClick={() => applyAllLang('termLang')} className="text-primary-600 hover:underline">{text.apply_all_term} ({previewCards[0]?.termLang?.toUpperCase()})</button>
                                    <span className="text-gray-300">|</span>
                                    <button onClick={() => applyAllLang('definitionLang')} className="text-primary-600 hover:underline">{text.apply_all_def} ({previewCards[0]?.definitionLang?.toUpperCase()})</button>
                                </div>
                            )}
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-dark-background border rounded-lg p-3 h-60 overflow-y-auto text-sm">
                            {previewCards.length === 0 ? (
                                <p className="text-gray-500 italic text-center mt-4">{text.no_cards_preview}</p>
                            ) : (
                                <div className="space-y-3">
                                    {previewCards.map((card, i) => (
                                        <div key={i} className="flex gap-4 pb-3 border-b last:border-0 border-gray-200 dark:border-gray-700 items-start">
                                            <div className="w-1/2">
                                                <div className="flex justify-between items-center mb-1">
                                                     <span className="text-xs text-gray-400">Term</span>
                                                      <select 
                                                        value={card.termLang} 
                                                        onChange={(e) => updateLang(i, 'termLang', e.target.value)}
                                                        className="text-[10px] p-0 border-none bg-transparent uppercase font-bold text-primary-600 cursor-pointer focus:ring-0"
                                                    >
                                                        {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.code}</option>)}
                                                    </select>
                                                </div>
                                                <div className="font-medium text-primary-800 dark:text-primary-300 break-words">{card.term || <span className="text-red-400 italic">Empty</span>}</div>
                                            </div>
                                            <div className="w-1/2">
                                                 <div className="flex justify-between items-center mb-1">
                                                     <span className="text-xs text-gray-400">Definition</span>
                                                      <select 
                                                        value={card.definitionLang} 
                                                        onChange={(e) => updateLang(i, 'definitionLang', e.target.value)}
                                                        className="text-[10px] p-0 border-none bg-transparent uppercase font-bold text-primary-600 cursor-pointer focus:ring-0"
                                                    >
                                                        {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.code}</option>)}
                                                    </select>
                                                </div>
                                                <div className="text-gray-700 dark:text-gray-300 break-words">{card.definition || <span className="text-red-400 italic">Empty</span>}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="p-6 border-t dark:border-dark-primary/10 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors">
                        {text.cancel_btn}
                    </button>
                    <button onClick={handleImport} disabled={previewCards.length === 0} className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        {text.import_btn}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ExportModal: React.FC<{
    language: Language;
    onClose: () => void;
    cards: Card[];
}> = ({ language, onClose, cards }) => {
    const text = UI_TEXT[language];
    const [separatorType, setSeparatorType] = useState<'TAB' | 'COMMA' | 'DASH' | 'CUSTOM'>('TAB');
    const [customSeparator, setCustomSeparator] = useState(';');
    const [isCopied, setIsCopied] = useState(false);
    
    const getSeparator = () => {
        if (separatorType === 'CUSTOM') return customSeparator;
        return SEPARATORS[separatorType];
    };
    
    const exportText = React.useMemo(() => {
        const sep = getSeparator();
        return cards.map(c => `${c.term}${sep}${c.definition}`).join('\n');
    }, [cards, separatorType, customSeparator]);

    const handleCopy = () => {
        navigator.clipboard.writeText(exportText);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-dark-surface w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b dark:border-dark-primary/10">
                    <h3 className="text-2xl font-bold font-display">{text.export_modal_title}</h3>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    <div>
                        <label className="block text-sm font-semibold mb-2">{text.separator_label}</label>
                        <div className="flex flex-wrap gap-4">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="radio" checked={separatorType === 'TAB'} onChange={() => setSeparatorType('TAB')} className="text-primary focus:ring-primary" />
                                <span>{text.sep_tab}</span>
                            </label>
                             <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="radio" checked={separatorType === 'COMMA'} onChange={() => setSeparatorType('COMMA')} className="text-primary focus:ring-primary" />
                                <span>{text.sep_comma}</span>
                            </label>
                             <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="radio" checked={separatorType === 'DASH'} onChange={() => setSeparatorType('DASH')} className="text-primary focus:ring-primary" />
                                <span>{text.sep_dash}</span>
                            </label>
                             <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="radio" checked={separatorType === 'CUSTOM'} onChange={() => setSeparatorType('CUSTOM')} className="text-primary focus:ring-primary" />
                                <span>{text.sep_custom}</span>
                            </label>
                            {separatorType === 'CUSTOM' && (
                                <input 
                                    type="text" 
                                    value={customSeparator} 
                                    onChange={(e) => setCustomSeparator(e.target.value)}
                                    className="w-20 px-2 py-1 bg-gray-50 dark:bg-dark-background border rounded ml-2"
                                    placeholder={text.custom_sep_placeholder}
                                />
                            )}
                        </div>
                    </div>
                    
                    <div>
                        <h4 className="font-semibold mb-2">{text.preview_label}</h4>
                        <textarea
                            readOnly
                            className="w-full h-60 p-3 bg-gray-50 dark:bg-dark-background border border-gray-200 dark:border-gray-700 rounded-lg font-mono text-sm focus:outline-none"
                            value={exportText}
                        />
                    </div>
                </div>
                
                <div className="p-6 border-t dark:border-dark-primary/10 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors">
                        {text.close_btn}
                    </button>
                    <button onClick={handleCopy} className={`px-6 py-2 rounded-lg font-bold text-white transition-all ${isCopied ? 'bg-green-600' : 'bg-primary hover:bg-primary-600'}`}>
                        {isCopied ? text.copied : text.copy_text}
                    </button>
                </div>
            </div>
        </div>
    );
};
