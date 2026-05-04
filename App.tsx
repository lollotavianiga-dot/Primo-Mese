import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Code2, SplitSquareHorizontal, Maximize2, Sparkles, Layout, AlignLeft, Plus, X, Globe, Lock, Wand2, Undo2, Redo2 } from 'lucide-react';
import { LogEntry, LayoutMode, VirtualFile, GitCommit, SidebarView, Tab, User } from './types';
import Console from './components/Console';
import AddressBar from './components/AddressBar';
import AIAssistant from './components/AIAssistant';
import FileExplorer from './components/FileExplorer';
import SourceControl from './components/SourceControl';
import Deployment from './components/Deployment';
import ActivityBar from './components/ActivityBar';
import Search from './components/Search';
import BrowserTab from './components/BrowserTab';
import AuthScreen from './components/AuthScreen';
import AccountSettings from './components/AccountSettings';
import UserProfilePage from './components/UserProfilePage';
import Terminal from './components/Terminal';
import Contact from './components/Contact';
import Courses from './components/Courses';
import { searchWeb, readPageContent, fixCode, formatCode } from './services/geminiService';

// Initial Empty Project
const INITIAL_FILES: VirtualFile[] = [
  {
    name: 'index.html',
    language: 'html',
    type: 'file',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Project</title>
</head>
<body>
  <div class="container">
    <h1>Hello, World!</h1>
    <p>Start editing to see magic happen.</p>
  </div>
  <style>
    body { font-family: system-ui, sans-serif; padding: 2rem; background: #f0f0f0; }
    .container { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
  </style>
</body>
</html>`
  },
  {
    name: 'googlee1cfce27998c0b4c.html',
    language: 'html',
    type: 'file',
    content: 'google-site-verification: googlee1cfce27998c0b4c.html'
  }
];

export default function App() {
  // -- AUTH STATE --
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Monitor Authentication State
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const text = await res.text();
            if (text) {
                const data = JSON.parse(text);
                setUser(data.user);
            } else {
                localStorage.removeItem('token');
                setUser(null);
            }
          } else {
            localStorage.removeItem('token');
            setUser(null);
          }
        } catch (error) {
          console.error("Failed to load user profile:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    };
    checkAuth();
  }, []);

  const getStorageKey = (username: string) => `devbrowser_files_${username.toLowerCase()}`;

  // Load initial state from localStorage based on USER
  const [files, setFiles] = useState<VirtualFile[]>(INITIAL_FILES);
  const [activeFileName, setActiveFileName] = useState('index.html');

  // -- HISTORY STATE (Undo/Redo) --
  const [fileHistory, setFileHistory] = useState<Record<string, { past: string[], future: string[] }>>({});
  const historyTimeout = useRef<any>(null);

  // Load files when user changes
  useEffect(() => {
    if (user && !authLoading) {
        try {
            const saved = localStorage.getItem(getStorageKey(user.username));
            if (saved) {
                setFiles(JSON.parse(saved));
                // Restore active file if possible
                const savedActive = localStorage.getItem(`devbrowser_activeFile_${user.username.toLowerCase()}`);
                if (savedActive) setActiveFileName(savedActive);
            } else {
                // New user starts with default
                setFiles(INITIAL_FILES);
                setActiveFileName('index.html');
            }
        } catch (e) {
            console.error("Failed to load user files", e);
            setFiles(INITIAL_FILES);
        }
    }
  }, [user, authLoading]);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(LayoutMode.SPLIT);
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  
  // Navigation & Git State
  const [activeSidebar, setActiveSidebar] = useState<SidebarView>('explorer');
  const [commits, setCommits] = useState<GitCommit[]>([]);

  // -- TAB STATE --
  const [tabs, setTabs] = useState<Tab[]>([
      { id: '1', title: 'Local Preview', type: 'preview', url: 'localhost:3000/index.html', loading: false, viewMode: 'live' }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('1');
  const [iframeKey, setIframeKey] = useState(0);

  // Save to localStorage whenever files change (Keyed by User)
  useEffect(() => {
    if (user) {
        localStorage.setItem(getStorageKey(user.username), JSON.stringify(files));
    }
  }, [files, user]);

  // Save active file selection (Keyed by User)
  useEffect(() => {
    if (user) {
        localStorage.setItem(`devbrowser_activeFile_${user.username.toLowerCase()}`, activeFileName);
    }
  }, [activeFileName, user]);

  // Clear history timeout on file change to ensure distinct history sessions per file
  useEffect(() => {
      if (historyTimeout.current) {
          clearTimeout(historyTimeout.current);
          historyTimeout.current = null;
      }
  }, [activeFileName]);

  // Init Git
  useEffect(() => {
    if (commits.length === 0) {
      setCommits([{
        id: 'init',
        message: 'Initial Commit',
        timestamp: new Date().toLocaleTimeString(),
        files: JSON.parse(JSON.stringify(INITIAL_FILES))
      }]);
    }
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('token');
    setUser(null);
    setFiles(INITIAL_FILES);
  };

  const activeFile = files.find(f => f.name === activeFileName) || files[0];
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  // Determine which file is being previewed (Active HTML or fallback to index.html)
  const previewFile = useMemo(() => {
      if (activeFile?.language === 'html') return activeFile;
      return files.find(f => f.name === 'index.html');
  }, [activeFile, files]);

  // -- FILE CONTENT UPDATE WITH UNDO/REDO SUPPORT --
  const updateFileContent = (newContent: string) => {
    const currentFile = files.find(f => f.name === activeFileName);
    if (!currentFile) return;

    // Snapshot history logic: Capture state at start of a typing burst
    if (!historyTimeout.current) {
        setFileHistory(prev => {
            const h = prev[activeFileName] || { past: [], future: [] };
            return {
                ...prev,
                [activeFileName]: {
                    past: [...h.past, currentFile.content], // Save state BEFORE change
                    future: [] // Clear redo stack on new change
                }
            };
        });
    }

    // Reset debounce timer
    if (historyTimeout.current) clearTimeout(historyTimeout.current);
    historyTimeout.current = setTimeout(() => {
        historyTimeout.current = null;
    }, 1000); // 1 second debounce window

    setFiles(prev => prev.map(f => f.name === activeFileName ? { ...f, content: newContent } : f));
  };

  const handleUndo = () => {
    const h = fileHistory[activeFileName];
    if (!h || h.past.length === 0) return;

    const previous = h.past[h.past.length - 1];
    const newPast = h.past.slice(0, -1);
    
    const currentFile = files.find(f => f.name === activeFileName);
    if (!currentFile) return;

    setFileHistory(prev => ({
        ...prev,
        [activeFileName]: {
            past: newPast,
            future: [currentFile.content, ...h.future]
        }
    }));
    
    // Update content directly, bypassing the updateFileContent wrapper to avoid loop
    setFiles(prev => prev.map(f => f.name === activeFileName ? { ...f, content: previous } : f));
  };

  const handleRedo = () => {
    const h = fileHistory[activeFileName];
    if (!h || h.future.length === 0) return;

    const next = h.future[0];
    const newFuture = h.future.slice(1);

    const currentFile = files.find(f => f.name === activeFileName);
    if (!currentFile) return;

    setFileHistory(prev => ({
        ...prev,
        [activeFileName]: {
            past: [...h.past, currentFile.content],
            future: newFuture
        }
    }));

    setFiles(prev => prev.map(f => f.name === activeFileName ? { ...f, content: next } : f));
  };

  // Force history snapshot before automatic operations
  const forceHistorySnapshot = () => {
     if (historyTimeout.current) {
        clearTimeout(historyTimeout.current);
        historyTimeout.current = null;
        // Triggering updateFileContent immediately after this will ensure
        // the current state is saved to history because historyTimeout is null.
     }
  };

  // Format Code Logic
  const handleFormat = async () => {
    if (!activeFile) return;
    forceHistorySnapshot();
    try {
      const formatted = await formatCode(activeFile.content, activeFile.language);
      if (formatted !== activeFile.content) {
        updateFileContent(formatted);
        setLogs(prev => [...prev, { id: Date.now().toString(), timestamp: new Date().toLocaleTimeString(), level: 'success', message: `Formatted ${activeFile.name}` }]);
      }
    } catch (e: any) {
        setLogs(prev => [...prev, { id: Date.now().toString(), timestamp: new Date().toLocaleTimeString(), level: 'error', message: `Format error: ${e.message}` }]);
    }
  };

  // AI Fix Code Logic
  const handleAutoFix = async () => {
      if (!activeFile || isFixing) return;
      forceHistorySnapshot();
      setIsFixing(true);
      setLogs(prev => [...prev, { id: Date.now().toString(), timestamp: new Date().toLocaleTimeString(), level: 'info', message: `Analyzing ${activeFile.name} for errors...` }]);
      
      try {
          const fixedCode = await fixCode(activeFile.content, activeFile.language);
          if (fixedCode !== activeFile.content) {
              updateFileContent(fixedCode);
              setLogs(prev => [...prev, { id: Date.now().toString(), timestamp: new Date().toLocaleTimeString(), level: 'success', message: `Fixed errors in ${activeFile.name}` }]);
          } else {
              setLogs(prev => [...prev, { id: Date.now().toString(), timestamp: new Date().toLocaleTimeString(), level: 'info', message: `No errors found in ${activeFile.name}` }]);
          }
      } catch (e: any) {
          setLogs(prev => [...prev, { id: Date.now().toString(), timestamp: new Date().toLocaleTimeString(), level: 'error', message: `Fix failed: ${e.message}` }]);
      } finally {
          setIsFixing(false);
      }
  };

  // Git Operations
  const handleGitCommit = (message: string) => {
    const newCommit: GitCommit = { id: Date.now().toString(), message, timestamp: new Date().toLocaleTimeString(), files: JSON.parse(JSON.stringify(files)) };
    setCommits(prev => [newCommit, ...prev]);
  };

  const handleGitCheckout = (commitId: string) => {
    const commit = commits.find(c => c.id === commitId);
    if (commit) {
      forceHistorySnapshot(); // Save state before checkout
      setFiles(JSON.parse(JSON.stringify(commit.files)));
      if (!commit.files.find(f => f.name === activeFileName)) {
        setActiveFileName(commit.files[0]?.name || '');
      }
    }
  };

  // Calculate uncommitted changes
  const uncommittedChangesCount = useMemo(() => {
    const head = commits[0];
    if (!head) return files.filter(f => f.type !== 'directory').length;
    let count = 0;
    files.filter(f => f.type !== 'directory').forEach(f => {
      const prev = head.files.find(pf => pf.name === f.name);
      if (!prev || prev.content !== f.content) count++;
    });
    head.files.filter(f => f.type !== 'directory').forEach(pf => {
      if (!files.find(f => f.name === pf.name)) count++;
    });
    return count;
  }, [files, commits]);

  // File Operations
  const handleCreateFile = (name: string) => {
    if (files.some(f => f.name === name)) return;
    const ext = name.split('.').pop()?.toLowerCase();
    
    // Improved Language Detection
    let lang: VirtualFile['language'] = 'text';
    if (ext === 'html') lang = 'html'; 
    else if (ext === 'css') lang = 'css'; 
    else if (ext === 'js' || ext === 'mjs') lang = 'javascript'; 
    else if (ext === 'ts' || ext === 'tsx') lang = 'typescript'; 
    else if (ext === 'json') lang = 'json';
    else if (ext === 'py') lang = 'python';
    else if (ext === 'java') lang = 'java';
    else if (ext === 'c' || ext === 'h') lang = 'c';
    else if (ext === 'cpp' || ext === 'hpp') lang = 'cpp';
    else if (ext === 'cs') lang = 'csharp';
    else if (ext === 'rs') lang = 'rust';
    else if (ext === 'go') lang = 'go';
    else if (ext === 'php') lang = 'php';
    else if (ext === 'rb') lang = 'ruby';
    else if (ext === 'sql') lang = 'sql';
    else if (ext === 'xml') lang = 'xml';
    else if (ext === 'yml' || ext === 'yaml') lang = 'yaml';

    setFiles(prev => [...prev, { name, content: '', language: lang, type: 'file' }]);
    setActiveFileName(name);
  };

  const handleCreateFolder = (name: string) => {
    if (files.some(f => f.name === name)) return;
    setFiles(prev => [...prev, { name, content: '', language: 'text', type: 'directory' }]);
  };

  const handleDeleteFile = (name: string) => {
    const newFiles = files.filter(f => f.name !== name && !f.name.startsWith(name + '/'));
    setFiles(newFiles);
    if (activeFileName === name || activeFileName.startsWith(name + '/')) {
        const firstFile = newFiles.find(f => f.type === 'file');
        setActiveFileName(firstFile ? firstFile.name : '');
    }
  };
  
  const handleRenameFile = (oldName: string, newName: string) => {
      if (files.some(f => f.name === newName)) { alert("Path already exists"); return; }
      setFiles(prev => prev.map(f => {
          if (f.name === oldName) return { ...f, name: newName };
          if (f.name.startsWith(oldName + '/')) return { ...f, name: f.name.replace(oldName + '/', newName + '/') };
          return f;
      }));
      if (activeFileName === oldName) setActiveFileName(newName);
      else if (activeFileName.startsWith(oldName + '/')) setActiveFileName(activeFileName.replace(oldName + '/', newName + '/'));
  };

  const handleImportProject = (importedFiles: VirtualFile[]) => {
      if (confirm('Importing will overwrite your current files. Continue?')) {
          setFiles(importedFiles);
          const firstFile = importedFiles.find(f => f.type === 'file');
          if (firstFile) setActiveFileName(firstFile.name);
          setLogs(prev => [...prev, { id: Date.now().toString(), timestamp: new Date().toLocaleTimeString(), level: 'success', message: `Project imported successfully (${importedFiles.length} files)` }]);
      }
  };

  // Tab Operations
  const handleNewTab = () => {
      const newId = Date.now().toString();
      setTabs(prev => [...prev, { id: newId, title: 'New Tab', type: 'browser', url: '', loading: false, viewMode: 'live' }]);
      setActiveTabId(newId);
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newTabs = tabs.filter(t => t.id !== id);
      if (newTabs.length === 0) {
           // Always keep one tab
           setTabs([{ id: Date.now().toString(), title: 'New Tab', type: 'browser', url: '', loading: false, viewMode: 'live' }]);
      } else {
           setTabs(newTabs);
           if (activeTabId === id) setActiveTabId(newTabs[newTabs.length - 1].id);
      }
  };

  const handleNavigate = async (inputUrl: string) => {
     let url = inputUrl.trim();
     if (!url) return;

     // 1. Localhost Case
     if (url.includes('localhost')) {
         setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, type: 'preview', url: `localhost:3000/${previewFile?.name || ''}`, title: 'Local Preview', loading: false } : t));
         return;
     }

     // 2. URL detection (Heuristic)
     const isUrl = url.includes('.') && !url.includes(' ') && !url.startsWith('?');

     if (isUrl) {
         // It is a URL, visit it
         if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
         let hostname = url;
         try { hostname = new URL(url).hostname; } catch(e){}

         setTabs(prev => prev.map(t => t.id === activeTabId ? { 
            ...t, 
            type: 'browser', 
            viewMode: 'live',
            url: url, 
            title: hostname, 
            loading: false, 
            content: null // null content = show iframe in BrowserTab
         } : t));
     } else {
         // 3. Search Query
         setTabs(prev => prev.map(t => t.id === activeTabId ? { 
            ...t, 
            type: 'browser', 
            viewMode: 'live',
            url: url, // Keep query in address bar
            title: url, 
            loading: true, 
            content: [] 
         } : t));
         
         try {
             const results = await searchWeb(url);
             setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, loading: false, content: results } : t));
         } catch (e) {
             setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, loading: false, content: [], title: 'Error' } : t));
         }
     }
  };

  const handleSwitchToReader = async () => {
     const tab = activeTab;
     if (!tab.url) return;
     
     // Toggle Logic
     if (tab.viewMode === 'reader') {
         setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, viewMode: 'live' } : t));
         return;
     }

     // Set mode to reader immediately to show UI state
     setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, viewMode: 'reader' } : t));
     
     // If we already have content, don't fetch again
     if (tab.readerContent) return;
     
     // Set loading state for reader (reuse loading flag or add specific one, reusing main loading for simplicity but keeping iframe intact might be better. Let's toggle loading.)
     setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, loading: true } : t));
     
     try {
         const content = await readPageContent(tab.url);
         setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, loading: false, readerContent: content } : t));
     } catch (e) {
         setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, loading: false, readerContent: "Failed to load content via AI Reader." } : t));
     }
  };

  // Handle messages from iframe (console)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'console') {
        const newLog: LogEntry = {
          id: Date.now().toString() + Math.random(),
          timestamp: new Date().toLocaleTimeString(),
          level: event.data.level,
          message: event.data.message.map((m: any) => typeof m === 'object' ? JSON.stringify(m) : String(m)).join(' ')
        };
        setLogs(prev => [...prev, newLog]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const clearLogs = () => setLogs([]);

  // Console Command Handler
  const handleConsoleCommand = (cmd: string) => { /* Same as before */ };

  // Bundler Logic: Inject CSS/JS into HTML with path resolution
  const getSrcDoc = () => {
    if (!previewFile) return "";
    let html = previewFile.content;
    const basePath = previewFile.name;
    const resolvePath = (relPath: string) => {
        if (relPath.startsWith('http') || relPath.startsWith('//')) return null;
        if (relPath.startsWith('/')) return relPath.slice(1);
        const stack = basePath.split('/'); stack.pop();
        const parts = relPath.split('/');
        for (const part of parts) { if (part === '.') continue; if (part === '..') { if (stack.length > 0) stack.pop(); } else { stack.push(part); } }
        return stack.join('/');
    };
    html = html.replace(/<link\s+[^>]*rel="stylesheet"[^>]*>/g, (match) => {
      const hrefMatch = match.match(/href="([^"]+)"/); if (!hrefMatch) return match;
      const resolvedPath = resolvePath(hrefMatch[1]); if (!resolvedPath) return match;
      const cssFile = files.find(f => f.name === resolvedPath); return cssFile ? `<style>/* ${resolvedPath} */\n${cssFile.content}</style>` : match;
    });
    html = html.replace(/<script\s+[^>]*src="([^"]+)"[^>]*><\/script>/g, (match, src) => {
      const resolvedPath = resolvePath(src); if (!resolvedPath) return match;
      const jsFile = files.find(f => f.name === resolvedPath); return jsFile ? `<script>/* ${resolvedPath} */\n${jsFile.content}</script>` : match;
    });
    const consoleHijack = `<script>
        const originalLog = console.log; const originalWarn = console.warn; const originalError = console.error; const originalInfo = console.info;
        function sendToParent(level, args) { try { window.parent.postMessage({ type: 'console', level: level, message: Array.from(args).map(a => { if (a instanceof Error) return a.toString(); return a; }) }, '*'); } catch(e) {} }
        console.log = function(...args) { originalLog.apply(console, args); sendToParent('log', args); };
        console.warn = function(...args) { originalWarn.apply(console, args); sendToParent('warn', args); };
        console.error = function(...args) { originalError.apply(console, args); sendToParent('error', args); };
        console.info = function(...args) { originalInfo.apply(console, args); sendToParent('info', args); };
        window.onerror = function(msg, url, line) { sendToParent('error', [msg + " (Line " + line + ")"]); }
      </script>`;
    if (html.includes('</body>')) { return html.replace('</body>', `${consoleHijack}</body>`); }
    return html + consoleHijack;
  };

  const srcDoc = useMemo(() => getSrcDoc(), [files, previewFile]);

  // -- AUTH WALL --
  if (authLoading) {
      return (
          <div className="w-screen h-screen bg-[#0f0f0f] flex items-center justify-center font-sans">
              <div className="text-white text-sm animate-pulse">Loading Workspace...</div>
          </div>
      );
  }

  if (!user) {
      return <AuthScreen onLogin={(loggedInUser, token) => {
        localStorage.setItem('token', token);
        setUser(loggedInUser);
      }} />;
  }

  // Determine Main Content based on Activity
  const renderMainContent = () => {
      if (activeSidebar === 'terminal') {
          return (
              <div className="flex-1 bg-black">
                  <Terminal files={files} user={user} onUpdateFiles={setFiles} onSelectFile={setActiveFileName} />
              </div>
          );
      }

      if (activeSidebar === 'profile') {
          return (
              <div className="flex-1 flex bg-[#0f0f0f]">
                  <UserProfilePage user={user} onLogout={handleLogout} />
              </div>
          );
      }

      return (
          <>
            {/* Sidebar Content */}
            {activeSidebar === 'explorer' && (
                <FileExplorer 
                  files={files} activeFileName={activeFileName} onSelect={setActiveFileName} 
                  onCreate={handleCreateFile} onCreateFolder={handleCreateFolder} 
                  onDelete={handleDeleteFile}
                  onRename={handleRenameFile}
                  onImport={handleImportProject}
                />
            )}
            {activeSidebar === 'search' && <Search files={files} onSelect={setActiveFileName} />}
            {activeSidebar === 'git' && <SourceControl files={files} commits={commits} onCommit={handleGitCommit} onCheckout={handleGitCheckout} />}
            {activeSidebar === 'deploy' && <Deployment files={files} />}
            {activeSidebar === 'contact' && <Contact />}
            {activeSidebar === 'courses' && <Courses />}

            {/* Editor Pane (Left) */}
            <div className={`flex flex-col border-r border-gray-800 transition-all duration-300 ${layoutMode === LayoutMode.SPLIT ? 'w-1/2' : 'w-0 overflow-hidden'}`}>
              <div className="h-9 bg-[#1e1e1e] border-b border-gray-800 flex items-center px-4 text-xs select-none">
                 <Code2 size={14} className="text-blue-500 mr-2" />
                 <span className="text-gray-300 mr-4">{activeFileName}</span>
                 {activeFile && <span className="text-gray-600 uppercase text-[10px] bg-gray-800 px-1 rounded">{activeFile.language}</span>}
                 
                 <div className="ml-auto flex items-center gap-2">
                     <button onClick={handleUndo} className="p-1 text-gray-400 hover:text-white transition-colors" title="Undo (Ctrl+Z)">
                         <Undo2 size={14} />
                     </button>
                     <button onClick={handleRedo} className="p-1 text-gray-400 hover:text-white transition-colors mr-2" title="Redo (Ctrl+Y)">
                         <Redo2 size={14} />
                     </button>
                     
                     <div className="w-px h-3 bg-gray-700 mx-1"></div>

                     <button 
                         onClick={handleAutoFix} 
                         disabled={isFixing}
                         className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded transition-colors ${
                            isFixing ? 'text-blue-400 bg-blue-400/10 cursor-wait' : 'text-purple-400 hover:text-white hover:bg-purple-500/20'
                         }`}
                         title="Use AI to automatically find and fix errors"
                     >
                         <Wand2 size={12} className={isFixing ? "animate-spin" : ""} />
                         <span className="hidden sm:inline">{isFixing ? 'Fixing...' : 'Auto-Fix'}</span>
                     </button>
                     <div className="w-px h-3 bg-gray-700 mx-1"></div>
                     <button onClick={handleFormat} className="flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors" title="Format Code">
                         <AlignLeft size={14} />
                     </button>
                 </div>
              </div>
              <textarea
                className="flex-1 w-full bg-[#1e1e1e] text-gray-300 font-mono text-sm p-4 outline-none resize-none leading-relaxed custom-scrollbar"
                value={activeFile?.content || ''}
                onChange={(e) => updateFileContent(e.target.value)}
                onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                        e.preventDefault();
                        if (e.shiftKey) {
                            handleRedo();
                        } else {
                            handleUndo();
                        }
                    } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
                        e.preventDefault();
                        handleRedo();
                    }
                }}
                spellCheck={false}
                placeholder="// Start coding..."
              />
            </div>

            {/* Browser Pane (Right) - Tab Content */}
            <div className={`flex-1 flex flex-col bg-white relative transition-all duration-300 ${layoutMode === LayoutMode.SPLIT ? 'w-1/2' : 'w-full'}`}>
              <AddressBar 
                  url={activeTab.url} 
                  onNavigate={handleNavigate} 
                  onRefresh={() => setIframeKey(k => k + 1)} 
                  isLoading={activeTab.loading}
              />
              <div className="flex-1 relative overflow-hidden bg-[#1e1e1e]">
                  <BrowserTab 
                     key={`${activeTab.id}-${iframeKey}`} 
                     tab={activeTab} 
                     srcDoc={srcDoc} 
                     onNavigate={handleNavigate}
                     onToggleReader={handleSwitchToReader}
                  />
              </div>
            </div>
          </>
      );
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-browser-bg text-gray-300">
      
      {/* Top Bar / Tab Strip */}
      <div className="flex items-end h-10 px-2 bg-browser-bg border-b border-browser-toolbar select-none gap-2 pt-2">
           {/* Controls */}
           <div className="flex items-center gap-2 mb-2 mr-2">
              <div className="flex gap-1.5 px-2">
                 <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                 <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                 <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              </div>
           </div>

           {/* Tab Strip */}
           <div className="flex-1 flex overflow-x-auto no-scrollbar items-end h-full">
               {tabs.map(tab => (
                   <div 
                      key={tab.id}
                      onClick={() => setActiveTabId(tab.id)}
                      className={`
                        group relative flex items-center gap-2 px-3 py-1.5 min-w-[120px] max-w-[200px] text-xs rounded-t-lg cursor-default border-r border-gray-800/50 transition-colors
                        ${activeTabId === tab.id ? 'bg-[#3c3c3c] text-white' : 'bg-transparent text-gray-500 hover:bg-[#2d2d2d]'}
                      `}
                   >
                       {tab.type === 'preview' ? <Lock size={10} className="text-green-500" /> : <Globe size={10} className="text-blue-400" />}
                       <span className="truncate flex-1">{tab.title || 'New Tab'}</span>
                       <button 
                         onClick={(e) => handleCloseTab(tab.id, e)}
                         className={`p-0.5 rounded-full hover:bg-white/20 opacity-0 group-hover:opacity-100 ${tabs.length === 1 ? 'hidden' : ''}`}
                       >
                           <X size={10} />
                       </button>
                   </div>
               ))}
               <button onClick={handleNewTab} className="p-1.5 ml-1 text-gray-500 hover:text-white hover:bg-white/10 rounded mb-1">
                   <Plus size={14} />
               </button>
           </div>
           
           {/* Window Controls */}
           <div className="flex items-center gap-2 mb-1.5">
              <button 
                 onClick={() => setLayoutMode(layoutMode === LayoutMode.SPLIT ? LayoutMode.FULL : LayoutMode.SPLIT)}
                 className={`p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition ${activeSidebar === 'terminal' ? 'opacity-50 cursor-not-allowed' : ''}`}
                 disabled={activeSidebar === 'terminal'}
              >
                {layoutMode === LayoutMode.SPLIT ? <Maximize2 size={16} /> : <SplitSquareHorizontal size={16} />}
              </button>
              <button 
                 onClick={() => setIsAIOpen(!isAIOpen)}
                 className={`p-1.5 rounded transition-colors ${isAIOpen ? 'text-browser-accent bg-blue-500/10' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
              >
                <Sparkles size={16} />
              </button>
           </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Activity Bar */}
        <ActivityBar 
            activeView={activeSidebar} 
            onViewChange={setActiveSidebar} 
            changesCount={uncommittedChangesCount}
            username={user.username}
            onLogout={handleLogout}
            onOpenProfile={() => setActiveSidebar('profile')}
        />

        {renderMainContent()}

        {/* AI Sidebar */}
        <AIAssistant 
          user={user} 
          currentCode={activeFile?.content || ''} 
          files={files}
          isOpen={isAIOpen} 
          onClose={() => setIsAIOpen(false)} 
          onUpdateCode={updateFileContent} 
          onReplaceFiles={setFiles} 
        />
        
      </div>

      <Console logs={logs} onClear={clearLogs} isOpen={isConsoleOpen} toggleOpen={() => setIsConsoleOpen(!isConsoleOpen)} onCommand={handleConsoleCommand} />
    </div>
  );
}