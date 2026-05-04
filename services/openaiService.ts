import OpenAI from 'openai';
import { SearchResult } from '../types';
import { format } from 'prettier/standalone';
import parserBabel from 'prettier/plugins/babel';
import parserEstree from 'prettier/plugins/estree';
import parserHtml from 'prettier/plugins/html';
import parserPostcss from 'prettier/plugins/postcss';
import parserMarkdown from 'prettier/plugins/markdown';

const getClient = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OpenAI API Key is missing. Please set VITE_OPENAI_API_KEY in .env or provide it in the UI.');
  }
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
};

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
  const openai = getClient();
  const prompt = `You are an expert automated code repair tool for ${language}.
  
  Here is the broken code:
  \`\`\`${language}
  ${code}
  \`\`\`

  ${errorMessage ? `The error reported is: ${errorMessage}` : 'Find and fix any logical, syntactical, or security errors.'}

  Return ONLY the fixed code. Do not add markdown backticks. Do not add explanations. Just the raw corrected code string.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }]
  });

  let fixed = response.choices[0].message?.content || code;
  fixed = fixed.replace(/^```[a-z]*\n/i, '').replace(/```$/, '');
  return await formatCode(fixed.trim(), language);
};

export const runCodeSimulation = async (code: string, language: string, command: string) => {
  const openai = getClient();
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

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }]
  });

  return response.choices[0].message?.content || '';
};

export const chatWithOpenAI = async (
  prompt: string, 
  mode: 'standard' | 'thinking' | 'search' | 'maps' | 'fast',
  attachments: { base64: string, mimeType: string }[] = [],
  contextCode?: string,
  extraContext?: string
) => {
  const openai = getClient();
  let model = 'gpt-4o';
  
  if (mode === 'fast') {
    model = 'gpt-4o-mini';
  } else if (mode === 'thinking') {
    model = 'o3-mini';
  }

  const systemInstruction = `You are an expert developer assistant. 
  Current project context: ${extraContext || 'No extra context provided.'}
  Active file code:
  \`\`\`
  ${contextCode}
  \`\`\`
  You can use tools to manipulate files when requested.`;

  const messages: any[] = [];
  
  if (model !== 'o3-mini') {
    messages.push({ role: 'system', content: systemInstruction });
  }

  let content: any[] = [];
  if (attachments.length > 0) {
    content = attachments.map(a => {
      if (a.mimeType.startsWith('image/')) {
        return {
          type: 'image_url',
          image_url: { url: `data:${a.mimeType};base64,${a.base64}` }
        };
      }
      return null;
    }).filter(Boolean);
  }
  content.push({ type: 'text', text: prompt });
  
  messages.push({ role: 'user', content });

  const tools: any = [
    {
      type: 'function',
      function: {
        name: 'write_file',
        description: 'Create or update a file in the project.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'The filename with extension.' },
            content: { type: 'string', description: 'The full content of the file.' },
            language: { type: 'string', description: 'The language (html, css, javascript, typescript, json, python, etc.)' }
          },
          required: ['name', 'content', 'language']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'delete_file',
        description: 'Delete a file from the project.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'The filename to delete.' }
          },
          required: ['name']
        }
      }
    }
  ];

  const params: any = {
    model,
    messages
  };

  // o3 models do not currently support system messages with tools properly, or they have different tool usage
  if (model !== 'o3-mini') {
    params.tools = tools;
  }

  const response = await openai.chat.completions.create(params);
  
  const msg = response.choices[0].message;
  let text = msg?.content || '';
  
  let toolCalls = null;
  if (msg?.tool_calls) {
    toolCalls = msg.tool_calls.map(tc => ({
      functionCall: {
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments)
      }
    }));
  }

  return { text, toolCalls };
};

export const searchWeb = async (query: string): Promise<SearchResult[]> => {
  return [{ 
    title: "Search via OpenAI unavailable natively", 
    url: "", 
    snippet: "Consider implementing a third-party search API like Tavily or Serper if required." 
  }];
};

export const readPageContent = async (url: string): Promise<string> => {
  return "Reading live pages is generally restricted in standard models unless via browsing plugins.";
};

export const generateProject = async (prompt: string): Promise<any[]> => {
  const openai = getClient();
  const systemPrompt = `You are an expert AI software engineer. Generate an entire project based on: "${prompt}".
Generate the complete list of files needed for this project.

Return a valid JSON array of objects MUST matching:
[
  { "name": "index.html", "language": "html", "content": "..." },
  { "name": "script.js", "language": "javascript", "content": "..." }
]

IMPORTANT: ONLY output the JSON array, no markdown fences with \`\`\`json, NO EXPLANATIONS.
Ensure JSON format is robust.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'system', content: systemPrompt }]
  });

  let text = response.choices[0].message?.content || "[]";
  text = text.replace(/^```json\n?/i, '').replace(/```$/i, '').trim();
  
  try {
     const files = JSON.parse(text);
     return files;
  } catch(e) {
     throw new Error("Failed to parse project JSON. AI output might be malformed.");
  }
};

export const transcribeAudio = async (audioBase64: string) => {
  const openai = getClient();
  
  // Convert base64 to File
  const byteCharacters = atob(audioBase64);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  const blob = new Blob(byteArrays, { type: 'audio/wav' });
  const file = new File([blob], 'audio.wav', { type: 'audio/wav' });

  const response = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
  });
  return response.text;
};

export const generateImage = async (
  prompt: string, 
  options: { 
    aspectRatio?: string, 
    imageSize?: string,
    sourceImage?: string 
  }
) => {
  const openai = getClient();
  
  if (options.sourceImage) {
    throw new Error("OpenAI DALL-E 3 doesn't natively support base64 edit via this simple SDK pattern without masks. Use general generate.");
  }

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024', // DALL-E 3 supports 1024x1024, 1024x1792, 1792x1024
    response_format: 'b64_json'
  });
  
  return response.data[0].b64_json;
};

export const generateVideo = async (
  prompt: string,
  options: { aspectRatio: string }
) => {
  throw new Error("OpenAI Sora API is not yet publicly available for straightforward integration.");
};

export const connectLive = async (
  onAudioData: (base64: string) => void,
  onCodeUpdate: (code: string) => void,
  onClose: () => void
) => {
  // Mocking Live connection or implement simple WebRTC. OpenAI Realtime API requires ws.
  throw new Error("Live realtime API integration is complex and currently mocked. Please use chat.");
};
