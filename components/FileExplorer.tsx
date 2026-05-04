import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FileCode, FileJson, FileType, File, FolderOpen, Folder, FolderPlus, FilePlus, Edit2, Trash2, ChevronRight, ChevronDown, Download, Upload, Database, Code, Braces, AlertTriangle } from 'lucide-react';
import { VirtualFile } from '../types';

interface FileExplorerProps {
  files: VirtualFile[];
  activeFileName: string;
  onSelect: (fileName: string) => void;
  onCreate: (fileName: string) => void;
  onCreateFolder: (folderName: string) => void;
  onDelete: (fileName: string) => void;
  onRename: (oldName: string, newName: string) => void;
  onImport?: (files: VirtualFile[]) => void;
}

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  // Web Standard
  if (ext === 'html') return <FileCode size={14} className="text-orange-500" />;
  if (ext === 'css') return <FileType size={14} className="text-blue-400" />;
  if (ext === 'js' || ext === 'jsx') return <FileCode size={14} className="text-yellow-400" />;
  if (ext === 'ts' || ext === 'tsx') return <FileCode size={14} className="text-blue-500" />;
  if (ext === 'json') return <Braces size={14} className="text-green-400" />;
  
  // Backend / Systems
  if (ext === 'py') return <FileCode size={14} className="text-blue-300" />; // Python
  if (ext === 'java' || ext === 'jar') return <FileCode size={14} className="text-red-400" />; // Java
  if (ext === 'c' || ext === 'h') return <Code size={14} className="text-gray-300" />; // C
  if (ext === 'cpp' || ext === 'hpp') return <Code size={14} className="text-blue-600" />; // C++
  if (ext === 'cs') return <Code size={14} className="text-purple-500" />; // C#
  if (ext === 'rs') return <Code size={14} className="text-orange-600" />; // Rust
  if (ext === 'go') return <Code size={14} className="text-cyan-400" />; // Go
  if (ext === 'php') return <FileCode size={14} className="text-indigo-400" />; // PHP
  if (ext === 'rb') return <FileCode size={14} className="text-red-600" />; // Ruby
  
  // Data / Config
  if (ext === 'sql') return <Database size={14} className="text-pink-400" />;
  if (ext === 'xml') return <Code size={14} className="text-orange-300" />;
  if (ext === 'yaml' || ext === 'yml') return <File size={14} className="text-purple-300" />;
  if (ext === 'md') return <File size={14} className="text-white" />;
  
  return <File size={14} className="text-gray-400" />;
};

// Tree Building Logic
interface TreeNode {
  id: string; // full path
  name: string; // segment name
  type: 'file' | 'directory';
  children: Record<string, TreeNode>;
  isOpen: boolean;
}

const buildTree = (files: VirtualFile[]) => {
  const root: Record<string, TreeNode> = {};
  
  // Sort files so folders come first, then alphabetical
  const sorted = [...files].sort((a, b) => {
      const typeA = a.type || 'file';
      const typeB = b.type || 'file';
      if (typeA !== typeB) return typeA === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
  });

  sorted.forEach(file => {
    const parts = file.name.split('/');
    let currentLevel = root;
    
    parts.forEach((part, index) => {
      const path = parts.slice(0, index + 1).join('/');
      const isFile = index === parts.length - 1 && file.type !== 'directory';
      
      if (!currentLevel[part]) {
        currentLevel[part] = {
          id: path,
          name: part,
          type: isFile ? 'file' : 'directory',
          children: {},
          isOpen: true // default open for demo
        };
      }
      currentLevel = currentLevel[part].children;
    });
  });

  return root;
};

const FileTreeItem: React.FC<{
  node: TreeNode;
  level: number;
  activeFileName: string;
  onSelect: (path: string) => void;
  onDelete: (path: string) => void;
  onRename: (oldPath: string, newPath: string) => void;
  selectedPath: string | null;
  setSelectedPath: (path: string | null) => void;
}> = ({ node, level, activeFileName, onSelect, onDelete, onRename, selectedPath, setSelectedPath }) => {
  const [isOpen, setIsOpen] = useState(node.isOpen);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
        inputRef.current.focus();
        // Smart selection: select name but not extension
        const dotIndex = renameValue.lastIndexOf('.');
        if (node.type === 'file' && dotIndex > 0) {
            inputRef.current.setSelectionRange(0, dotIndex);
        } else {
            inputRef.current.select();
        }
    }
  }, [isRenaming]);

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (renameValue && renameValue !== node.name) {
       // Construct new path
       const parentPath = node.id.substring(0, node.id.lastIndexOf('/'));
       const newPath = parentPath ? `${parentPath}/${renameValue}` : renameValue;
       onRename(node.id, newPath);
    } else {
       setRenameValue(node.name);
    }
    setIsRenaming(false);
  };

  const hasChildren = Object.keys(node.children).length > 0;
  const isSelected = selectedPath === node.id;
  const isActive = activeFileName === node.id;

  return (
    <div className="select-none">
      <div 
        className={`flex items-center gap-1 py-1 px-2 cursor-pointer transition-colors ${
            isActive ? 'bg-browser-tab text-white' : 
            isSelected ? 'bg-white/10 text-gray-200' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={(e) => {
            e.stopPropagation();
            setSelectedPath(node.id);
            if (node.type === 'directory') {
                setIsOpen(!isOpen);
            } else {
                onSelect(node.id);
            }
        }}
      >
        <span className="opacity-70 flex-shrink-0 w-4">
            {node.type === 'directory' && (
                isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />
            )}
        </span>
        
        {isRenaming ? (
            <form onSubmit={handleRenameSubmit} onClick={e => e.stopPropagation()} className="flex-1 min-w-0">
                <input
                    ref={inputRef}
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={handleRenameSubmit}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            setRenameValue(node.name);
                            setIsRenaming(false);
                        }
                    }}
                    className="w-full bg-gray-800 text-white text-xs px-1 py-0.5 rounded border border-blue-500 outline-none"
                    onClick={e => e.stopPropagation()}
                />
            </form>
        ) : (
            <div className="flex-1 flex items-center justify-between min-w-0 group">
                <div 
                    className="flex items-center gap-2 truncate"
                    title="Double click to rename"
                    onDoubleClick={(e) => {
                         e.stopPropagation();
                         setIsRenaming(true);
                    }}
                >
                    {node.type === 'directory' ? (
                        isOpen ? <FolderOpen size={14} className="text-blue-300" /> : <Folder size={14} className="text-blue-300" />
                    ) : (
                        getFileIcon(node.name)
                    )}
                    <span className="truncate text-xs">{node.name}</span>
                </div>
                <div className="hidden group-hover:flex items-center gap-1 bg-[#252526] shadow-sm ml-2">
                     <button onClick={(e) => { e.stopPropagation(); setIsRenaming(true); }} className="p-0.5 hover:text-blue-400">
                         <Edit2 size={10} />
                     </button>
                     <button onClick={(e) => { e.stopPropagation(); onDelete(node.id); }} className="p-0.5 hover:text-red-400">
                         <Trash2 size={10} />
                     </button>
                </div>
            </div>
        )}
      </div>

      {node.type === 'directory' && isOpen && (
          <div>
              {Object.values(node.children)
                .sort((a: TreeNode, b: TreeNode) => {
                    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
                    return a.name.localeCompare(b.name);
                })
                .map((child: TreeNode) => (
                  <FileTreeItem 
                    key={child.id} 
                    node={child} 
                    level={level + 1} 
                    activeFileName={activeFileName}
                    onSelect={onSelect}
                    onDelete={onDelete}
                    onRename={onRename}
                    selectedPath={selectedPath}
                    setSelectedPath={setSelectedPath}
                  />
              ))}
          </div>
      )}
    </div>
  );
};

const FileExplorer: React.FC<FileExplorerProps> = ({ files, activeFileName, onSelect, onCreate, onCreateFolder, onDelete, onRename, onImport }) => {
  const [isCreating, setIsCreating] = useState<'file' | 'folder' | null>(null);
  const [newName, setNewName] = useState('');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileTree = useMemo(() => buildTree(files), [files]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) {
        setIsCreating(null);
        return;
    }

    // Determine path based on selection
    let parentPath = '';
    if (selectedPath) {
        const selectedFile = files.find(f => f.name === selectedPath);
        if (selectedFile?.type === 'directory') {
            parentPath = selectedPath;
        } else {
            const parts = selectedPath.split('/');
            parts.pop();
            parentPath = parts.join('/');
        }
    }

    const fullPath = parentPath ? `${parentPath}/${newName}` : newName;

    if (isCreating === 'file') {
        onCreate(fullPath);
    } else {
        onCreateFolder(fullPath);
    }
    
    setNewName('');
    setIsCreating(null);
  };

  const handleConfirmDelete = () => {
      if (itemToDelete) {
          onDelete(itemToDelete);
          setItemToDelete(null);
      }
  };

  const handleDownload = () => {
    const data = JSON.stringify(files, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !onImport) return;
      
      const reader = new FileReader();
      reader.onload = (ev) => {
          try {
              const content = JSON.parse(ev.target?.result as string);
              if (Array.isArray(content)) {
                  onImport(content);
              } else {
                  alert('Invalid project file format');
              }
          } catch(err) {
              alert('Failed to parse project file');
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  return (
    <div className="w-60 bg-browser-toolbar border-r border-gray-700 flex flex-col h-full select-none relative" onClick={() => setSelectedPath(null)}>
      <div className="h-9 px-3 flex items-center justify-between border-b border-gray-700 bg-[#252526]">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
          <FolderOpen size={14} />
          <span>EXPLORER</span>
        </div>
        <div className="flex items-center gap-1">
             {/* Import/Export */}
            {onImport && (
                <>
                    <button 
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        className="text-gray-400 hover:text-blue-400 p-1 hover:bg-white/10 rounded"
                        title="Import Project from Disk"
                    >
                        <Upload size={14} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                        className="text-gray-400 hover:text-green-400 p-1 hover:bg-white/10 rounded"
                        title="Export Project to Disk"
                    >
                        <Download size={14} />
                    </button>
                    <div className="w-px h-3 bg-gray-700 mx-1"></div>
                </>
            )}

            <button 
                onClick={(e) => { e.stopPropagation(); setIsCreating('file'); }} 
                className="text-gray-400 hover:text-white p-1 hover:bg-white/10 rounded"
                title="New File"
            >
                <FilePlus size={14} />
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); setIsCreating('folder'); }} 
                className="text-gray-400 hover:text-white p-1 hover:bg-white/10 rounded"
                title="New Folder"
            >
                <FolderPlus size={14} />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
        {isCreating && (
          <div className="px-2 mb-2">
            <form onSubmit={handleCreateSubmit} className="flex items-center gap-1 bg-gray-800 border border-blue-500 px-2 py-1 rounded">
               {isCreating === 'folder' ? <Folder size={12} className="text-gray-400" /> : <File size={12} className="text-gray-400" />}
               <input
                 autoFocus
                 type="text"
                 value={newName}
                 onChange={(e) => setNewName(e.target.value)}
                 onBlur={() => { if(!newName) setIsCreating(null); }}
                 placeholder={isCreating === 'folder' ? "folder_name" : "filename.ext"}
                 className="w-full bg-transparent text-xs text-white outline-none"
                 onClick={e => e.stopPropagation()}
               />
            </form>
          </div>
        )}

        {Object.values(fileTree).map((node: TreeNode) => (
            <FileTreeItem 
                key={node.id} 
                node={node} 
                level={0}
                activeFileName={activeFileName}
                onSelect={onSelect}
                onDelete={setItemToDelete}
                onRename={onRename}
                selectedPath={selectedPath}
                setSelectedPath={setSelectedPath}
            />
        ))}
      </div>
      
      {/* Hidden Upload Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleUpload} 
        className="hidden" 
        accept=".json"
      />

      {/* Delete Confirmation Overlay */}
      {itemToDelete && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="bg-[#252526] border border-red-900/50 shadow-2xl rounded-xl w-full p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                      <AlertTriangle size={16} />
                      <span>Delete Item?</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Are you sure you want to delete <span className="text-white font-mono bg-white/10 px-1 rounded">{itemToDelete.split('/').pop()}</span>?
                    <br/><span className="opacity-70">This action cannot be undone.</span>
                  </p>
                  <div className="flex gap-2 mt-1">
                      <button 
                        onClick={() => setItemToDelete(null)}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs py-2 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleConfirmDelete}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs py-2 rounded-lg transition-colors shadow-lg shadow-red-900/20"
                      >
                        Delete
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default FileExplorer;