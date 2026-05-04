
export interface Tab {
  id: string;
  title: string;
  type: 'editor' | 'preview' | 'browser';
  url: string;
  loading: boolean;
  content?: any; // For browser search results or cached content
  readerContent?: string; // For AI Reader mode
  viewMode?: 'live' | 'reader';
  scrollPos?: number;
}

export interface User {
  username: string;
  email?: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  lastLogin: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'log' | 'command' | 'success';
  message: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; // base64
  video?: string; // url
  audio?: string; // base64
  isError?: boolean;
}

export enum LayoutMode {
  SPLIT = 'SPLIT',
  FULL = 'FULL'
}

export type ChatMode = 'standard' | 'thinking' | 'search' | 'maps' | 'fast';

export type AspectRatio = "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "9:16" | "16:9" | "21:9";
export type ImageSize = "1K" | "2K" | "4K";
export type VideoResolution = "720p" | "1080p";

export interface VirtualFile {
  name: string; // Full path
  content: string;
  // Expanded Language Support
  language: 'html' | 'css' | 'javascript' | 'json' | 'typescript' | 'markdown' | 'text' | 
            'python' | 'java' | 'c' | 'cpp' | 'csharp' | 'go' | 'rust' | 'php' | 'ruby' | 
            'swift' | 'kotlin' | 'sql' | 'xml' | 'yaml' | 'shell';
  type?: 'file' | 'directory';
}

export interface GitCommit {
  id: string;
  message: string;
  timestamp: string;
  files: VirtualFile[]; // Snapshot of files at this commit
}

export type SidebarView = 'explorer' | 'search' | 'git' | 'deploy' | 'terminal' | 'contact' | 'profile' | 'courses';