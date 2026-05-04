import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Lock, Search, Globe } from 'lucide-react';

interface AddressBarProps {
  url: string;
  onNavigate: (url: string) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

const AddressBar: React.FC<AddressBarProps> = ({ url, onNavigate, onRefresh, isLoading }) => {
  const [input, setInput] = useState(url);

  useEffect(() => {
    setInput(url);
  }, [url]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onNavigate(input);
    }
  };

  const isLocalhost = input.includes('localhost') || input === '';

  return (
    <div className="h-10 bg-browser-toolbar flex items-center px-2 gap-2 border-b border-gray-800">
      <div className="flex gap-1">
        <button className="p-1.5 rounded-full text-gray-500 hover:bg-white/10 hover:text-white transition">
          <ArrowLeft size={16} />
        </button>
        <button className="p-1.5 rounded-full text-gray-500 hover:bg-white/10 hover:text-white transition">
          <ArrowRight size={16} />
        </button>
        <button 
          onClick={onRefresh}
          className={`p-1.5 rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition ${isLoading ? 'animate-spin' : ''}`}
          title="Refresh"
        >
          <RotateCw size={14} />
        </button>
      </div>

      <div className="flex-1 bg-[#1a1a1a] h-7 rounded-full flex items-center px-3 border border-gray-700 focus-within:border-browser-accent transition-colors group">
        {isLocalhost ? (
            <Lock size={12} className="text-green-500 mr-2 opacity-75" />
        ) : (
            <Search size={12} className="text-gray-400 mr-2 opacity-75" />
        )}
        
        <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={(e) => e.target.select()}
            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-300 placeholder-gray-600 font-mono"
            placeholder="Search Google or enter URL"
        />
        
        {!isLocalhost && (
            <div className="text-[10px] text-gray-600 border border-gray-700 rounded px-1.5 ml-2">
                GOOGLE
            </div>
        )}
      </div>
      
      {/* Extension/Menu Placeholder */}
      <div className="flex items-center gap-2 ml-2 px-2 border-l border-gray-700/50">
          <button className="text-gray-500 hover:text-blue-400 cursor-pointer flex items-center" title="Browser Settings">
              <Globe size={16} />
          </button>
      </div>
    </div>
  );
};

export default AddressBar;