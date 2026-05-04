import React, { useEffect, useRef, useState } from 'react';
import { LogEntry } from '../types';
import { Terminal, Trash2, XCircle, ChevronRight } from 'lucide-react';

interface ConsoleProps {
  logs: LogEntry[];
  onClear: () => void;
  isOpen: boolean;
  toggleOpen: () => void;
  onCommand: (cmd: string) => void;
}

const Console: React.FC<ConsoleProps> = ({ logs, onClear, isOpen, toggleOpen, onCommand }) => {
  const endRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onCommand(input);
    setInput('');
  };

  if (!isOpen) {
    return (
      <button 
        onClick={toggleOpen}
        className="fixed bottom-4 right-4 bg-browser-toolbar border border-gray-700 p-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors z-50 text-xs flex items-center gap-2"
      >
        <Terminal size={14} />
        <span>Console ({logs.length})</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 w-full h-48 bg-browser-bg border-t border-gray-700 flex flex-col z-40 shadow-2xl">
      {/* Console Header */}
      <div className="h-8 bg-browser-toolbar flex items-center justify-between px-4 border-b border-gray-700">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
          <Terminal size={14} />
          <span>DevTools Console</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onClear} className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10" title="Clear Console">
            <Trash2 size={14} />
          </button>
          <button onClick={toggleOpen} className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10" title="Close">
            <XCircle size={14} />
          </button>
        </div>
      </div>

      {/* Logs Area */}
      <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1">
        {logs.length === 0 && (
          <div className="text-gray-600 italic">Type 'help' for commands...</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className={`flex gap-2 border-b border-white/5 pb-1 last:border-0 ${
            log.level === 'error' ? 'text-red-400 bg-red-900/10' : 
            log.level === 'warn' ? 'text-yellow-400 bg-yellow-900/10' : 
            log.level === 'command' ? 'text-blue-400 font-bold' :
            log.level === 'success' ? 'text-green-400' :
            'text-gray-300'
          }`}>
            <span className="text-gray-500 select-none flex-shrink-0">[{log.timestamp}]</span>
            <span className="break-all whitespace-pre-wrap">{log.message}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="h-8 bg-[#1a1a1a] border-t border-gray-700 flex items-center px-2 gap-2">
          <ChevronRight size={14} className="text-blue-500" />
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-gray-300 font-mono text-xs placeholder-gray-600"
            placeholder="Type command..."
            autoFocus
          />
      </form>
    </div>
  );
};

export default Console;