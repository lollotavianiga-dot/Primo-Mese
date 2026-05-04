import React, { useState, useMemo } from 'react';
import { Search as SearchIcon, File, ChevronRight, ChevronDown, ListFilter, ExternalLink } from 'lucide-react';
import { VirtualFile } from '../types';

interface SearchProps {
  files: VirtualFile[];
  onSelect: (fileName: string) => void;
}

interface SearchResult {
  file: VirtualFile;
  matches: { line: number; text: string }[];
}

const Search: React.FC<SearchProps> = ({ files, onSelect }) => {
  const [query, setQuery] = useState('');
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});

  const toggleExpand = (fileName: string) => {
    setExpandedFiles(prev => ({ ...prev, [fileName]: !prev[fileName] }));
  };

  const results: SearchResult[] = useMemo(() => {
    if (!query.trim()) return [];
    
    const term = query.toLowerCase();
    const searchResults: SearchResult[] = [];

    files.forEach(file => {
      if (file.type === 'directory') return;

      const matches: { line: number; text: string }[] = [];
      
      // Check content
      const lines = file.content.split('\n');
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes(term)) {
          matches.push({
            line: idx + 1,
            text: line.trim()
          });
        }
      });

      // Include if content matched OR filename matched
      if (matches.length > 0 || file.name.toLowerCase().includes(term)) {
        searchResults.push({ file, matches });
      }
    });

    return searchResults;
  }, [files, query]);

  // Auto-expand results with content matches when searching
  useMemo(() => {
      if(query) {
          const newExpanded: Record<string, boolean> = {};
          results.forEach(r => {
             if (r.matches.length > 0) newExpanded[r.file.name] = true;
          });
          setExpandedFiles(newExpanded);
      }
  }, [results.length, query]); 

  return (
    <div className="w-64 bg-browser-toolbar border-r border-gray-700 flex flex-col h-full select-none text-gray-300">
      <div className="h-9 px-3 flex items-center justify-between border-b border-gray-700 bg-[#252526]">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
          <SearchIcon size={14} />
          <span>SEARCH</span>
        </div>
      </div>

      <div className="p-3">
        <div className="relative mb-4">
            <input 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-[#3c3c3c] border border-gray-700 text-white text-xs rounded px-2 py-1.5 pl-8 focus:border-blue-500 outline-none"
                placeholder="Search"
                autoFocus
            />
            <div className="absolute left-2 top-1.5 text-gray-400">
                <SearchIcon size={14} />
            </div>
        </div>

        {query && (
            <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-bold">
                {results.length} files found
            </div>
        )}

        <div className="space-y-1 overflow-y-auto custom-scrollbar" style={{maxHeight: 'calc(100vh - 120px)'}}>
            {results.map(result => {
                const hasContentMatches = result.matches.length > 0;
                
                return (
                    <div key={result.file.name} className="flex flex-col">
                        <div 
                            className="flex items-center gap-1 hover:bg-white/5 p-1 rounded cursor-pointer group"
                            onClick={() => {
                                if (hasContentMatches) {
                                    toggleExpand(result.file.name);
                                } else {
                                    onSelect(result.file.name);
                                }
                            }}
                        >
                            <span className={`text-gray-500 ${!hasContentMatches && 'opacity-0'}`}>
                                {expandedFiles[result.file.name] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </span>
                            <File size={14} className="text-gray-400" />
                            <span className="text-xs text-gray-300 font-medium truncate flex-1" title={result.file.name}>
                                {result.file.name}
                            </span>
                            {hasContentMatches ? (
                                <span className="text-[10px] bg-gray-700 text-gray-300 px-1.5 rounded-full">
                                    {result.matches.length}
                                </span>
                            ) : (
                                <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                                    Open <ExternalLink size={10} />
                                </span>
                            )}
                        </div>

                        {hasContentMatches && expandedFiles[result.file.name] && (
                            <div className="ml-6 space-y-0.5 mt-0.5">
                                {result.matches.map((match, i) => (
                                    <div 
                                        key={i} 
                                        className="text-xs text-gray-400 hover:text-white hover:bg-blue-500/20 px-1 py-0.5 rounded cursor-pointer font-mono truncate flex gap-2"
                                        onClick={() => onSelect(result.file.name)}
                                        title={match.text}
                                    >
                                        <span className="text-gray-600 w-6 text-right flex-shrink-0">{match.line}:</span>
                                        <span className="truncate">{match.text}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
            {query && results.length === 0 && (
                <div className="text-xs text-gray-500 text-center mt-4">No results found.</div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Search;