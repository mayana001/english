
import React, { useState, useEffect } from 'react';
import { CustomTheme, Language, AppTheme } from '../types';
import { UI_TEXT, PRESET_THEMES } from '../constants';

interface ThemeCustomizerProps {
    language: Language;
    initialTheme: CustomTheme | undefined; // Can be undefined if starting new
    baseTheme: AppTheme; // To load defaults if initialTheme is undefined
    onSave: (theme: CustomTheme) => void;
    onCancel: () => void;
}

// Helper: Hex to RGB conversion for preview
const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
};

// Helper: Calculate contrast ratio (simple)
const getLuminance = (hex: string) => {
    const rgb = hexToRgb(hex).split(',').map(Number);
    const a = rgb.map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

const getContrast = (hex1: string, hex2: string) => {
    const lum1 = getLuminance(hex1);
    const lum2 = getLuminance(hex2);
    return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
};

export const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({ language, initialTheme, baseTheme, onSave, onCancel }) => {
    const text = UI_TEXT[language];
    
    // Default to Modern Light if no base or initial
    const defaults: CustomTheme = (PRESET_THEMES as any)[baseTheme] || PRESET_THEMES[AppTheme.ModernLight];
    
    const [theme, setTheme] = useState<CustomTheme>(initialTheme || defaults);

    const handleChange = (key: keyof CustomTheme, value: any) => {
        setTheme(prev => ({ ...prev, [key]: value }));
    };

    // Check contrast
    const contrastRatio = getContrast(theme.backgroundColor, theme.textColor);
    const isContrastBad = contrastRatio < 4.5;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden">
                
                {/* Controls Sidebar */}
                <div className="w-full md:w-1/2 p-6 overflow-y-auto bg-gray-50 dark:bg-gray-800 border-r dark:border-gray-700">
                    <h2 className="text-2xl font-bold font-display mb-6 text-gray-800 dark:text-white">{text.customizer_title}</h2>
                    
                    <div className="space-y-6">
                        {/* Colors */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">{text.section_appearance}</h3>
                            
                            <ColorInput label={text.color_primary} value={theme.primaryColor} onChange={(v) => handleChange('primaryColor', v)} />
                            <ColorInput label={text.color_secondary} value={theme.secondaryColor} onChange={(v) => handleChange('secondaryColor', v)} />
                            <ColorInput label={text.color_bg} value={theme.backgroundColor} onChange={(v) => handleChange('backgroundColor', v)} />
                            <ColorInput label={text.color_card} value={theme.cardColor} onChange={(v) => handleChange('cardColor', v)} />
                            <ColorInput label={text.color_text} value={theme.textColor} onChange={(v) => handleChange('textColor', v)} />
                            
                            {isContrastBad && (
                                <div className="p-3 bg-red-100 text-red-800 text-xs rounded-lg flex items-center gap-2">
                                    ⚠️ <b>Warning:</b> Low contrast between background and text ({contrastRatio.toFixed(2)}). Consider adjusting colors for readability.
                                </div>
                            )}
                        </div>

                        {/* Styles */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Style</h3>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{text.border_radius}: {theme.borderRadius}px</label>
                                <input 
                                    type="range" min="0" max="30" value={theme.borderRadius} 
                                    onChange={(e) => handleChange('borderRadius', parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{text.font_style}</label>
                                <div className="flex gap-2">
                                    {['Nunito', 'Inter', 'Poppins'].map(font => (
                                        <button
                                            key={font}
                                            onClick={() => handleChange('fontFamily', font)}
                                            className={`flex-1 py-2 text-sm border rounded-lg transition-all ${theme.fontFamily === font ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : 'border-gray-200 text-gray-600'}`}
                                            style={{ fontFamily: font }}
                                        >
                                            {font}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex gap-3">
                         <button onClick={onCancel} className="flex-1 py-3 text-gray-600 hover:bg-gray-200 rounded-xl font-bold transition-colors">
                            {text.cancel_btn}
                        </button>
                        <button onClick={() => onSave(theme)} className="flex-1 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold shadow-lg transition-colors">
                            {text.save_theme}
                        </button>
                    </div>
                </div>

                {/* Live Preview */}
                <div className="w-full md:w-1/2 p-6 bg-gray-200 dark:bg-black/50 flex items-center justify-center relative">
                    <div className="absolute top-4 left-4 bg-white/80 backdrop-blur px-3 py-1 rounded text-xs font-bold uppercase tracking-widest text-gray-600">
                        {text.preview_ui}
                    </div>

                    {/* Preview Container simulating App UI */}
                    <div 
                        className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300"
                        style={{
                            backgroundColor: theme.backgroundColor,
                            color: theme.textColor,
                            fontFamily: theme.fontFamily,
                        }}
                    >
                        {/* Fake Header */}
                        <div className="p-4 flex justify-between items-center border-b" style={{ borderColor: theme.primaryColor + '20' }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: theme.primaryColor, borderRadius: theme.borderRadius }}>S</div>
                            <div className="w-8 h-8 rounded-full bg-gray-200 opacity-20"></div>
                        </div>

                        {/* Fake Content */}
                        <div className="p-6 space-y-4 flex-1">
                            <h1 className="text-2xl font-bold">Hello, User!</h1>
                            
                            {/* Card 1 */}
                            <div 
                                className="p-4 shadow-sm border"
                                style={{
                                    backgroundColor: theme.cardColor,
                                    borderRadius: theme.borderRadius,
                                    borderColor: theme.primaryColor + '20'
                                }}
                            >
                                <div className="flex gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: theme.secondaryColor, borderRadius: theme.borderRadius }}>
                                        <span style={{ color: theme.primaryColor }}>★</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold">Study Set 1</h3>
                                        <p className="text-xs opacity-60">12 cards</p>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2 */}
                             <div 
                                className="p-4 shadow-sm border"
                                style={{
                                    backgroundColor: theme.cardColor,
                                    borderRadius: theme.borderRadius,
                                    borderColor: theme.primaryColor + '20'
                                }}
                            >
                                <h3 className="font-bold mb-2">Progress</h3>
                                <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.primaryColor + '20' }}>
                                    <div className="h-full" style={{ width: '60%', backgroundColor: theme.primaryColor }}></div>
                                </div>
                            </div>
                            
                            {/* Button */}
                            <button 
                                className="w-full py-3 font-bold shadow-md"
                                style={{
                                    backgroundColor: theme.primaryColor,
                                    color: '#fff',
                                    borderRadius: theme.borderRadius
                                }}
                            >
                                Start Learning
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ColorInput: React.FC<{ label: string, value: string, onChange: (val: string) => void }> = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <div className="flex items-center gap-2">
            <div className="text-xs font-mono text-gray-500 uppercase">{value}</div>
            <input 
                type="color" 
                value={value} 
                onChange={(e) => onChange(e.target.value)}
                className="w-10 h-10 p-0 border-0 rounded-lg cursor-pointer overflow-hidden shadow-sm"
            />
            {/* Hex Text Input */}
             <input 
                type="text" 
                value={value} 
                onChange={(e) => onChange(e.target.value)}
                maxLength={7}
                className="w-20 p-2 text-xs border rounded focus:ring-1 focus:ring-blue-500 font-mono"
            />
        </div>
    </div>
);
