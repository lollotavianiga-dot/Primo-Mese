import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, X, Loader2, Image as ImageIcon, Video, Mic, Paperclip, Trash2, Copy, Terminal, Zap, Search, MapPin, Brain, Layers, Users, LogOut, MessageSquare, Link, FileCode2 } from 'lucide-react';
import { chatWithGemini, generateImage, generateVideo, connectLive, transcribeAudio, formatCode, generateProject } from '../services/geminiService';
import { ChatMessage, ChatMode, AspectRatio, ImageSize, User as UserType, VirtualFile } from '../types';
import Logo from './Logo';

interface AIAssistantProps {
  currentCode: string;
  files: VirtualFile[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateCode: (code: string) => void;
  onReplaceFiles?: (files: any[]) => void;
  user: UserType;
}

interface CollabMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

// Component to handle async code formatting
const CodeBlock: React.FC<{ code: string; lang: string }> = ({ code, lang }) => {
  const [formattedCode, setFormattedCode] = useState(code);

  useEffect(() => {
    let mounted = true;
    formatCode(code, lang).then(formatted => {
        if (mounted) setFormattedCode(formatted);
    });
    return () => { mounted = false; };
  }, [code, lang]);

  return (
    <div className="my-2 bg-[#1e1e1e] border border-gray-700 rounded-md overflow-hidden shadow-sm group">
       <div className="bg-[#252526] px-3 py-1.5 text-xs text-gray-400 flex justify-between items-center border-b border-gray-700">
          <span className="font-mono uppercase text-[10px]">{lang || 'CODE'}</span>
          <button 
            onClick={() => navigator.clipboard.writeText(formattedCode)}
            className="flex items-center gap-1 hover:text-white transition-colors"
            title="Copy code"
          >
            <Copy size={10} />
            <span>Copy</span>
          </button>
       </div>
       <pre className="p-3 overflow-x-auto text-xs font-mono text-blue-300 custom-scrollbar">
         {formattedCode}
       </pre>
    </div>
  );
};

// Simple formatter for code blocks
const MessageContent: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return (
    <div className="text-sm leading-relaxed space-y-2">
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Extract language if present
          const match = part.match(/^```(\w*)\n/);
          const lang = match ? match[1] : '';
          const content = part.replace(/^```\w*\n?/, '').replace(/```$/, '');
          return <CodeBlock key={i} code={content} lang={lang} />;
        }
        // Basic bold parsing (**text**)
        const textParts = part.split(/(\*\*.*?\*\*)/g);
        return (
            <span key={i}>
                {textParts.map((t, j) => {
                    if (t.startsWith('**') && t.endsWith('**')) {
                        return <strong key={j} className="text-blue-200 font-semibold">{t.slice(2, -2)}</strong>;
                    }
                    return t;
                })}
            </span>
        );
      })}
    </div>
  );
};

const AIAssistant: React.FC<AIAssistantProps> = ({ currentCode, files, isOpen, onClose, onUpdateCode, onReplaceFiles, user }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'create' | 'live' | 'share'>('chat');
  
  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: '1', role: 'model', text: 'Hi! I am your Gemini Copilot. How can I help with your code today?' }]);
  const [input, setInput] = useState('');
  const [chatMode, setChatMode] = useState<ChatMode>('standard');
  const [attachment, setAttachment] = useState<{base64: string, mimeType: string} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Create State
  const [createType, setCreateType] = useState<'image' | 'video' | 'animation' | 'project'>('image');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [editImage, setEditImage] = useState<string | null>(null);
  const [generatedMedia, setGeneratedMedia] = useState<{type: 'image'|'video', url: string} | null>(null);
  const [generatedAnimation, setGeneratedAnimation] = useState<string | null>(null);

  // Animation Controls State
  const [animDuration, setAnimDuration] = useState(1.5);
  const [animEasing, setAnimEasing] = useState('ease-in-out');
  const [animIteration, setAnimIteration] = useState('infinite');

  // Live State
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const liveSessionRef = useRef<any>(null);

  // Share/Collab State
  const [isSharing, setIsSharing] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [joinId, setJoinId] = useState('');
  const [collabMessages, setCollabMessages] = useState<CollabMessage[]>([]);
  const [collabInput, setCollabInput] = useState('');
  const channelRef = useRef<BroadcastChannel | null>(null);
  const isRemoteUpdate = useRef(false);
  const collabScrollRef = useRef<HTMLDivElement>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, activeTab]);

  useEffect(() => {
      if (collabScrollRef.current) collabScrollRef.current.scrollTop = collabScrollRef.current.scrollHeight;
  }, [collabMessages, activeTab]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // --- COLLAB LOGIC ---

  // Handle incoming messages
  // We use useEffect to ensure the event listener always has access to the latest currentCode and onUpdateCode
  useEffect(() => {
    if (!isSharing || !channelRef.current) return;
    const channel = channelRef.current;

    const handleMessage = (event: MessageEvent) => {
        const { type, payload } = event.data;
        
        if (type === 'code_update') {
            // Check if content is different to avoid redundancy and loops
            if (payload.code !== currentCode) {
                isRemoteUpdate.current = true;
                onUpdateCode(payload.code);
            }
        } else if (type === 'chat_message') {
            setCollabMessages(prev => [...prev, payload]);
        } else if (type === 'user_joined') {
             setCollabMessages(prev => [...prev, {
                 id: Date.now().toString(),
                 sender: 'System',
                 text: `${payload.username} joined the session`,
                 timestamp: new Date().toLocaleTimeString(),
                 isSystem: true
             }]);
        }
    };

    channel.addEventListener('message', handleMessage);
    return () => {
        channel.removeEventListener('message', handleMessage);
    };
  }, [isSharing, currentCode, onUpdateCode]);

  // Broadcast local changes
  useEffect(() => {
      if (isSharing && channelRef.current) {
          if (isRemoteUpdate.current) {
              isRemoteUpdate.current = false;
          } else {
              channelRef.current.postMessage({
                  type: 'code_update',
                  payload: { code: currentCode }
              });
          }
      }
  }, [currentCode, isSharing]);

  const startSession = () => {
      const newId = Math.random().toString(36).substring(2, 9);
      setSessionId(newId);
      connectToChannel(newId);
  };

  const joinSession = () => {
      if (!joinId.trim()) return;
      setSessionId(joinId);
      connectToChannel(joinId);
  };

  const connectToChannel = (id: string) => {
      if (channelRef.current) channelRef.current.close();
      
      const channel = new BroadcastChannel(`devbrowser_collab_${id}`);
      channelRef.current = channel;
      setIsSharing(true);
      
      // Announce join
      channel.postMessage({
          type: 'user_joined',
          payload: { username: user.username }
      });
      
      setCollabMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'System',
          text: `Session started. ID: ${id}`,
          timestamp: new Date().toLocaleTimeString(),
          isSystem: true
      }]);
  };

  const disconnectSession = () => {
      if (channelRef.current) {
          channelRef.current.close();
          channelRef.current = null;
      }
      setIsSharing(false);
      setSessionId('');
      setJoinId('');
      setCollabMessages([]);
  };

  const sendCollabMessage = () => {
      if (!collabInput.trim() || !channelRef.current) return;
      
      const msg: CollabMessage = {
          id: Date.now().toString(),
          sender: user.username,
          text: collabInput,
          timestamp: new Date().toLocaleTimeString()
      };
      
      setCollabMessages(prev => [...prev, msg]);
      channelRef.current.postMessage({
          type: 'chat_message',
          payload: msg
      });
      setCollabInput('');
  };

  // --- STANDARD LOGIC ---

  const processFile = (file: File) => {
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          if (activeTab === 'create' && createType === 'image') {
              setEditImage(base64);
          } else {
              setAttachment({ base64, mimeType: file.type });
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('audio/'))) {
        processFile(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
            e.preventDefault();
            const file = item.getAsFile();
            if (file) processFile(file);
            return;
        }
    }
  };

  const handleSendMessage = async () => {
    if ((!input.trim() && !attachment) || isProcessing) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      image: attachment?.mimeType.startsWith('image') ? attachment.base64 : undefined
    };
    setMessages(p => [...p, userMsg]);
    setInput('');
    setAttachment(null);
    setIsProcessing(true);

    try {
      if (attachment?.mimeType.startsWith('audio')) {
         const transcript = await transcribeAudio(attachment.base64);
         setMessages(p => [...p, { id: Date.now().toString(), role: 'model', text: `Transcription: ${transcript}` }]);
      } else {
         const fileContext = files.map(f => `File: ${f.name}\nLanguage: ${f.language}\nSize: ${f.content.length} chars`).join('\n---\n');
         const response = await chatWithGemini(userMsg.text, chatMode, attachment ? [attachment] : [], currentCode, fileContext);
         
         const { text, toolCalls } = response as any;

         // Handle Tool Calls if any
         if (toolCalls && toolCalls.length > 0 && onReplaceFiles) {
             let updatedFiles = [...files];
             let actions: string[] = [];

             for (const call of toolCalls) {
                 if (call.functionCall.name === 'write_file') {
                     const { name, content, language } = call.functionCall.args as any;
                     const existingIdx = updatedFiles.findIndex(f => f.name === name);
                     if (existingIdx >= 0) {
                        updatedFiles[existingIdx] = { ...updatedFiles[existingIdx], content, language: language || updatedFiles[existingIdx].language };
                        actions.push(`Updated ${name}`);
                     } else {
                        updatedFiles.push({ name, content, language: language || 'text', type: 'file' });
                        actions.push(`Created ${name}`);
                     }
                 } else if (call.functionCall.name === 'delete_file') {
                     const { name } = call.functionCall.args as any;
                     updatedFiles = updatedFiles.filter(f => f.name !== name);
                     actions.push(`Deleted ${name}`);
                 }
             }

             onReplaceFiles(updatedFiles);
             
             const systemNote = actions.length > 0 
                ? `\n\n*Actions performed:*  \n${actions.map(a => `- ${a}`).join('\n')}` 
                : '';
             
             setMessages(p => [...p, { id: Date.now().toString(), role: 'model', text: text + systemNote }]);
         } else {
            setMessages(p => [...p, { id: Date.now().toString(), role: 'model', text }]);
         }
      }
    } catch (e: any) {
       setMessages(p => [...p, { id: Date.now().toString(), role: 'model', text: "Error: " + e.message, isError: true }]);
    } finally {
       setIsProcessing(false);
    }
  };

  const handleCreate = async () => {
      if (!prompt.trim()) return;
      setIsProcessing(true);
      setGeneratedMedia(null);
      setGeneratedAnimation(null);

      try {
          if (createType === 'image') {
              const b64 = await generateImage(prompt, { aspectRatio, imageSize, sourceImage: editImage || undefined });
              setGeneratedMedia({ type: 'image', url: `data:image/png;base64,${b64}` });
          } else if (createType === 'video') {
              const url = await generateVideo(prompt, { aspectRatio });
              setGeneratedMedia({ type: 'video', url });
          } else if (createType === 'animation') {
              // Use chat service for code generation
              const animationPrompt = `Generate a modern CSS animation (keyframes and class) for: ${prompt}. 
              
              Strict configuration:
              - duration: ${animDuration}s
              - timing-function: ${animEasing}
              - iteration-count: ${animIteration}
              
              You MUST wrap the CSS code in \`\`\`css ... \`\`\` blocks.`;
              
              const response = await chatWithGemini(animationPrompt, 'standard');
              const responseText = (response as any).text;
              
              // Improved Extraction Logic: Find the CSS block specifically
              const cssMatch = responseText.match(/```css([\s\S]*?)```/);
              if (cssMatch && cssMatch[1]) {
                  const rawCss = cssMatch[1].trim();
                  // Format the CSS before setting state
                  const formatted = await formatCode(rawCss, 'css');
                  setGeneratedAnimation(formatted);
              } else {
                  // Fallback: Try to remove generic markdown ticks if no language specified
                  setGeneratedAnimation(responseText.replace(/```/g, '').trim());
              }
          } else if (createType === 'project') {
              if (!onReplaceFiles) throw new Error("Project generation not supported here");
              const generatedFiles = await generateProject(prompt);
              onReplaceFiles(generatedFiles);
              setActiveTab('chat');
              setMessages(p => [...p, {
                  id: Date.now().toString(),
                  role: 'model',
                  text: `**Project Generated:** Successfully created a new codebase based on your prompt.`
              }]);
          }
          // Switch to chat tab to show error if something major fails
          setMessages(p => [...p, { 
              id: Date.now().toString(), 
              role: 'model', 
              text: `**Generation Failed:** ${e.message}. \n\n*Tip: For High-Res Images and Video, a paid API key is required via AI Studio.*`, 
              isError: true 
          }]);
          setActiveTab('chat');
      } finally {
          setIsProcessing(false);
      }
  };

  const toggleLive = async () => {
      if (isLiveConnected) {
          liveSessionRef.current?.disconnect();
          setIsLiveConnected(false);
      } else {
          try {
              liveSessionRef.current = await connectLive(
                  (audioData) => { /* Audio handling handled in service */ },
                  (code) => onUpdateCode(code),
                  () => setIsLiveConnected(false)
              );
              setIsLiveConnected(true);
          } catch (e) {
              console.error(e);
              alert("Failed to connect. Ensure permissions are granted.");
          }
      }
  };

  if (!isOpen) return null;

  return (
    <div className="w-96 h-full bg-[#1e1e1e] border-l border-gray-700 flex flex-col shadow-2xl absolute right-0 top-0 z-30 font-sans text-gray-300 transition-transform duration-300 ease-in-out">
      
      {/* Header */}
      <div className="h-12 border-b border-gray-700 flex items-center justify-between px-4 bg-[#252526] select-none">
        <div className="flex items-center gap-2 font-semibold text-gray-100">
            <Logo className="text-blue-500" size={18} />
            <span className="tracking-tight">Deploy Studio</span>
        </div>
        <button onClick={onClose} className="hover:text-white transition-colors"><X size={18} /></button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 bg-[#252526] p-1 gap-1">
          {['chat', 'create', 'live', 'share'].map((t) => (
              <button 
                key={t}
                onClick={() => setActiveTab(t as any)}
                className={`flex-1 py-1.5 text-xs font-medium rounded capitalize transition-all ${
                    activeTab === t 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                  {t}
              </button>
          ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col bg-[#1e1e1e]">
          
          {/* --- CHAT TAB --- */}
          {activeTab === 'chat' && (
              <>
                 {/* Chat Messages */}
                 <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar" ref={scrollRef}>
                    {messages.map((m, idx) => (
                        <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-400 border border-white/5'}`}>
                                {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div className={`flex flex-col max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm ${
                                    m.role === 'user' 
                                    ? 'bg-blue-600 text-white rounded-tr-sm' 
                                    : 'bg-[#2a2a2a] border border-gray-700 rounded-tl-sm'
                                }`}>
                                    {m.image && (
                                        <div className="mb-2 rounded-lg overflow-hidden border border-white/10">
                                            <img src={`data:image/png;base64,${m.image}`} alt="attachment" className="max-w-full" />
                                        </div>
                                    )}
                                    <MessageContent text={m.text} />
                                </div>
                                {m.isError && <span className="text-xs text-red-400 mt-1">Failed to send</span>}
                            </div>
                        </div>
                    ))}
                    {isProcessing && (
                        <div className="flex gap-3 animate-pulse">
                             <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center">
                                 <Bot size={16} className="text-gray-500" />
                             </div>
                             <div className="bg-[#2a2a2a] px-4 py-3 rounded-2xl rounded-tl-sm border border-gray-700">
                                 <div className="flex gap-1">
                                     <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                     <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                     <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                 </div>
                             </div>
                        </div>
                    )}
                 </div>

                 {/* Settings / Mode Toolbar */}
                 <div className="px-3 py-2 border-t border-gray-700 bg-[#252526]">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {[
                            { id: 'standard', icon: Bot, label: 'Chat' },
                            { id: 'thinking', icon: Brain, label: 'Think' },
                            { id: 'search', icon: Search, label: 'Web' },
                            { id: 'maps', icon: MapPin, label: 'Maps' },
                            { id: 'fast', icon: Zap, label: 'Fast' }
                        ].map(mode => (
                            <button 
                                key={mode.id}
                                onClick={() => setChatMode(mode.id as ChatMode)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap border transition-all ${
                                    chatMode === mode.id 
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-sm' 
                                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                                }`}
                            >
                                <mode.icon size={12} />
                                {mode.label}
                            </button>
                        ))}
                    </div>
                 </div>

                 {/* Input Area */}
                 <div 
                    className="p-3 border-t border-gray-700 bg-[#1e1e1e] relative"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                 >
                    {isDragging && (
                        <div className="absolute inset-0 bg-blue-500/10 z-20 flex items-center justify-center backdrop-blur-[1px] border-2 border-dashed border-blue-500/50 m-2 rounded-xl pointer-events-none">
                            <div className="bg-[#1e1e1e] text-blue-400 px-4 py-2 rounded-full shadow-xl flex items-center gap-2 font-medium text-sm border border-blue-500/20">
                                <Paperclip size={16} />
                                Drop to attach
                            </div>
                        </div>
                    )}
                    
                    {attachment && (
                        <div className="mb-2 flex items-center gap-2 bg-gray-800 border border-gray-700 p-2 rounded-md text-xs animate-in slide-in-from-bottom-2">
                            <Paperclip size={12} className="text-blue-400" />
                            <span className="truncate flex-1 font-mono">{attachment.mimeType}</span>
                            <button onClick={() => setAttachment(null)} className="hover:text-red-400"><X size={14} /></button>
                        </div>
                    )}
                    <div className="flex gap-2 items-end">
                        <button 
                            onClick={() => fileInputRef.current?.click()} 
                            className="p-2.5 text-gray-400 hover:text-white bg-[#2a2a2a] border border-gray-700 rounded-xl hover:bg-gray-700 transition-colors mb-[1px]"
                            title="Attach Image/Audio"
                        >
                            <Paperclip size={18} />
                        </button>
                        <div className="flex-1 relative">
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => {
                                    if(e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                onPaste={handlePaste}
                                placeholder="Message Gemini..."
                                className="w-full bg-[#2a2a2a] border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 resize-none custom-scrollbar leading-relaxed"
                                style={{ minHeight: '46px', maxHeight: '150px' }}
                                rows={1}
                            />
                        </div>
                        <button 
                           onClick={handleSendMessage} 
                           disabled={isProcessing || (!input.trim() && !attachment)}
                           className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-900/20 mb-[1px]"
                        >
                           {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                    </div>
                    <div className="text-[10px] text-gray-600 text-center mt-2">
                        Gemini can make mistakes. Check important info.
                    </div>
                 </div>
              </>
          )}

          {/* --- CREATE TAB --- */}
          {activeTab === 'create' && (
              <div className="p-4 flex flex-col h-full overflow-y-auto custom-scrollbar">
                 <div className="bg-[#2a2a2a] p-1 rounded-xl mb-6 grid grid-cols-4 gap-1 border border-gray-700 text-xs">
                     <button 
                        onClick={() => { setCreateType('project'); setGeneratedMedia(null); setGeneratedAnimation(null); }} 
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg font-medium transition-all ${createType === 'project' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                     >
                         <FileCode2 size={14} /> App
                     </button>
                     <button 
                        onClick={() => { setCreateType('image'); setGeneratedMedia(null); setGeneratedAnimation(null); }} 
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg font-medium transition-all ${createType === 'image' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                     >
                         <ImageIcon size={14} /> Image
                     </button>
                     <button 
                        onClick={() => { setCreateType('video'); setGeneratedMedia(null); setGeneratedAnimation(null); }}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg font-medium transition-all ${createType === 'video' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                     >
                         <Video size={14} /> Video
                     </button>
                     <button 
                        onClick={() => { setCreateType('animation'); setGeneratedMedia(null); setGeneratedAnimation(null); }}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg font-medium transition-all ${createType === 'animation' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                     >
                         <Layers size={14} /> CSS
                     </button>
                 </div>

                 <div className="space-y-4">
                     <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Prompt</label>
                        <textarea
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            placeholder={createType === 'project' ? "e.g., A complete React app with a calculator" : createType === 'animation' ? "e.g., A bouncing button effect with a glow" : `Describe the ${createType} in detail...`}
                            className="w-full bg-[#2a2a2a] border border-gray-700 rounded-xl p-3 text-sm text-white h-32 resize-none focus:border-blue-500 outline-none transition-colors"
                        />
                     </div>

                     {createType !== 'animation' && createType !== 'project' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Aspect Ratio</label>
                                <select 
                                    value={aspectRatio} 
                                    onChange={e => setAspectRatio(e.target.value as any)}
                                    className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                                >
                                    {['1:1','16:9','9:16','4:3','3:4'].map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            {createType === 'image' && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Resolution</label>
                                    <select 
                                        value={imageSize}
                                        onChange={e => setImageSize(e.target.value as any)}
                                        className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                                    >
                                        <option value="1K">1K (Standard)</option>
                                        <option value="2K">2K (HD)</option>
                                        <option value="4K">4K (Ultra)</option>
                                    </select>
                                </div>
                            )}
                        </div>
                     )}

                     {createType === 'animation' && (
                        <div className="grid grid-cols-2 gap-4 bg-[#2a2a2a] p-3 rounded-xl border border-gray-700">
                             <div className="col-span-2">
                                 <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</label>
                                    <span className="text-xs font-mono text-blue-400">{animDuration}s</span>
                                 </div>
                                 <input 
                                    type="range" 
                                    min="0.1" 
                                    max="5" 
                                    step="0.1" 
                                    value={animDuration} 
                                    onChange={e => setAnimDuration(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                 />
                             </div>
                             <div>
                                 <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Easing</label>
                                 <select 
                                    value={animEasing} 
                                    onChange={e => setAnimEasing(e.target.value)}
                                    className="w-full bg-[#1e1e1e] border border-gray-600 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                                 >
                                     <option value="linear">Linear</option>
                                     <option value="ease">Ease</option>
                                     <option value="ease-in">Ease In</option>
                                     <option value="ease-out">Ease Out</option>
                                     <option value="ease-in-out">Ease In Out</option>
                                     <option value="steps(4)">Steps(4)</option>
                                 </select>
                             </div>
                             <div>
                                 <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Repeat</label>
                                 <select 
                                    value={animIteration} 
                                    onChange={e => setAnimIteration(e.target.value)}
                                    className="w-full bg-[#1e1e1e] border border-gray-600 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                                 >
                                     <option value="infinite">Infinite</option>
                                     <option value="1">Once</option>
                                     <option value="2">Twice</option>
                                     <option value="3">3 Times</option>
                                 </select>
                             </div>
                        </div>
                     )}

                     {createType === 'image' && (
                         <div>
                             <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                                Reference Image <span className="text-gray-600 font-normal">(Optional)</span>
                             </label>
                             <div 
                                 onClick={() => fileInputRef.current?.click()}
                                 className={`border border-dashed border-gray-700 rounded-xl p-4 text-center cursor-pointer transition-colors ${editImage ? 'bg-[#2a2a2a]' : 'hover:bg-[#2a2a2a] hover:border-gray-600'}`}
                             >
                                 {editImage ? (
                                     <div className="relative group">
                                         <img src={`data:image/png;base64,${editImage}`} className="h-32 mx-auto rounded-lg object-contain" />
                                         <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity">
                                             <span className="text-xs text-white">Click to change</span>
                                         </div>
                                     </div>
                                 ) : (
                                     <div className="text-gray-500 text-xs flex flex-col items-center gap-2 py-2">
                                         <ImageIcon size={24} className="opacity-50" />
                                         <span>Upload to edit</span>
                                     </div>
                                 )}
                             </div>
                         </div>
                     )}

                     <button
                        onClick={handleCreate}
                        disabled={isProcessing || !prompt}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98]"
                     >
                         {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                         Generate {createType === 'project' ? 'App' : createType === 'image' ? (editImage ? 'Edit' : 'Image') : createType === 'video' ? 'Video' : 'Animation'}
                     </button>
                 </div>

                 {/* Media Output */}
                 {generatedMedia && (
                     <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                         <div className="flex items-center justify-between mb-2">
                             <div className="text-xs font-bold text-green-400 uppercase tracking-wider flex items-center gap-1">
                                 <Zap size={12} /> Success
                             </div>
                             <a href={generatedMedia.url} download className="text-xs text-blue-400 hover:text-blue-300 hover:underline">Download</a>
                         </div>
                         <div className="rounded-xl overflow-hidden border border-gray-700 shadow-2xl bg-black">
                            {generatedMedia.type === 'image' ? (
                                <img src={generatedMedia.url} className="w-full" />
                            ) : (
                                <video src={generatedMedia.url} controls autoPlay loop className="w-full" />
                            )}
                         </div>
                     </div>
                 )}

                 {/* Code Animation Output */}
                 {generatedAnimation && (
                     <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                         <div className="flex items-center justify-between mb-2">
                             <div className="text-xs font-bold text-green-400 uppercase tracking-wider flex items-center gap-1">
                                 <Zap size={12} /> CSS Generated
                             </div>
                             <button 
                                onClick={() => navigator.clipboard.writeText(generatedAnimation)}
                                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                            >
                                <Copy size={12} /> Copy
                            </button>
                         </div>
                         <div className="bg-[#1e1e1e] border border-gray-700 rounded-xl overflow-hidden">
                             <pre className="p-3 overflow-x-auto text-xs font-mono text-blue-300 custom-scrollbar max-h-64">
                                 {generatedAnimation}
                             </pre>
                         </div>
                         <div className="mt-2 text-[10px] text-gray-500 text-center">
                             Copy this code into your CSS file or &lt;style&gt; tag.
                         </div>
                     </div>
                 )}
              </div>
          )}

          {/* --- LIVE TAB --- */}
          {activeTab === 'live' && (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
                  
                  <div className={`relative z-10 w-40 h-40 rounded-full flex items-center justify-center mb-8 transition-all duration-700 ${isLiveConnected ? 'bg-red-500/10 shadow-[0_0_60px_rgba(239,68,68,0.2)] scale-110' : 'bg-[#2a2a2a] border border-gray-700'}`}>
                      {isLiveConnected && (
                          <span className="absolute inset-0 rounded-full border border-red-500/30 animate-ping opacity-50"></span>
                      )}
                      <Mic size={56} className={`transition-colors duration-300 ${isLiveConnected ? 'text-red-500' : 'text-gray-500'}`} />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-white mb-2 relative z-10">
                      {isLiveConnected ? 'Live Session Active' : 'Voice Chat'}
                  </h3>
                  <p className="text-sm text-gray-400 mb-10 max-w-[240px] leading-relaxed relative z-10">
                      {isLiveConnected 
                          ? 'Listening...' 
                          : 'Experience real-time, low-latency conversation with Gemini 2.5.'}
                  </p>

                  <button
                      onClick={toggleLive}
                      className={`relative z-10 px-8 py-3.5 rounded-full font-medium transition-all transform active:scale-95 shadow-lg ${
                          isLiveConnected 
                          ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/30' 
                          : 'bg-white text-black hover:bg-gray-100 shadow-white/10'
                      }`}
                  >
                      {isLiveConnected ? 'End Session' : 'Start Conversation'}
                  </button>
              </div>
          )}

          {/* --- SHARE TAB (REAL-TIME COLLAB) --- */}
          {activeTab === 'share' && (
              <div className="flex flex-col h-full overflow-hidden relative">
                  {!isSharing ? (
                      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                          <div className="w-20 h-20 bg-[#2a2a2a] rounded-2xl flex items-center justify-center mb-6 border border-gray-700 shadow-lg">
                              <Users size={32} className="text-blue-500" />
                          </div>
                          <h3 className="text-xl font-bold text-white mb-2">Live Collaboration</h3>
                          <p className="text-sm text-gray-400 mb-8 max-w-[260px] leading-relaxed">
                              Real-time code sync and chat between browser tabs. Perfect for pair programming.
                          </p>
                          
                          <div className="w-full max-w-[260px] space-y-3">
                              <button 
                                onClick={startSession}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-medium transition-colors shadow-lg shadow-blue-900/20"
                              >
                                  Start New Session
                              </button>
                              
                              <div className="relative">
                                  <div className="absolute inset-0 flex items-center">
                                      <div className="w-full border-t border-gray-700"></div>
                                  </div>
                                  <div className="relative flex justify-center text-xs">
                                      <span className="px-2 bg-[#1e1e1e] text-gray-500">OR JOIN</span>
                                  </div>
                              </div>

                              <div className="flex gap-2">
                                  <input 
                                    value={joinId}
                                    onChange={(e) => setJoinId(e.target.value)}
                                    placeholder="Session ID" 
                                    className="flex-1 bg-[#2a2a2a] border border-gray-700 rounded-lg px-3 text-sm text-white outline-none focus:border-blue-500"
                                  />
                                  <button 
                                    onClick={joinSession}
                                    disabled={!joinId}
                                    className="px-4 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                                  >
                                      Join
                                  </button>
                              </div>
                          </div>
                          <div className="mt-8 text-[10px] text-gray-600">
                             Works across tabs in the same browser.
                          </div>
                      </div>
                  ) : (
                      <div className="flex flex-col h-full">
                          {/* Session Header */}
                          <div className="bg-[#252526] p-4 border-b border-gray-700 shadow-sm">
                              <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                      <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                      </span>
                                      <span className="text-sm font-semibold text-white">Live Session</span>
                                  </div>
                                  <button onClick={disconnectSession} className="text-gray-400 hover:text-red-400 transition-colors" title="Leave Session">
                                      <LogOut size={16} />
                                  </button>
                              </div>
                              
                              <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-2 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                      <Link size={14} className="text-gray-500 flex-shrink-0" />
                                      <span className="text-xs font-mono text-gray-300 truncate">{sessionId}</span>
                                  </div>
                                  <button 
                                    onClick={() => navigator.clipboard.writeText(sessionId)}
                                    className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                                  >
                                      <Copy size={14} />
                                  </button>
                              </div>
                          </div>

                          {/* Chat Area */}
                          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#1e1e1e]" ref={collabScrollRef}>
                              {collabMessages.map((msg) => (
                                  <div key={msg.id} className={`flex flex-col ${msg.sender === user.username ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-1`}>
                                      {msg.isSystem ? (
                                          <div className="w-full text-center text-[10px] text-gray-600 my-2 italic">
                                              {msg.text}
                                          </div>
                                      ) : (
                                          <>
                                              <span className="text-[10px] text-gray-500 mb-1 px-1">{msg.sender}</span>
                                              <div className={`px-3 py-2 rounded-xl text-sm max-w-[85%] break-words shadow-sm border ${
                                                  msg.sender === user.username
                                                  ? 'bg-blue-600 border-blue-500 text-white rounded-tr-sm'
                                                  : 'bg-[#2a2a2a] border-gray-700 text-gray-200 rounded-tl-sm'
                                              }`}>
                                                  {msg.text}
                                              </div>
                                          </>
                                      )}
                                  </div>
                              ))}
                              {collabMessages.length === 0 && (
                                  <div className="text-center text-gray-600 text-xs mt-10">
                                      <MessageSquare size={32} className="mx-auto mb-2 opacity-20" />
                                      <p>Send a message to start chatting.</p>
                                      <p className="mt-2 text-[10px] opacity-70">Code edits are synced automatically.</p>
                                  </div>
                              )}
                          </div>

                          {/* Chat Input */}
                          <div className="p-3 bg-[#252526] border-t border-gray-700">
                              <form 
                                onSubmit={(e) => { e.preventDefault(); sendCollabMessage(); }}
                                className="flex gap-2"
                              >
                                  <input 
                                    value={collabInput}
                                    onChange={(e) => setCollabInput(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500 transition-colors"
                                  />
                                  <button 
                                    type="submit"
                                    disabled={!collabInput.trim()}
                                    className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                                  >
                                      <Send size={16} />
                                  </button>
                              </form>
                          </div>
                      </div>
                  )}
              </div>
          )}
      </div>
      
      {/* Hidden File Input for reuse */}
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,audio/*" />
    </div>
  );
};

export default AIAssistant;