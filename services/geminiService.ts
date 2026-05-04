import { GoogleGenAI, Modality, Type, FunctionDeclaration, LiveServerMessage } from "@google/genai";
import { SearchResult } from "../types";

// Prettier Imports
import { format } from "prettier/standalone";
import parserBabel from "prettier/plugins/babel";
import parserEstree from "prettier/plugins/estree";
import parserHtml from "prettier/plugins/html";
import parserPostcss from "prettier/plugins/postcss";
import parserMarkdown from "prettier/plugins/markdown";

// -- Helpers --

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing");
  return new GoogleGenAI({ apiKey });
};

const getPaidClient = async () => {
  // @ts-ignore
  if (window.aistudio && window.aistudio.hasSelectedApiKey && window.aistudio.openSelectKey) {
     // @ts-ignore
     const hasKey = await window.aistudio.hasSelectedApiKey();
     if (!hasKey) {
         // @ts-ignore
         await window.aistudio.openSelectKey();
     }
  }
  // Create new instance to pick up the injected key
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// -- Code Utilities --

export const formatCode = async (code: string, language: string) => {
  try {
    let parser = '';
    let plugins: any[] = [];
    const l = language ? language.toLowerCase() : '';

    if (['js', 'javascript', 'ts', 'typescript', 'jsx', 'tsx', 'json'].includes(l)) {
      parser = l === 'json' ? 'json' : 'babel';
      plugins = [parserBabel, parserEstree];
    } else if (['html'].includes(l)) {
      parser = 'html';
      plugins = [parserHtml, parserBabel, parserPostcss, parserEstree];
    } else if (['css', 'scss', 'less'].includes(l)) {
      parser = 'css';
      plugins = [parserPostcss];
    } else if (['md', 'markdown'].includes(l)) {
      parser = 'markdown';
      plugins = [parserMarkdown, parserBabel, parserEstree];
    }

    if (parser) {
      const formatted = await format(code, {
        parser,
        plugins,
        printWidth: 80,
        tabWidth: 2,
        semi: true,
        singleQuote: false,
      });
      return formatted.trim();
    }
    return code;
  } catch (e) {
    return code;
  }
};

export const fixCode = async (code: string, language: string, errorMessage?: string) => {
    const ai = getClient();
    const prompt = `You are an expert automated code repair tool for ${language}.
    
    Here is the broken code:
    \`\`\`${language}
    ${code}
    \`\`\`

    ${errorMessage ? `The error reported is: ${errorMessage}` : 'Find and fix any logical, syntactical, or security errors.'}

    Return ONLY the fixed code. Do not add markdown backticks. Do not add explanations. Just the raw corrected code string.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] }
    });

    let fixed = response.text || code;
    // Clean up if model adds backticks despite instructions
    fixed = fixed.replace(/^```[a-z]*\n/i, '').replace(/```$/, '');
    
    // Auto-format the fixed code before returning
    return await formatCode(fixed.trim(), language);
};

export const runCodeSimulation = async (code: string, language: string, command: string) => {
    const ai = getClient();
    const prompt = `Act as a compiler/interpreter for ${language}. 
    User executed command: "${command}".
    
    Code to run:
    \`\`\`${language}
    ${code}
    \`\`\`

    Simulate the standard output (stdout) and standard error (stderr) of this code exactly as it would appear in a Linux terminal. 
    If there are compilation errors, show them realistically.
    If it runs successfully, show the output.
    Do NOT explain the code. ONLY output the console text.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', // Flash is fast enough for terminal emulation
        contents: { parts: [{ text: prompt }] }
    });

    return response.text || "";
};

// -- Chat & Text Features --

export const chatWithGemini = async (
  prompt: string, 
  mode: 'standard' | 'thinking' | 'search' | 'maps' | 'fast',
  attachments: { base64: string, mimeType: string }[] = [],
  contextCode?: string,
  extraContext?: string
) => {
  const ai = getClient();
  let model = 'gemini-3-flash-preview'; // Default for standard chat
  
  const tools: any[] = [];
  
  // Add File Operations Tools
  tools.push({
    functionDeclarations: [
      {
        name: 'write_file',
        description: 'Create or update a file in the project.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: 'The filename with extension.' },
            content: { type: Type.STRING, description: 'The full content of the file.' },
            language: { type: Type.STRING, description: 'The language (html, css, javascript, typescript, json, python, etc.)' }
          },
          required: ['name', 'content', 'language']
        }
      },
      {
        name: 'delete_file',
        description: 'Delete a file from the project.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: 'The filename to delete.' }
          },
          required: ['name']
        }
      }
    ]
  });

  const config: any = {
    systemInstruction: `You are an expert developer assistant. 
    Current project context: ${extraContext || 'No extra context provided.'}
    Active file code:
    \`\`\`
    ${contextCode}
    \`\`\`
    You can use the provided tools to directly manipulate the files in the editor when the user asks to "create", "write", "change", "update", or "fix" files.
    Always prioritize using tools for code changes instead of just printing code blocks if the user's intent is to modify the project.`,
    tools
  };

  if (mode === 'fast') {
    model = 'gemini-2.5-flash-lite-latest';
  } else if (mode === 'thinking') {
    model = 'gemini-3-pro-preview';
    config.thinkingConfig = { thinkingBudget: 32768 };
  } else if (mode === 'search') {
    model = 'gemini-3-pro-preview'; // Pro is better for search integration
    config.tools = [{ googleSearch: {} }];
  } else if (mode === 'maps') {
    model = 'gemini-2.5-flash'; // Maps currently supported on 2.5 Flash
    config.tools = [{ googleMaps: {} }];
    // Try to get location
    try {
      const pos: any = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          }
        }
      };
    } catch (e) {
      console.warn("Could not get location for Maps grounding");
    }
  }

  // Handle attachments
  let parts: any[] = [];
  
  if (attachments.length > 0) {
    // If audio is present, use Flash (multimodal efficiency)
    if (attachments.some(a => a.mimeType.startsWith('audio/'))) {
      model = 'gemini-2.5-flash-native-audio-preview-12-2025';
    } else if (attachments.some(a => a.mimeType.startsWith('image/')) && mode === 'standard') {
        // Use Pro for better image reasoning if in standard mode
        model = 'gemini-3-pro-preview';
    }
    
    parts = attachments.map(a => ({
      inlineData: {
        data: a.base64,
        mimeType: a.mimeType
      }
    }));
  }
  
  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model,
    contents: { parts },
    config
  });

  // Handle Tool Calls
  const toolCalls = response.candidates?.[0]?.content?.parts?.filter(p => p.functionCall);
  
  // Extract grounding metadata if present
  let text = response.text || "";
  const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (grounding) {
    const links = grounding
      .map((c: any) => c.web?.uri ? `[${c.web.title}](${c.web.uri})` : c.maps?.uri ? `[${c.maps.title}](${c.maps.uri})` : '')
      .filter(Boolean)
      .join('\n');
    if (links) text += `\n\nSources:\n${links}`;
  }

  return { text, toolCalls };
};

// -- Search Feature (For Browser Tabs) --

export const searchWeb = async (query: string): Promise<SearchResult[]> => {
  const ai = getClient();
  
  // Optimization: Use gemini-2.5-flash for extreme speed
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash', 
    contents: { parts: [{ text: `Find information about: "${query}"` }] },
    config: {
      tools: [{ googleSearch: {} }],
    }
  });

  // FAST PATH: Extract directly from Grounding Metadata (Real Google Results)
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const webResults = chunks
    .filter((c: any) => c.web)
    .map((c: any) => ({
        title: c.web.title,
        url: c.web.uri,
        snippet: "Google Search Result" // Flash grounding sometimes omits snippet in metadata to be fast, we use title
    }));

  if (webResults.length > 0) {
      return webResults;
  }

  // Fallback: If no metadata, try to parse text (slower, rare case with search tool)
  return [{
      title: "Generated Answer",
      url: "",
      snippet: response.text || "No direct results found."
  }];
};

export const readPageContent = async (url: string): Promise<string> => {
    const ai = getClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { 
            parts: [{ text: `Access this URL: ${url}. 
            Provide a SUPER DETAILED, EXTENSIVE, and COMPREHENSIVE reproduction of the content.
            I want a very long response that covers every detail, code block, and explanation found on the page.
            Do not summarize briefly; expand on the content as much as possible to be a full substitute for visiting the site.
            Format nicely in Markdown.` }] 
        },
        config: {
            tools: [{ googleSearch: {} }], // Search tool allows accessing fresh web content
        }
    });
    return response.text || "Could not read page content.";
};

export const generateProject = async (prompt: string): Promise<any[]> => {
  const ai = getClient();
  const systemPrompt = `You are an expert AI software engineer. The user wants you to generate an entire project based on their prompt: "${prompt}".
Generate the complete list of files needed for this project.

Return a valid JSON array of objects.
Each object MUST have the following schema:
{
  "name": "filename with extension (e.g., index.html, style.css, script.js)",
  "language": "html|css|javascript|typescript|json|markdown",
  "content": "The actual file content as a string"
}

IMPORTANT:
- ONLY output the JSON array, no markdown fences with \`\`\`json, NO EXPLANATIONS.
- Generate at least an index.html file that acts as the entry point.
- Write modern, production-ready code.
- Ensure all quotes and special characters in 'content' are properly escaped for JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [{ text: systemPrompt }] },
  });

  let text = response.text || "[]";
  text = text.replace(/^```json\n?/i, '').replace(/```$/i, '').trim();
  
  try {
     const files = JSON.parse(text);
     return files;
  } catch(e) {
     throw new Error("Failed to parse project JSON. AI output might be malformed.");
  }
};

// -- Audio Features --

export const transcribeAudio = async (audioBase64: string) => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    contents: {
      parts: [
        { inlineData: { mimeType: 'audio/wav', data: audioBase64 } },
        { text: "Transcribe this audio." }
      ]
    }
  });
  return response.text;
};

// -- Image Features --

export const generateImage = async (
  prompt: string, 
  options: { 
    aspectRatio?: string, 
    imageSize?: string,
    sourceImage?: string // Base64 for editing
  }
) => {
  // If editing (source image present), use 2.5 Flash Image
  if (options.sourceImage) {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: options.sourceImage } },
          { text: prompt }
        ]
      },
      config: {
         imageConfig: {
             aspectRatio: options.aspectRatio as any || "1:1"
         }
      }
    });
    // Extract image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return part.inlineData.data;
    }
    throw new Error("No image generated");
  } else {
    // Generation use 3 Pro Image (requires paid key logic)
    const ai = await getPaidClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: options.aspectRatio as any || "1:1",
          imageSize: options.imageSize as any || "1K"
        }
      }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return part.inlineData.data;
    }
    throw new Error("No image generated from API response");
  }
};

// -- Video Features --

export const generateVideo = async (
  prompt: string,
  options: { aspectRatio: string }
) => {
  const ai = await getPaidClient();
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    config: {
      numberOfVideos: 1,
      aspectRatio: options.aspectRatio as any,
      resolution: '720p'
    }
  });

  // Polling with recommended delay
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10s delay as per guidelines
    operation = await ai.operations.getVideosOperation({ operation });
  }

  const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!uri) throw new Error("Video generation failed or still processing");
  
  // Fetch with API key appended
  const response = await fetch(`${uri}&key=${process.env.API_KEY}`);
  if (!response.ok) throw new Error("Failed to download video blob");
  
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

// -- Live API --

export const connectLive = async (
    onAudioData: (base64: string) => void,
    onCodeUpdate: (code: string) => void,
    onClose: () => void
) => {
    const ai = getClient();
    // Audio Context Setup
    const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    // Setup Input Stream
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = inputAudioContext.createMediaStreamSource(stream);
    const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    // Define Tools
    const updateCodeTool: FunctionDeclaration = {
        name: 'update_code',
        description: 'Overwrite the current file content with new code. Use this when the user asks to write, change, or fix code.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                code: { type: Type.STRING, description: 'The complete code content to write.' }
            },
            required: ['code']
        }
    };

    // Connect to Live API
    const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
            onopen: () => {
                scriptProcessor.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    // Convert Float32 to PCM Int16
                    const l = inputData.length;
                    const int16 = new Int16Array(l);
                    for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
                    const bytes = new Uint8Array(int16.buffer);
                    let binary = '';
                    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
                    const base64Data = btoa(binary);

                    sessionPromise.then(session => {
                        session.sendRealtimeInput({
                            media: {
                                mimeType: 'audio/pcm;rate=16000',
                                data: base64Data
                            }
                        });
                    });
                };
                source.connect(scriptProcessor);
                scriptProcessor.connect(inputAudioContext.destination);
            },
            onmessage: (msg: LiveServerMessage) => {
                // Handle Audio Output
                const data = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (data) {
                    onAudioData(data);
                    // Play audio
                    const binaryString = atob(data);
                    const len = binaryString.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
                    
                    // Simple decode and play
                    const ctx = outputAudioContext;
                    const dataInt16 = new Int16Array(bytes.buffer);
                    const float32 = new Float32Array(dataInt16.length);
                    for(let i=0; i<dataInt16.length; i++) float32[i] = dataInt16[i] / 32768.0;
                    
                    const buffer = ctx.createBuffer(1, float32.length, 24000);
                    buffer.copyToChannel(float32, 0);
                    
                    const node = ctx.createBufferSource();
                    node.buffer = buffer;
                    node.connect(ctx.destination);
                    node.start();
                }

                // Handle Tool Calls
                if (msg.toolCall) {
                    msg.toolCall.functionCalls.forEach(fc => {
                        if (fc.name === 'update_code') {
                            const args = fc.args as any;
                            if (args.code) {
                                onCodeUpdate(args.code);
                            }
                            // Respond to tool call
                            sessionPromise.then(session => session.sendToolResponse({
                                functionResponses: [{
                                    id: fc.id,
                                    name: fc.name,
                                    response: { result: 'Code updated successfully' }
                                }]
                            }));
                        }
                    });
                }
            },
            onclose: onClose,
            onerror: (e) => { console.error(e); onClose(); }
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
            },
            systemInstruction: "You are an expert coding assistant. You can hear the user and update their code in real-time. When asked to write code, use the update_code tool.",
            tools: [{ functionDeclarations: [updateCodeTool] }]
        }
    });

    return {
        disconnect: () => {
            sessionPromise.then(s => s.close());
            inputAudioContext.close();
            outputAudioContext.close();
            stream.getTracks().forEach(t => t.stop());
        }
    };
};