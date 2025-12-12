import { GoogleGenAI, Type } from "@google/genai";
import { Tab, TabSettings, ChatMessage, ChatMode, SettingScope } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const IMAGE_MODEL = "gemini-3-pro-image-preview";

const fileToPart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const cleanJsonString = (str: string) => {
  if (!str) return "{}";
  // Remove markdown code blocks if present
  let clean = str.replace(/```json\n?|\n?```/g, "");
  clean = clean.trim();
  return clean;
};

export const analyzePDFInitial = async (file: File) => {
  try {
    const filePart = await fileToPart(file);
    const prompt = `
      Analyze this PDF document.
      Return a JSON object with the following structure:
      {
        "pageCount": number (estimate based on content if not explicit, but try to be accurate),
        "globalSummary": "A short 2-3 line summary of the entire document.",
        "perPageSummaries": [
          { "page": 1, "summary": "1-2 line summary of page 1" },
          { "page": 2, "summary": "..." }
          // ... and so on for all pages
        ]
      }
    `;

    // Always use flash for initial analysis to be fast, or pro if accuracy needed. 
    // Using Flash for speed on initial load.
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: {
        role: 'user',
        parts: [filePart, { text: prompt }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pageCount: { type: Type.INTEGER },
            globalSummary: { type: Type.STRING },
            perPageSummaries: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  page: { type: Type.INTEGER },
                  summary: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const jsonStr = cleanJsonString(response.text || "{}");
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error analyzing PDF:", error);
    throw error;
  }
};

export const generatePageExplanation = async (
  tab: Tab,
  pageNumber: number,
  modelId: string,
  refinement?: { previousText: string; userComment: string }
): Promise<string> => {
  if (!tab.file) throw new Error("No file");

  const settings = tab.settings;
  const style = settings.style === 'Custom' ? settings.customStyle : settings.style;
  const lang = settings.language === 'Custom' ? settings.customLanguage : settings.language;
  
  // Construct instructions based on checkboxes
  let instructions = "";
  if (settings.checkboxes.instructions.page) instructions += `Instructions: ${settings.instructions}\n`;
  if (settings.checkboxes.style.page) instructions += `Style: ${style}\n`;
  if (settings.checkboxes.language.page) instructions += `Language: ${lang}\n`;

  const filePart = await fileToPart(tab.file);
  
  let prompt = `
    You are a universal PDF explainer.
    The user is currently on PAGE ${pageNumber} of this document.
    
    Global Summary: ${tab.globalSummary}
    Page Summary: ${tab.perPageSummaries[pageNumber] || "Not available"}
    
    TASK: Explain PAGE ${pageNumber} in detail.
    
    CONFIGURATION:
    ${instructions}
    
    Use both text and images from the page. Keep your answer grounded in the PDF.
    Format with Markdown.
    
    CRITICAL: Do NOT include any images, <img> tags, or markdown image links in your response. Since you cannot host files, any image URL you generate will be broken. Describe visual elements (charts, diagrams) textually only.
  `;

  // Inject refinement context if present
  if (refinement && refinement.userComment) {
    prompt += `
    
    *** SPECIFIC INSTRUCTIONS FOR THIS GENERATION ***
    The user has provided a specific comment/instruction for this page explanation:
    "${refinement.userComment}"
    `;
    
    if (refinement.previousText) {
       prompt += `
       PREVIOUS EXPLANATION (For context on what to change/improve):
       "${refinement.previousText.substring(0, 1000)}..." [truncated for brevity]
       
       Please adjust your output to address the user's specific comment while maintaining the configuration settings.
       `;
    } else {
       prompt += `
       Please ensure this specific instruction is prioritized in your explanation.
       `;
    }
  }

  const response = await ai.models.generateContent({
    model: modelId,
    contents: {
      role: 'user',
      parts: [filePart, { text: prompt }]
    }
  });

  return response.text || "Could not generate explanation.";
};

export const generateOverallSummary = async (tab: Tab, modelId: string): Promise<string> => {
  if (!tab.file) throw new Error("No file");
  
  const settings = tab.settings;
  const style = settings.style === 'Custom' ? settings.customStyle : settings.style;
  const lang = settings.language === 'Custom' ? settings.customLanguage : settings.language;

  let instructions = "";
  if (settings.checkboxes.instructions.fullPdf) instructions += `Instructions: ${settings.instructions}\n`;
  if (settings.checkboxes.style.fullPdf) instructions += `Style: ${style}\n`;
  if (settings.checkboxes.language.fullPdf) instructions += `Language: ${lang}\n`;

  const filePart = await fileToPart(tab.file);
  const prompt = `
    Generate a comprehensive Overall Summary of this entire document.
    
    CONFIGURATION:
    ${instructions}
    
    Include main sections, key points, and important pages to look at.
    Format with Markdown.
    CRITICAL: Do NOT include any images, <img> tags, or markdown image links in your response. Describe visual elements textually only.
  `;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: {
      role: 'user',
      parts: [filePart, { text: prompt }]
    }
  });

  return response.text || "Could not generate summary.";
};

export const sendChatMessage = async (
  tab: Tab,
  mode: ChatMode,
  userMessage: string,
  history: ChatMessage[],
  useSearch: boolean,
  modelId: string,
  generateImageConfig?: { prompt: string, size: '1K' | '2K' | '4K' }
): Promise<string | { text?: string, images?: string[] }> => {

  // 1. Handle Image Generation Request
  if (generateImageConfig) {
    // Check if we need to use the image model
    const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: { parts: [{ text: generateImageConfig.prompt }] },
        config: {
            imageConfig: {
                imageSize: generateImageConfig.size,
                aspectRatio: "1:1" // Default
            }
        }
    });

    const images: string[] = [];
    let text = "";

    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                images.push(part.inlineData.data);
            } else if (part.text) {
                text += part.text;
            }
        }
    }
    return { text: text || "Here is your generated image.", images };
  }


  // 2. Handle Text Chat
  const settings = tab.settings;
  const style = settings.style === 'Custom' ? settings.customStyle : settings.style;
  const lang = settings.language === 'Custom' ? settings.customLanguage : settings.language;

  let configInstructions = "";
  const appendSettings = (scope: keyof SettingScope) => {
    if (settings.checkboxes.instructions[scope]) configInstructions += `Instructions: ${settings.instructions}\n`;
    if (settings.checkboxes.style[scope]) configInstructions += `Style: ${style}\n`;
    if (settings.checkboxes.language[scope]) configInstructions += `Language: ${lang}\n`;
  };

  let parts: any[] = [{ text: userMessage }];
  let systemInstruction = "You are a helpful PDF assistant. Do not generate fake image URLs.";
  let tools: any[] = [];

  if (useSearch) {
    tools.push({ googleSearch: {} });
  }

  if (mode === 'general') {
    appendSettings('general');
    systemInstruction += "\n" + configInstructions;
  } else if (tab.file) {
    const filePart = await fileToPart(tab.file);
    
    if (mode === 'full-pdf') {
       appendSettings('fullPdf');
       systemInstruction += `\n${configInstructions}\nAnswer based on the entire PDF document attached.`;
       parts = [filePart, { text: userMessage }];
    } else if (mode === 'page-context') {
       appendSettings('page');
       systemInstruction += `\n${configInstructions}\nAnswer based on PAGE ${tab.currentPage} of the PDF document attached. The user is specifically asking about this page.`;
       parts = [filePart, { text: `[Focus on Page ${tab.currentPage}] ${userMessage}` }];
    }
  }

  const historyParts = history.slice(-6).map(m => ({
    role: m.role,
    parts: [{ text: m.content }]
  }));

  try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: [...historyParts, { role: 'user', parts }],
        config: {
          systemInstruction,
          tools,
        }
      });
      
      let text = response.text || "";
      
      // Handle grounding
      if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
          const chunks = response.candidates[0].groundingMetadata.groundingChunks;
          const links = chunks
            .map((c: any) => c.web?.uri ? `[${c.web.title || 'Source'}](${c.web.uri})` : null)
            .filter(Boolean)
            .join(', ');
          if (links) {
              text += `\n\nSources: ${links}`;
          }
      }

      return text;

  } catch (e) {
      console.error("Chat error", e);
      throw e;
  }
};
