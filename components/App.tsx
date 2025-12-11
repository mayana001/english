
import React, { useState, useEffect, useCallback } from 'react';
import { Language, AppTheme, UserProfile, AppPage } from '../types';
import { Header } from './Header';
import { AuthPage } from './AuthPage';
import { HomePage } from './HomePage';
import { StudySetsPage } from './StudySetsPage';
import { StudyGuideGenerator } from './StudyGuideGenerator';
import { VoiceStudyGenerator } from './VoiceStudyGenerator';
import { ProfilePage } from './ProfilePage';
import { NavBar } from './NavBar';
import { SettingsPanel } from './SettingsPanel';

const APP_STORAGE_KEY = 'studymate_user_profile_v5';

const DEFAULT_SETTINGS = {
    appearance: {
        theme: AppTheme.Blue,
        fontSize: 'medium' as const,
        reduceAnimations: false
    },
    flashcardControls: {
        tapToFlip: true,
        spaceToFlip: true,
        arrowKeysResponse: true,
        swapButtons: false
    },
    testMode: {
        behavior: 'memorise_all' as const,
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
        cardStyle: 'simple' as const
    },
    defaultMode: 'standard' as const
};

const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
};

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [page, setPage] = useState<AppPage>('home');
  const [language, setLanguage] = useState<Language>(Language.EN);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load Profile
  useEffect(() => {
    try {
      const storedProfile = localStorage.getItem(APP_STORAGE_KEY);
      if (storedProfile) {
        const parsed = JSON.parse(storedProfile);
        // Deep merge defaults to handle version migrations
        if (!parsed.settings || !parsed.settings.appearance) {
             parsed.settings = {
                ...DEFAULT_SETTINGS,
                ...parsed.settings,
                appearance: DEFAULT_SETTINGS.appearance // Ensure new appearance section exists
             };
        }
        setUserProfile(parsed);
      }
    } catch (error) {
      console.error("Failed to parse user profile from localStorage", error);
      localStorage.removeItem(APP_STORAGE_KEY);
    }
  }, []);

  // Theme Application Logic
  useEffect(() => {
    if (!userProfile) return;
    
    const { theme, customTheme, fontSize } = userProfile.settings.appearance;
    const root = document.documentElement;
    const allThemes = Object.values(AppTheme).map(t => `theme-${t}`);

    // Remove all old theme classes
    root.classList.remove(...allThemes);
    
    // Reset custom properties (if returning from custom)
    root.style.removeProperty('--primary-rgb');
    root.style.removeProperty('--secondary-rgb');
    root.style.removeProperty('--bg-rgb');
    root.style.removeProperty('--card-bg-rgb');
    root.style.removeProperty('--text-rgb');
    root.style.removeProperty('--border-radius');
    root.style.removeProperty('--font-family');
    
    let appliedTheme = theme;
    
    if (theme === AppTheme.System) {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        appliedTheme = systemDark ? AppTheme.Dark : AppTheme.Blue;
    }

    if (theme === AppTheme.Custom && customTheme) {
        // Apply Custom Theme Variables directly
        const pRgb = hexToRgb(customTheme.primaryColor);
        const sRgb = hexToRgb(customTheme.secondaryColor);
        const bRgb = hexToRgb(customTheme.backgroundColor);
        const cRgb = hexToRgb(customTheme.cardColor);
        const tRgb = hexToRgb(customTheme.textColor);
        
        if(pRgb) root.style.setProperty('--primary-rgb', pRgb);
        if(sRgb) root.style.setProperty('--secondary-rgb', sRgb);
        if(bRgb) root.style.setProperty('--bg-rgb', bRgb);
        if(cRgb) root.style.setProperty('--card-bg-rgb', cRgb);
        if(tRgb) root.style.setProperty('--text-rgb', tRgb);
        
        root.style.setProperty('--border-radius', `${customTheme.borderRadius / 16}rem`);
        root.style.setProperty('--font-family', `"${customTheme.fontFamily}", sans-serif`);
        
        // Determine if dark for Tailwind 'dark' class
        // Simple logic: check bg luminance (roughly)
        // Or just let user toggle it manually? 
        // Let's infer: if bg color is dark, add 'dark' class
        const bgHex = customTheme.backgroundColor.replace('#', '');
        const r = parseInt(bgHex.substr(0,2),16);
        const g = parseInt(bgHex.substr(2,2),16);
        const b = parseInt(bgHex.substr(4,2),16);
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709
        
        if (luma < 100) root.classList.add('dark');
        else root.classList.remove('dark');
        
    } else {
        // Apply Preset Class
        root.classList.add(`theme-${appliedTheme}`);
        
        // Handle Dark Mode Class for Presets
        const darkPresets = [AppTheme.Dark, AppTheme.DeepDark, AppTheme.CyberNeon];
        if (darkPresets.includes(appliedTheme as AppTheme)) {
            root.classList.add('dark');
        } else if (theme === AppTheme.System) {
             // Already handled logic above for appliedTheme
             if (appliedTheme === AppTheme.Dark) root.classList.add('dark');
             else root.classList.remove('dark');
        } else {
            root.classList.remove('dark');
        }
    }
    
    // Font Size Variables
    const sizeMap = {
        'small': '14px',
        'medium': '16px',
        'large': '18px'
    };
    root.style.setProperty('--font-size-base', sizeMap[fontSize]);
    
    // System Theme Listener
    if (theme === AppTheme.System) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
            const newSystemTheme = e.matches ? AppTheme.Dark : AppTheme.Blue;
            // Re-run logic essentially or simple class swap
            root.classList.remove('theme-blue', 'theme-dark');
            root.classList.add(`theme-${newSystemTheme}`);
            if (newSystemTheme === AppTheme.Dark) root.classList.add('dark');
            else root.classList.remove('dark');
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }

  }, [userProfile?.settings.appearance]);

  const handleLogin = (profile: UserProfile) => {
    const profileWithDefaults = {
      ...profile,
      settings: DEFAULT_SETTINGS
    };
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(profileWithDefaults));
    setUserProfile(profileWithDefaults);
    setPage('home');
  };

  const handleLogout = () => {
    localStorage.removeItem(APP_STORAGE_KEY);
    setUserProfile(null);
  };

  const updateUserProfile = useCallback((updates: Partial<UserProfile> | ((prev: UserProfile) => UserProfile)) => {
    setUserProfile(prev => {
        if (!prev) return null;
        const newProfile = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
        localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(newProfile));
        return newProfile;
    });
  }, []);

  const renderContent = () => {
    switch(page) {
        case 'home':
            return <HomePage language={language} userProfile={userProfile!} setPage={setPage} />;
        case 'sets':
            return <StudySetsPage language={language} userProfile={userProfile!} updateUserProfile={updateUserProfile} />;
        case 'generator':
            return <StudyGuideGenerator language={language} updateUserProfile={updateUserProfile} setPage={setPage} />;
        case 'voice':
            return <VoiceStudyGenerator language={language} userProfile={userProfile!} updateUserProfile={updateUserProfile} onGoToSets={() => setPage('sets')} />;
        case 'profile':
            return <ProfilePage language={language} userProfile={userProfile!} updateUserProfile={updateUserProfile} onLogout={handleLogout} />;
        default:
            return <HomePage language={language} userProfile={userProfile!} setPage={setPage} />;
    }
  };

  if (!userProfile) {
    return (
      <div className="font-sans bg-background text-gray-900 transition-colors duration-300 min-h-screen">
        <AuthPage 
          language={language} 
          onLogin={handleLogin} 
          theme={AppTheme.Blue} 
          setTheme={() => {}} 
        />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen font-sans bg-background text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-300">
      <Header 
        language={language} 
        setLanguage={setLanguage} 
        page={page}
        setPage={setPage}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      
      <main className="flex-1 overflow-y-auto pt-20 pb-20">
        {renderContent()}
      </main>
      
      <NavBar 
        language={language}
        activePage={page}
        setPage={setPage}
      />
      
      <SettingsPanel 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        language={language}
        userProfile={userProfile}
        updateUserProfile={updateUserProfile}
      />
    </div>
  );
};

export default App;
