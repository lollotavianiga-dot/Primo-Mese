import React, { useState } from 'react';
import { SearchResult, Tab } from '../types';
import { Search, ExternalLink, AlertCircle, ShieldAlert, BookOpen, Monitor, Sparkles, ArrowRight } from 'lucide-react';

interface BrowserTabProps {
  tab: Tab;
  srcDoc: string; // For preview mode
  onNavigate: (url: string) => void;
  onToggleReader: () => void;
}

const BrowserTab: React.FC<BrowserTabProps> = ({ tab, srcDoc, onNavigate, onToggleReader }) => {
  const [localSearch, setLocalSearch] = useState('');

  const handleLocalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      onNavigate(localSearch);
    }
  };
  
  // -- Mode 1: Local Preview (iframe) --
  if (tab.type === 'preview') {
    return (
      <iframe
        title={tab.title}
        srcDoc={srcDoc}
        className="w-full h-full border-none bg-white"
        sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
      />
    );
  }

  // -- Mode 2: External Browser / Search --

  const isBrowsingSite = tab.url && (!tab.content || !Array.isArray(tab.content));

  // -- Mode 2a: Reader View (AI Content) --
  if (isBrowsingSite && tab.viewMode === 'reader') {
     return (
         <div className="w-full h-full bg-[#f8f9fa] overflow-y-auto flex flex-col items-center">
             {/* Reader Header */}
             <div className="w-full bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                 <div className="flex items-center gap-2 text-gray-700">
                     <BookOpen size={18} className="text-blue-600" />
                     <span className="font-semibold text-sm">Reader View</span>
                 </div>
                 <button 
                    onClick={onToggleReader}
                    className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 px-3 py-1.5 rounded-full transition-colors"
                 >
                    <Monitor size={14} /> Switch to Live Site
                 </button>
             </div>

             {tab.loading ? (
                 <div className="w-full max-w-3xl px-6 py-12 space-y-6 animate-pulse">
                     <div className="h-8 w-3/4 bg-gray-200 rounded"></div>
                     <div className="h-4 w-full bg-gray-200 rounded"></div>
                     <div className="h-4 w-full bg-gray-200 rounded"></div>
                     <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
                     <div className="space-y-3 mt-8">
                        <div className="h-4 w-full bg-gray-200 rounded"></div>
                        <div className="h-4 w-full bg-gray-200 rounded"></div>
                     </div>
                 </div>
             ) : (
                 <div className="w-full max-w-3xl px-6 py-8 prose prose-sm prose-slate">
                     {/* Basic Markdown Rendering - In production use a real Markdown parser */}
                     {tab.readerContent ? (
                        <div className="whitespace-pre-wrap text-gray-800 leading-relaxed font-serif text-lg">
                           {tab.readerContent}
                        </div>
                     ) : (
                        <div className="text-center text-gray-500 py-12">Failed to load content.</div>
                     )}
                 </div>
             )}
         </div>
     );
  }

  // -- Mode 2b: Live View (Iframe) --
  if (isBrowsingSite) {
      return (
          <div className="w-full h-full flex flex-col bg-white">
              {/* Security/Reader Banner */}
              <div className="bg-blue-50 text-blue-900 px-4 py-3 text-sm flex items-center justify-between border-b border-blue-100 shadow-sm z-10">
                  <div className="flex items-center gap-2">
                      <ShieldAlert size={16} className="text-blue-600" />
                      <span>If the site refuses to load, use Reader View.</span>
                  </div>
                  <div className="flex items-center gap-3">
                      <button 
                        onClick={onToggleReader}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold shadow-sm transition-colors"
                      >
                          <BookOpen size={12} /> Read with AI
                      </button>
                      <div className="w-px h-4 bg-blue-200"></div>
                      <a 
                        href={tab.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-1 hover:underline font-medium text-blue-700 text-xs"
                      >
                          Open External <ExternalLink size={12} />
                      </a>
                  </div>
              </div>
              <iframe 
                src={tab.url}
                className="flex-1 w-full border-none"
                title="External Site"
                sandbox="allow-scripts allow-modals allow-forms allow-same-origin allow-popups"
              />
          </div>
      );
  }

  return (
    <div className="w-full h-full bg-[#050505] overflow-hidden flex flex-col relative">
       
       <style>{`
         @keyframes float {
           0% { transform: translate(0px, 0px) scale(1); }
           33% { transform: translate(30px, -50px) scale(1.1); }
           66% { transform: translate(-20px, 20px) scale(0.9); }
           100% { transform: translate(0px, 0px) scale(1); }
         }
         @keyframes pulse-glow {
           0%, 100% { opacity: 0.4; }
           50% { opacity: 0.7; }
         }
         .surreal-blob {
           position: absolute;
           border-radius: 50%;
           filter: blur(80px);
           opacity: 0.5;
           animation: float 20s infinite ease-in-out;
         }
         .glass-panel {
           background: rgba(255, 255, 255, 0.03);
           backdrop-filter: blur(10px);
           border: 1px solid rgba(255, 255, 255, 0.05);
           box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
         }
       `}</style>

       {/* Empty State / New Tab (Surrealistic UI) */}
       {!tab.url && !tab.loading && (
           <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
               {/* Animated Background */}
               <div className="absolute inset-0 overflow-hidden pointer-events-none">
                   <div className="surreal-blob w-96 h-96 bg-indigo-900/40 top-1/4 left-1/4" style={{animationDelay: '0s'}}></div>
                   <div className="surreal-blob w-[500px] h-[500px] bg-blue-900/30 bottom-[-100px] right-[-100px]" style={{animationDelay: '-5s'}}></div>
                   <div className="surreal-blob w-64 h-64 bg-purple-900/30 top-1/3 right-1/3" style={{animationDelay: '-10s'}}></div>
               </div>

               {/* Grid Overlay */}
               <div 
                 className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{
                    backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                 }}
               ></div>

               {/* Center Content */}
               <div className="relative z-10 w-full max-w-2xl px-6 flex flex-col items-center animate-in fade-in zoom-in duration-700">
                   <div className="mb-8 flex items-center gap-3">
                       <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg shadow-blue-900/20">
                           <Sparkles size={32} className="text-white" />
                       </div>
                       <h1 className="text-5xl font-extralight text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 tracking-tight">
                           Deploy Studio
                       </h1>
                   </div>

                   <form onSubmit={handleLocalSearch} className="w-full relative group">
                       <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
                       <div className="glass-panel rounded-2xl flex items-center p-2 relative transition-all duration-300 group-focus-within:bg-white/5 group-focus-within:border-white/10">
                           <Search className="text-gray-400 ml-4 mr-3" size={20} />
                           <input 
                              autoFocus
                              type="text" 
                              value={localSearch}
                              onChange={(e) => setLocalSearch(e.target.value)}
                              placeholder="Search the web or enter a URL..." 
                              className="flex-1 bg-transparent border-none outline-none text-lg text-white placeholder-gray-500 h-12 font-light"
                           />
                           <button 
                             type="submit"
                             className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                           >
                               <ArrowRight size={20} />
                           </button>
                       </div>
                   </form>

                   <div className="mt-8 flex gap-4 opacity-50 text-xs text-gray-400">
                       <span className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors">Documentation</span>
                       <span>•</span>
                       <span className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors">Shortcuts</span>
                       <span>•</span>
                       <span className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors">Release Notes</span>
                   </div>
               </div>
           </div>
       )}

       {/* Loading State - Skeleton Loader */}
       {tab.loading && (
           <div className="w-full h-full bg-[#1e1e1e] overflow-y-auto">
             <div className="w-full max-w-3xl px-6 py-8 space-y-8 animate-pulse mx-auto">
                 <div className="border-b border-gray-700 pb-4 mb-6">
                     <div className="h-6 w-48 bg-gray-800 rounded"></div>
                 </div>
                 {[1, 2, 3, 4].map((i) => (
                     <div key={i} className="space-y-2">
                         <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-gray-800"></div>
                             <div className="h-3 w-32 bg-gray-800 rounded"></div>
                         </div>
                         <div className="h-5 w-3/4 bg-gray-700 rounded"></div>
                         <div className="h-3 w-full bg-gray-800 rounded"></div>
                         <div className="h-3 w-2/3 bg-gray-800 rounded"></div>
                     </div>
                 ))}
             </div>
           </div>
       )}

       {/* Search Results */}
       {!tab.loading && tab.content && Array.isArray(tab.content) && (
           <div className="w-full h-full bg-[#1e1e1e] overflow-y-auto custom-scrollbar">
             <div className="w-full max-w-3xl px-6 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 mx-auto">
                 <div className="border-b border-gray-700 pb-4 mb-6">
                     <h1 className="text-xl text-gray-200 font-medium flex items-center gap-2">
                         <Search size={20} className="text-blue-500" />
                         Results for <span className="text-white font-bold">"{tab.title}"</span>
                     </h1>
                 </div>

                 {tab.content.length === 0 ? (
                     <div className="text-gray-500 flex items-center gap-2 bg-gray-800/50 p-4 rounded-lg">
                         <AlertCircle size={18} /> No results found. Try a different query.
                     </div>
                 ) : (
                     tab.content.map((result: SearchResult, idx: number) => {
                         // Format display URL
                         let displayUrl = result.url;
                         try { displayUrl = new URL(result.url).hostname; } catch(e){}

                         return (
                             <div key={idx} className="group mb-6">
                                 <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                                     <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-300">
                                         {displayUrl.charAt(0).toUpperCase()}
                                     </div>
                                     <span className="truncate max-w-[300px]">{displayUrl}</span>
                                 </div>
                                 <button 
                                      onClick={() => onNavigate(result.url)}
                                      className="text-blue-400 text-lg hover:underline font-medium block mb-1 text-left visited:text-purple-400 outline-none focus:underline"
                                 >
                                     {result.title}
                                 </button>
                                 <p className="text-sm text-gray-400 leading-relaxed line-clamp-2 group-hover:text-gray-300 transition-colors">
                                     {result.snippet}
                                 </p>
                             </div>
                         );
                     })
                 )}
                 
                 <div className="pt-8 border-t border-gray-800 text-center text-xs text-gray-600">
                     Search results provided by Gemini Grounding
                 </div>
             </div>
           </div>
       )}
    </div>
  );
};

export default BrowserTab;