
import { GoogleGenAI, Type } from "@google/genai";
import { Language, StudyGuide, StudySet } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const studyGuideSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A concise and relevant title for the study guide based on the topic.",
    },
    keyConcepts: {
      type: Type.ARRAY,
      description: "A list of 3-5 of the most important concepts, ideas, or terms related to the topic.",
      items: {
        type: Type.OBJECT,
        properties: {
          concept: {
            type: Type.STRING,
            description: "The name of the key concept.",
          },
          explanation: {
            type: Type.STRING,
            description: "A brief, easy-to-understand explanation of the concept (1-2 sentences).",
          },
        },
        required: ["concept", "explanation"],
      },
    },
    flashcards: {
      type: Type.ARRAY,
      description: "A list of 5-10 flashcards, each with a term and a definition.",
      items: {
        type: Type.OBJECT,
        properties: {
          term: {
            type: Type.STRING,
            description: "A specific term, name, or date related to the topic.",
          },
          definition: {
            type: Type.STRING,
            description: "A clear and concise definition or explanation of the term.",
          },
        },
        required: ["term", "definition"],
      },
    },
  },
  required: ["title", "keyConcepts", "flashcards"],
};

export const generateStudyGuide = async (topic: string, language: Language): Promise<StudyGuide> => {
  const langName = language === Language.EN ? 'English' : 'Norwegian';
  const prompt = `Create a simple study guide for a student on the topic: "${topic}".
The response must be in ${langName}.
The study guide should include a title, 3-5 key concepts with brief explanations, and 5-10 flashcards (term and definition).
Provide the response in a valid JSON format that adheres to the provided schema.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: studyGuideSchema,
      },
    });

    const jsonText = response.text.trim();
    const studyGuide = JSON.parse(jsonText) as StudyGuide;
    
    if (!studyGuide.title || !studyGuide.keyConcepts || !studyGuide.flashcards) {
        throw new Error("Received incomplete study guide data from AI.");
    }

    return studyGuide;

  } catch (error: any) {
    if (error.message?.includes('429') || error.status === 'RESOURCE_EXHAUSTED') {
         throw new Error("AI service is currently busy (Rate Limit). Please try again later.");
    }
    console.error("Error generating study guide:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate study guide: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating the study guide.");
  }
};

const distractorsSchema = {
    type: Type.OBJECT,
    properties: {
        distractors: {
            type: Type.ARRAY,
            description: "A list of distinct strings, each representing a plausible but incorrect answer.",
            items: {
                type: Type.STRING
            }
        }
    },
    required: ['distractors']
};

export const generateDistractors = async (term: string, definition: string, language: Language, count: number = 3): Promise<string[]> => {
    const langName = language === Language.EN ? 'English' : 'Norwegian';
    const prompt = `You are an expert educational content generator.
Task: Generate exactly ${count} plausible but incorrect distractors for a multiple-choice question where the question is the term and the correct answer is the definition.

Context:
- Term: "${term}"
- Correct Definition: "${definition}"
- Language: ${langName}

Rules for Distractors:
1. **Language Consistency**: The distractors MUST be in the same language as the "Correct Definition". If the definition is in Norwegian, distractors must be in Norwegian.
2. **Part of Speech**: Distractors must match the part of speech of the correct answer (e.g., if the answer is a noun, all distractors must be nouns).
3. **Semantic Distance**: Distractors should be related to the same general topic but clearly distinguishable from the correct answer. Do NOT use synonyms that could be considered correct.
4. **Length/Complexity**:
   - If the definition is a single word, distractors should be single words.
   - If the definition is a phrase/sentence, distractors should be phrases/sentences of similar length.
5. **No Repetitions**: Distractors must be distinct from each other and the correct definition.

Return only the list of distractors in valid JSON format.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: distractorsSchema,
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText) as { distractors: string[] };

        if (!result.distractors || result.distractors.length < count) {
            console.warn("AI returned fewer distractors than requested.");
            return result.distractors || [];
        }

        return result.distractors.slice(0, count);
    } catch (error: any) {
        // Handle Rate Limit Gracefully
        if (error.message?.includes('429') || error.status === 'RESOURCE_EXHAUSTED') {
            console.warn("Gemini API quota exceeded. Falling back to local generation.");
            return [];
        }
        console.error("Error generating distractors:", error);
        return []; // Fallback to empty array, UI handles local generation
    }
};

const audioAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "A catchy title for this recording session." },
        transcript: { type: Type.STRING, description: "The verbatim transcription of the audio." },
        essay: { type: Type.STRING, description: "A well-structured, educational essay summarizing the key points of the audio." },
        summary: { type: Type.STRING, description: "A concise 2-sentence summary." }
    },
    required: ["title", "transcript", "essay", "summary"]
};

export const processAudioContent = async (base64Audio: string, language: Language): Promise<{ title: string, transcript: string, essay: string, summary: string }> => {
    const langName = language === Language.EN ? 'English' : 'Norwegian';
    
    // Gemini 1.5 Flash supports audio input natively via inlineData
    // We send the audio and ask for specific outputs
    const prompt = `You are an expert educational assistant. Listen to the attached audio recording.
    1. Transcribe the audio accurately in its original language.
    2. Write a comprehensive, structured essay summarizing the content. The essay should be educational, organized with clear paragraphs, and easy to read.
    3. Provide a very short summary (2 sentences).
    4. Provide a title.
    
    Output the result in ${langName}.
    Response must be valid JSON matching the schema.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: "audio/mp3", // Generally compatible fallback, or detect actual type if possible
                            data: base64Audio
                        }
                    },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: audioAnalysisSchema
            }
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error: any) {
        console.error("Error processing audio:", error);
         if (error.message?.includes('429') || error.status === 'RESOURCE_EXHAUSTED') {
            throw new Error("AI service busy (Rate Limit). Try again later.");
        }
        throw new Error("Failed to process audio.");
    }
};

const generatedMaterialSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        cards: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    term: { type: Type.STRING },
                    definition: { type: Type.STRING }
                },
                required: ["term", "definition"]
            }
        }
    },
    required: ["title", "cards"]
};

export const generateMaterialsFromText = async (
    sourceText: string, 
    type: 'flashcards' | 'quiz', 
    difficulty: 'easy' | 'medium' | 'hard', 
    count: number,
    language: Language
): Promise<StudySet> => {
    const langName = language === Language.EN ? 'English' : 'Norwegian';
    
    let prompt = "";
    if (type === 'flashcards') {
        prompt = `Based on the following text, generate ${count} flashcards (term and definition). 
        Difficulty level: ${difficulty}.
        Language: ${langName}.
        Ensure definitions are clear and accurate based on the text provided.`;
    } else {
        // For quiz, we essentially generate flashcards that will be used in Test Mode
        prompt = `Based on the following text, generate ${count} question/answer pairs suitable for a quiz. 
        Format them as term (question) and definition (correct answer).
        Difficulty level: ${difficulty}.
        Language: ${langName}.`;
    }
    
    prompt += `\n\nSOURCE TEXT:\n${sourceText.substring(0, 15000)}`; // Limit context if needed

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: generatedMaterialSchema
            }
        });
        
        const result = JSON.parse(response.text.trim());
        
        return {
            id: Date.now().toString(),
            title: result.title || "Generated Set",
            description: `Generated from Voice Note (${difficulty})`,
            cards: result.cards.map((c: any, i: number) => ({
                id: `gen-${i}-${Date.now()}`,
                term: c.term,
                definition: c.definition,
                termLang: language,
                definitionLang: language
            })),
            mastery: {}
        };
    } catch (error: any) {
        console.error("Error generating materials:", error);
        throw new Error("Failed to generate materials from text.");
    }
};
