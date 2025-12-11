
export enum Language {
  EN = 'en',
  NO = 'no',
}

export enum AppTheme {
  Blue = 'blue', // Default/Quizlet style
  Green = 'green',
  Purple = 'purple',
  Dark = 'dark',
  Contrast = 'contrast', // High contrast
  System = 'system',
  // New Presets
  ModernLight = 'modern_light',
  DeepDark = 'deep_dark',
  OceanBlue = 'ocean_blue',
  SunsetWarm = 'sunset_warm',
  CyberNeon = 'cyber_neon',
  Custom = 'custom'
}

export interface CustomTheme {
  primaryColor: string;   // Hex
  secondaryColor: string; // Hex
  backgroundColor: string;// Hex
  cardColor: string;      // Hex
  textColor: string;      // Hex
  borderRadius: number;   // px
  fontFamily: 'Nunito' | 'Inter' | 'Poppins'; // Simple font selection
}

export type AppPage = 'home' | 'sets' | 'generator' | 'profile' | 'voice';

export interface CardMastery {
  [cardId: string]: {
    mastery: number; // 0-100 percentage
    lastReviewed: string; // ISO date string
    consecutiveCorrect: number; // Track streak for test mode
    attempts: number;
  };
}

export interface StudySet {
  id: string;
  title: string;
  description: string;
  cards: Card[];
  mastery: CardMastery;
}

export interface Card {
  id: string;
  term: string;
  definition: string;
  imageUrl?: string;
  termLang?: string;
  definitionLang?: string;
}

export interface FlashcardSettings {
  tapToFlip: boolean;
  spaceToFlip: boolean;
  arrowKeysResponse: boolean;
  swapButtons: boolean;
}

export interface TestModeSettings {
  behavior: 'standard' | 'memorise_all';
  numberOfChoices: number; // 2-6
  masteryThreshold: number; // e.g. 3 consecutive correct
  animations: boolean; // On / Reduced / Off
  audioEnabled: boolean;
  autoSave: boolean; // true = every answer, false = manual
  hintPenalty: boolean;
  shuffleChoices: boolean;
  languageDetectionConfidence: number;
}

export interface MemoriseSettings {
    wordsPerLevel: number;
    requireCorrectTwice: boolean;
    showProgressBar: boolean;
    showLevelSummary: boolean;
    mixQuestionTypes: boolean;
    inputQuestionRatio: number; // 0.0 to 1.0 (e.g. 0.3 for 30%)
    enableRetryLevel1: boolean;
}

export interface VoiceNote {
  id: string;
  date: string;
  title: string;
  transcript: string;
  essay: string;
  summary: string;
}

export interface UserProfile {
  name: string;
  age: number;
  grade: string;
  goal: string;
  studySets: StudySet[];
  voiceNotes: VoiceNote[];
  stats: {
    studyStreak: number;
    lastStudiedDate: string | null; // ISO date string
    setsCreated: number;
    termsLearned: number; 
  };
  achievements: string[];
  settings: {
    appearance: {
        theme: AppTheme;
        customTheme?: CustomTheme; // Store user customization
        fontSize: 'small' | 'medium' | 'large';
        reduceAnimations: boolean;
    };
    flashcardControls: FlashcardSettings;
    testMode: TestModeSettings;
    memoriseMode: MemoriseSettings;
    preferences: {
      shuffle: boolean;
      audioAutoplay: boolean;
      typingMode: boolean;
      notifications: boolean;
      cardStyle: 'simple' | 'animated';
    };
    defaultMode: 'standard' | 'memorise_all';
  };
}

export enum StudyMode {
  FLASHCARDS = 'FLASHCARDS',
  TEST = 'TEST',
  MEMORISE = 'MEMORISE',
  CRAM = 'CRAM',
}

export interface StudyGuide {
  title: string;
  keyConcepts: { concept: string; explanation: string }[];
  flashcards: { term: string; definition: string }[];
}
