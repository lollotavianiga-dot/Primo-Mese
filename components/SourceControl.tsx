import React, { useState, useMemo } from 'react';
import { GitCommit, VirtualFile } from '../types';
import { GitCommitHorizontal, Check, Clock, RotateCcw, Play } from 'lucide-react';

interface SourceControlProps {
  files: VirtualFile[];
  commits: GitCommit[];
  onCommit: (message: string) => void;
  onCheckout: (commitId: string) => void;
}

const SourceControl: React.FC<SourceControlProps> = ({ files, commits, onCommit, onCheckout }) => {
  const [message, setMessage] = useState('');

  // Calculate differences between current files and HEAD (latest commit)
  const changes = useMemo(() => {
    const head = commits[0];
    const changesList: { name: string; type: 'M' | 'A' | 'D' }[] = [];
    
    // Filter out directories from diff
    const contentFiles = files.filter(f => f.type !== 'directory');
    const headContentFiles = head ? head.files.filter(f => f.type !== 'directory') : [];

    // If no commits, everything is Added
    if (!head) {
      return contentFiles.map(f => ({ name: f.name, type: 'A' as const }));
    }

    // Check Modified and Added
    contentFiles.forEach(f => {
      const prev = headContentFiles.find(pf => pf.name === f.name);
      if (!prev) {
        changesList.push({ name: f.name, type: 'A' });
      } else if (prev.content !== f.content) {
        changesList.push({ name: f.name, type: 'M' });
      }
    });

    // Check Deleted
    headContentFiles.forEach(pf => {
      if (!contentFiles.find(f => f.name === pf.name)) {
        changesList.push({ name: pf.name, type: 'D' });
      }
    });

    return changesList;
  }, [files, commits]);

  const handleCommit = () => {
    if (!message.trim()) return;
    onCommit(message);
    setMessage('');
  };

  return (
    <div className="w-64 bg-browser-toolbar border-r border-gray-700 flex flex-col h-full select-none">
      <div className="h-9 px-3 flex items-center justify-between border-b border-gray-700 bg-[#252526]">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
          <GitCommitHorizontal size={14} />
          <span>SOURCE CONTROL</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* Commit Input */}
        <div className="mb-6">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Commit message"
            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-xs text-white mb-2 focus:border-blue-500 outline-none resize-none h-20"
          />
          <button
            onClick={handleCommit}
            disabled={changes.length === 0 || !message.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs py-1.5 rounded flex items-center justify-center gap-2"
          >
            <Check size={12} />
            Commit
          </button>
        </div>

        {/* Changes List */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
            <span>Changes ({changes.length})</span>
          </div>
          <div className="space-y-1">
            {changes.length === 0 && <div className="text-gray-600 text-xs italic">No changes detected</div>}
            {changes.map((change) => (
              <div key={change.name} className="flex items-center justify-between group hover:bg-white/5 p-1 rounded cursor-default">
                <div className="flex items-center gap-2 text-xs text-gray-300 truncate">
                  <span className={`font-mono font-bold w-3 ${
                    change.type === 'M' ? 'text-yellow-500' : 
                    change.type === 'A' ? 'text-green-500' : 'text-red-500'
                  }`}>{change.type}</span>
                  <span className="truncate">{change.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Commit History */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
            <span>Commits ({commits.length})</span>
          </div>
          <div className="space-y-3 relative">
            {commits.map((commit, i) => (
              <div key={commit.id} className="relative pl-4 border-l-2 border-gray-700 pb-2 last:pb-0 group">
                 <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-gray-500 group-hover:bg-blue-500 transition-colors"></div>
                 <div className="flex items-start justify-between">
                     <div>
                         <div className="text-xs text-white font-medium truncate w-32" title={commit.message}>{commit.message}</div>
                         <div className="text-[10px] text-gray-500 flex items-center gap-1">
                             <Clock size={10} />
                             {commit.timestamp}
                         </div>
                     </div>
                     {i !== 0 && (
                        <button 
                            onClick={() => { if(confirm('Revert to this commit? All current changes will be lost.')) onCheckout(commit.id); }}
                            className="p-1 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Checkout (Revert)"
                        >
                            <RotateCcw size={12} />
                        </button>
                     )}
                     {i === 0 && (
                         <span className="text-[10px] bg-blue-900/50 text-blue-400 px-1 rounded border border-blue-900">HEAD</span>
                     )}
                 </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SourceControl;