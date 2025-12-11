
import React, { useState, useRef, useEffect } from 'react';
import { Language, UserProfile, VoiceNote, StudySet } from '../types';
import { UI_TEXT } from '../constants';
import { processAudioContent, generateMaterialsFromText } from '../services/geminiService';
import { MicIcon } from './icons/MicIcon';
import { UploadIcon } from './icons/UploadIcon';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';

interface VoiceStudyGeneratorProps {
    language: Language;
    userProfile: UserProfile;
    updateUserProfile: (updater: (prev: UserProfile) => UserProfile) => void;
    onGoToSets: () => void;
}

export const VoiceStudyGenerator: React.FC<VoiceStudyGeneratorProps> = ({ language, userProfile, updateUserProfile, onGoToSets }) => {
    const text = UI_TEXT[language];
    
    // State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeNote, setActiveNote] = useState<VoiceNote | null>(null);
    const [viewTab, setViewTab] = useState<'essay' | 'transcript'>('essay');
    const [error, setError] = useState<string | null>(null);

    // Generation Modal State
    const [showGenModal, setShowGenModal] = useState(false);
    const [genType, setGenType] = useState<'flashcards' | 'quiz'>('flashcards');
    const [genDifficulty, setGenDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [genCount, setGenCount] = useState(10);
    const [isGenerating, setIsGenerating] = useState(false);

    // Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Helpers
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = handleRecordingStop;

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            
            timerRef.current = window.setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
            
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setError("Could not access microphone. Please allow permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop()); // Stop stream
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const handleRecordingStop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); // Chrome/Firefox default
        await processAudio(audioBlob);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            processAudio(file);
        }
    };

    const processAudio = async (blob: Blob) => {
        setIsProcessing(true);
        setError(null);
        try {
            // Convert Blob to Base64
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64String = (reader.result as string).split(',')[1]; // Remove data:audio/xyz;base64, prefix
                
                try {
                    const result = await processAudioContent(base64String, language);
                    
                    const newNote: VoiceNote = {
                        id: Date.now().toString(),
                        date: new Date().toISOString(),
                        title: result.title,
                        transcript: result.transcript,
                        essay: result.essay,
                        summary: result.summary
                    };

                    updateUserProfile(prev => ({
                        ...prev,
                        voiceNotes: [newNote, ...(prev.voiceNotes || [])]
                    }));
                    
                    setActiveNote(newNote);
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setIsProcessing(false);
                }
            };
        } catch (err) {
            setError("Failed to read audio file.");
            setIsProcessing(false);
        }
    };

    const handleGenerateMaterials = async () => {
        if (!activeNote) return;
        setIsGenerating(true);
        try {
            const newSet = await generateMaterialsFromText(activeNote.essay, genType, genDifficulty, genCount, language);
            newSet.title = `${activeNote.title} (${genType === 'quiz' ? 'Quiz' : 'Flashcards'})`;
            
            updateUserProfile(prev => ({
                ...prev,
                studySets: [newSet, ...prev.studySets],
                stats: { ...prev.stats, setsCreated: prev.stats.setsCreated + 1 }
            }));
            
            setShowGenModal(false);
            onGoToSets(); // Redirect to Sets page to see result
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleDeleteNote = (noteId: string) => {
        if (confirm("Are you sure you want to delete this note?")) {
            updateUserProfile(prev => ({
                ...prev,
                voiceNotes: prev.voiceNotes.filter(n => n.id !== noteId)
            }));
            if (activeNote?.id === noteId) setActiveNote(null);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
            <h2 className="text-3xl font-bold font-display mb-2">{text.voice_title}</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">{text.voice_instructions}</p>

            {/* Recording / Upload Section */}
            {!activeNote && (
                <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-lg border dark:border-dark-primary/20 p-10 flex flex-col items-center justify-center text-center space-y-6 transition-all">
                    {isProcessing ? (
                         <div className="flex flex-col items-center animate-pulse">
                            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <p className="text-xl font-bold text-primary">{text.processing_audio}</p>
                        </div>
                    ) : isRecording ? (
                        <div className="flex flex-col items-center">
                            <div className="relative w-32 h-32 mb-6 flex items-center justify-center">
                                <span className="absolute w-full h-full bg-red-100 rounded-full animate-ping opacity-75"></span>
                                <div className="relative w-24 h-24 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                                    <MicIcon className="w-10 h-10 text-white" />
                                </div>
                            </div>
                            <p className="text-4xl font-mono font-bold text-gray-800 dark:text-white mb-4">{formatTime(recordingTime)}</p>
                            <button 
                                onClick={stopRecording} 
                                className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold text-lg shadow-lg transition-transform hover:scale-105"
                            >
                                {text.stop_recording}
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-6">
                            <button 
                                onClick={startRecording}
                                className="flex flex-col items-center justify-center w-40 h-40 bg-primary hover:bg-primary-600 text-white rounded-full shadow-xl transition-all hover:scale-105 group"
                            >
                                <MicIcon className="w-12 h-12 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="font-bold">{text.start_recording}</span>
                            </button>
                            
                            <div className="flex items-center gap-4 text-gray-400 text-sm">
                                <span className="w-12 h-px bg-gray-200 dark:bg-gray-700"></span>
                                OR
                                <span className="w-12 h-px bg-gray-200 dark:bg-gray-700"></span>
                            </div>

                            <input type="file" accept="audio/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-dark-surface border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-primary hover:text-primary transition-colors text-gray-500"
                            >
                                <UploadIcon className="w-5 h-5" />
                                {text.upload_audio}
                            </button>
                        </div>
                    )}
                    {error && <p className="text-red-500 bg-red-50 px-4 py-2 rounded-lg mt-4">{error}</p>}
                </div>
            )}

            {/* Previous Notes List (Sidebar-ish or Bottom List) */}
            {!activeNote && userProfile.voiceNotes && userProfile.voiceNotes.length > 0 && !isRecording && !isProcessing && (
                <div className="mt-12">
                    <h3 className="text-xl font-bold font-display mb-4 text-gray-700 dark:text-gray-300">Previous Notes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {userProfile.voiceNotes.map(note => (
                            <div key={note.id} onClick={() => setActiveNote(note)} className="p-4 bg-white dark:bg-dark-surface rounded-xl shadow border dark:border-dark-primary/10 cursor-pointer hover:shadow-md transition-all group relative">
                                <h4 className="font-bold text-primary mb-1">{note.title}</h4>
                                <p className="text-sm text-gray-500 line-clamp-2">{note.summary}</p>
                                <span className="text-xs text-gray-400 mt-2 block">{new Date(note.date).toLocaleDateString()}</span>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                                    className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Note View */}
            {activeNote && (
                <div className="space-y-6 animate-fade-in">
                    <button onClick={() => setActiveNote(null)} className="text-sm text-gray-500 hover:text-primary font-bold">
                        &larr; Back to Recorder
                    </button>
                    
                    <div className="flex justify-between items-start">
                        <h2 className="text-3xl font-bold font-display text-gray-800 dark:text-white">{activeNote.title}</h2>
                        <div className="flex gap-2">
                             <button 
                                onClick={() => { setGenType('flashcards'); setShowGenModal(true); }}
                                className="px-4 py-2 bg-secondary text-primary dark:text-dark-primary font-bold rounded-lg hover:bg-secondary/80 transition-colors text-sm"
                            >
                                {text.create_flashcards}
                            </button>
                            <button 
                                onClick={() => { setGenType('quiz'); setShowGenModal(true); }}
                                className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-600 transition-colors text-sm"
                            >
                                {text.create_quiz}
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-sm border dark:border-dark-primary/20 overflow-hidden">
                        <div className="flex border-b border-gray-100 dark:border-gray-700">
                            <button 
                                onClick={() => setViewTab('essay')}
                                className={`flex-1 py-4 font-bold text-sm uppercase tracking-wide transition-colors ${viewTab === 'essay' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            >
                                {text.tab_essay}
                            </button>
                            <button 
                                onClick={() => setViewTab('transcript')}
                                className={`flex-1 py-4 font-bold text-sm uppercase tracking-wide transition-colors ${viewTab === 'transcript' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            >
                                {text.tab_transcript}
                            </button>
                        </div>
                        
                        <div className="p-8">
                             {viewTab === 'essay' ? (
                                <div className="prose dark:prose-invert max-w-none">
                                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300 italic mb-6 border-l-4 border-secondary pl-4 py-2 bg-gray-50 dark:bg-dark-background rounded-r">
                                        {activeNote.summary}
                                    </p>
                                    <div className="whitespace-pre-wrap leading-relaxed text-gray-800 dark:text-gray-200">
                                        {activeNote.essay}
                                    </div>
                                </div>
                             ) : (
                                 <div className="whitespace-pre-wrap text-gray-600 dark:text-gray-400 font-mono text-sm leading-relaxed bg-gray-50 dark:bg-dark-background p-4 rounded-lg">
                                     {activeNote.transcript}
                                 </div>
                             )}
                        </div>
                    </div>
                </div>
            )}

            {/* Generation Modal */}
            {showGenModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-dark-surface w-full max-w-md rounded-2xl shadow-2xl p-6">
                        <h3 className="text-xl font-bold font-display mb-6">{text.gen_modal_title}</h3>
                        
                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-sm font-bold text-gray-500 mb-2">{text.gen_type}</label>
                                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                                    <button onClick={() => setGenType('flashcards')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${genType === 'flashcards' ? 'bg-white dark:bg-dark-surface shadow text-primary' : 'text-gray-500'}`}>{text.gen_type_flashcards}</button>
                                    <button onClick={() => setGenType('quiz')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${genType === 'quiz' ? 'bg-white dark:bg-dark-surface shadow text-primary' : 'text-gray-500'}`}>{text.gen_type_quiz}</button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-500 mb-2">{text.gen_difficulty}</label>
                                <select value={genDifficulty} onChange={(e) => setGenDifficulty(e.target.value as any)} className="w-full p-3 bg-gray-50 dark:bg-gray-800 border-none rounded-lg font-medium">
                                    <option value="easy">{text.gen_diff_easy}</option>
                                    <option value="medium">{text.gen_diff_medium}</option>
                                    <option value="hard">{text.gen_diff_hard}</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-500 mb-2">{text.gen_count}: {genCount}</label>
                                <input type="range" min="5" max="20" value={genCount} onChange={(e) => setGenCount(parseInt(e.target.value))} className="w-full accent-primary h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                            </div>
                        </div>
                        
                        <div className="flex gap-3">
                            <button onClick={() => setShowGenModal(false)} className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl">{text.cancel_btn}</button>
                            <button onClick={handleGenerateMaterials} disabled={isGenerating} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-600 disabled:opacity-50">
                                {isGenerating ? text.generating_materials : text.gen_btn_create}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
