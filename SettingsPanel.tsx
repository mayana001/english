
import React, { useState } from 'react';
import { Language, UserProfile, AppTheme, CustomTheme } from '../types';
import { UI_TEXT, PRESET_THEMES } from '../constants';
import { ThemeCustomizer } from './ThemeCustomizer';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  userProfile: UserProfile;
  updateUserProfile: (updater: (prev: UserProfile) => UserProfile) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
  isOpen, 
  onClose, 
  language, 
  userProfile, 
  updateUserProfile 
}) => {
  const text = UI_TEXT[language];
  const settings = userProfile.settings;
  const [activeTab, setActiveTab] = useState<'appearance' | 'learning' | 'account'>('appearance');
  const [isCustomizing, setIsCustomizing] = useState(false);

  if (!isOpen) return null;

  const updateSettings = (section: keyof typeof settings, key: string, value: any) => {
    updateUserProfile(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [section]: {
          ...prev.settings[section as any],
          [key]: value
        }
      }
    }));
  };
  
  const updateRootSetting = (key: keyof typeof settings, value: any) => {
    updateUserProfile(prev => ({
        ...prev,
        settings: {
            ...prev.settings,
            [key]: value
        }
    }));
  };

  const handleSaveCustomTheme = (customTheme: CustomTheme) => {
      updateUserProfile(prev => ({
          ...prev,
          settings: {
              ...prev.settings,
              appearance: {
                  ...prev.settings.appearance,
                  theme: AppTheme.Custom,
                  customTheme: customTheme
              }
          }
      }));
      setIsCustomizing(false);
  };

  const themePresets = [
    { id: AppTheme.Blue, label: text.theme_blue, color: '#4255ff' },
    { id: AppTheme.ModernLight, label: text.theme_modern_light, color: '#4A90E2' },
    { id: AppTheme.OceanBlue, label: text.theme_ocean_blue, color: '#006CBE' },
    { id: AppTheme.SunsetWarm, label: text.theme_sunset_warm, color: '#FF6A3D' },
    { id: AppTheme.Green, label: text.theme_green, color: '#38a169' },
    { id: AppTheme.Purple, label: text.theme_purple, color: '#9f7aea' },
    { id: AppTheme.DeepDark, label: text.theme_deep_dark, color: '#00D1FF', dark: true },
    { id: AppTheme.CyberNeon, label: text.theme_cyber_neon, color: '#8B00FF', dark: true },
    { id: AppTheme.Dark, label: text.theme_dark, color: '#667eea', dark: true },
    { id: AppTheme.System, label: text.theme_system, color: '#888888' },
  ];

  return (
    <>
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Panel */}
      <div className="relative w-full max-w-md bg-white dark:bg-dark-surface shadow-2xl h-full overflow-y-auto flex flex-col transform transition-transform duration-300 ease-in-out">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-dark-surface sticky top-0 z-10">
          <h2 className="text-xl font-bold font-display text-gray-800 dark:text-white flex items-center gap-2">
            ⚙️ {text.settings_header}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 px-5">
            {[
                { id: 'appearance', label: text.section_appearance },
                { id: 'learning', label: text.section_learning },
                { id: 'account', label: text.section_account }
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                        activeTab === tab.id 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>

        {/* Content */}
        <div className="p-6 space-y-8 flex-1">
            
            {/* --- APPEARANCE TAB --- */}
            {activeTab === 'appearance' && (
                <div className="space-y-8 animate-fade-in">
                    {/* Theme Grid */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider">
                            {text.theme_label}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {themePresets.map(theme => (
                                <button
                                    key={theme.id}
                                    onClick={() => updateSettings('appearance', 'theme', theme.id)}
                                    className={`relative p-3 rounded-xl border-2 text-left flex items-center gap-3 transition-all hover:scale-[1.02] ${
                                        settings.appearance.theme === theme.id
                                        ? 'border-primary bg-primary/5' 
                                        : 'border-gray-100 dark:border-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <div 
                                        className="w-8 h-8 rounded-full shadow-sm flex-shrink-0"
                                        style={{ backgroundColor: theme.color }}
                                    ></div>
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                        {theme.label}
                                    </span>
                                    {settings.appearance.theme === theme.id && (
                                        <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                        
                        {/* Custom Theme Card */}
                         <div className="mt-3">
                            <button
                                onClick={() => {
                                    // If already custom, just open editor. If not, switch to custom (loads defaults) then open
                                    if (settings.appearance.theme !== AppTheme.Custom) {
                                        // We don't switch yet, we open modal first
                                    }
                                    setIsCustomizing(true);
                                }}
                                className={`w-full p-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-all ${
                                    settings.appearance.theme === AppTheme.Custom
                                    ? 'border-primary bg-primary/5 text-primary'
                                    : 'border-gray-300 dark:border-gray-600 text-gray-500 hover:border-primary hover:text-primary'
                                }`}
                            >
                                <span className="font-bold">🎨 {text.customize_theme_btn}</span>
                            </button>
                        </div>
                    </div>

                    {/* Font Size */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                            {text.font_size_label}
                        </label>
                        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                            {['small', 'medium', 'large'].map((size) => (
                                <button
                                    key={size}
                                    onClick={() => updateSettings('appearance', 'fontSize', size)}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                                        settings.appearance.fontSize === size
                                        ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                    }`}
                                >
                                    {size === 'small' ? 'A' : size === 'medium' ? 'A+' : 'A++'}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {/* Animations Toggle */}
                    <div className="flex items-center justify-between">
                         <span className="text-gray-700 dark:text-gray-300 font-medium">{text.reduce_animations}</span>
                         <Toggle checked={settings.appearance.reduceAnimations} onChange={(val) => updateSettings('appearance', 'reduceAnimations', val)} />
                    </div>
                </div>
            )}

            {/* --- LEARNING TAB --- */}
            {activeTab === 'learning' && (
                <div className="space-y-8 animate-fade-in">
                    {/* ... Existing Learning Settings ... */}
                    {/* Default Mode */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">{text.learning_mode}</h4>
                         <div className="flex gap-2">
                            <button 
                                onClick={() => updateRootSetting('defaultMode', 'standard')}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                                    settings.defaultMode === 'standard' 
                                    ? 'bg-primary text-white border-primary' 
                                    : 'bg-transparent text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                                }`}
                            >
                                {text.mode_standard}
                            </button>
                            <button 
                                onClick={() => updateRootSetting('defaultMode', 'memorise_all')}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                                    settings.defaultMode === 'memorise_all' 
                                    ? 'bg-primary text-white border-primary' 
                                    : 'bg-transparent text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                                }`}
                            >
                                {text.mode_memorise_all}
                            </button>
                        </div>
                    </div>

                    {/* Memorise Settings */}
                    <div>
                         <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">{text.memorise_mode_settings}</h4>
                         <div className="space-y-4">
                             <div>
                                 <div className="flex justify-between mb-2 text-sm">
                                    <span className="text-gray-700 dark:text-gray-300">{text.mem_words_per_level}</span>
                                    <span className="font-bold text-primary">{settings.memoriseMode.wordsPerLevel}</span>
                                 </div>
                                 <input 
                                    type="range" 
                                    min="3" 
                                    max="20" 
                                    value={settings.memoriseMode.wordsPerLevel} 
                                    onChange={(e) => updateSettings('memoriseMode', 'wordsPerLevel', parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                             </div>
                             
                             <div className="flex justify-between items-center">
                                <span className="text-gray-700 dark:text-gray-300 text-sm">{text.mem_mix_types}</span>
                                <Toggle checked={settings.memoriseMode.mixQuestionTypes} onChange={(val) => updateSettings('memoriseMode', 'mixQuestionTypes', val)} />
                             </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-700 dark:text-gray-300 text-sm">{text.mem_retry_level1}</span>
                                <Toggle checked={settings.memoriseMode.enableRetryLevel1} onChange={(val) => updateSettings('memoriseMode', 'enableRetryLevel1', val)} />
                             </div>
                         </div>
                    </div>

                    {/* Flashcard Controls */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">{text.flashcard_controls}</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700 dark:text-gray-300 text-sm">{text.tap_to_flip}</span>
                                <Toggle checked={settings.flashcardControls.tapToFlip} onChange={(val) => updateSettings('flashcardControls', 'tapToFlip', val)} />
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700 dark:text-gray-300 text-sm">{text.space_to_flip}</span>
                                <Toggle checked={settings.flashcardControls.spaceToFlip} onChange={(val) => updateSettings('flashcardControls', 'spaceToFlip', val)} />
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700 dark:text-gray-300 text-sm">{text.arrow_keys}</span>
                                <Toggle checked={settings.flashcardControls.arrowKeysResponse} onChange={(val) => updateSettings('flashcardControls', 'arrowKeysResponse', val)} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* --- ACCOUNT TAB --- */}
            {activeTab === 'account' && (
                <div className="space-y-6 animate-fade-in">
                     <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                        <p className="font-bold text-gray-800 dark:text-white">{userProfile.name}</p>
                        <p className="text-sm text-gray-500">{userProfile.grade}</p>
                     </div>
                     
                     <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-700 dark:text-gray-300 text-sm">{text.pref_notifications}</span>
                            <Toggle checked={settings.preferences.notifications} onChange={(val) => updateSettings('preferences', 'notifications', val)} />
                        </div>
                     </div>
                     
                     <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
                         <button className="text-red-500 text-sm font-bold hover:underline">
                            {text.reset_defaults}
                         </button>
                     </div>
                </div>
            )}
        </div>
      </div>
    </div>
    
    {isCustomizing && (
        <ThemeCustomizer 
            language={language}
            initialTheme={settings.appearance.customTheme}
            baseTheme={settings.appearance.theme === AppTheme.Custom ? AppTheme.ModernLight : settings.appearance.theme}
            onSave={handleSaveCustomTheme}
            onCancel={() => setIsCustomizing(false)}
        />
    )}
    </>
  );
};

// Helper Toggle Component (Reused)
const Toggle: React.FC<{ checked: boolean, onChange: (val: boolean) => void }> = ({ checked, onChange }) => (
    <button 
        onClick={() => onChange(!checked)}
        className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${checked ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
);
