import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, ShieldAlert, Wifi, Globe, Server, Activity, Play, Cpu } from 'lucide-react';
import { VirtualFile, User } from '../types';
import { runCodeSimulation } from '../services/geminiService';

interface TerminalProps {
  files: VirtualFile[];
  user: User;
  onUpdateFiles: (files: VirtualFile[]) => void;
  onSelectFile: (fileName: string) => void;
}

interface HistoryItem {
  id: string;
  type: 'input' | 'output' | 'error' | 'success' | 'info';
  content: React.ReactNode | string;
  cwd?: string;
}

// -- REAL NETWORK UTILS --

const dnsLookup = async (domain: string) => {
    try {
        const res = await fetch(`https://dns.google/resolve?name=${domain}`);
        const data = await res.json();
        if (data.Answer) {
            return data.Answer.map((a: any) => `${a.name} ${a.TTL} IN ${a.type === 1 ? 'A' : 'CNAME'} ${a.data}`).join('\n');
        }
        return "No records found.";
    } catch (e) {
        throw new Error("DNS Lookup failed (Network Error)");
    }
};

const geoIpLookup = async (ip: string) => {
    try {
        // Using a public free API for demo purposes
        const res = await fetch(`https://ipapi.co/${ip}/json/`);
        const data = await res.json();
        if (data.error) return "Invalid IP or API limit reached.";
        return Object.entries(data).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join('\n');
    } catch (e) {
        return "GeoIP Lookup failed.";
    }
};

const fetchUrl = async (url: string) => {
    try {
        const res = await fetch(url);
        const text = await res.text();
        return text.slice(0, 2000) + (text.length > 2000 ? '\n... [Content Truncated]' : '');
    } catch (e: any) {
        throw new Error(`Connection failed: ${e.message} (CORS might block this resource)`);
    }
};

const Terminal: React.FC<TerminalProps> = ({ files, user, onUpdateFiles, onSelectFile }) => {
  const [history, setHistory] = useState<HistoryItem[]>([
    { 
        id: 'init', 
        type: 'info', 
        content: (
            <div className="mb-2">
                <div className="text-blue-400 font-bold">DEPLOY OS [KERNEL 5.15.0-generic]</div>
                <div className="text-gray-400">Root access granted. Network interfaces up.</div>
                <div className="text-gray-500 text-xs mt-1">
                    Universal Runtime Environment Loaded.<br/>
                    Supported: Python, Java, C#, C++, Go, Rust, Node.js, PHP, Ruby, SQL.<br/>
                    Type `help` for commands.
                </div>
            </div>
        )
    }
  ]);
  const [cwd, setCwd] = useState<string>('~');
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // -- FILE SYSTEM LOGIC --

  const resolvePath = (path: string): string => {
    if (path === '~' || path === '') return '';
    if (path === '/') return '';
    
    // Handle .. and .
    const currentParts = cwd === '~' ? [] : cwd.split('/');
    const targetParts = path.split('/');
    
    const resolvedParts = [...currentParts];
    
    targetParts.forEach(part => {
        if (part === '.') return;
        if (part === '..') {
            resolvedParts.pop();
        } else if (part === '~') {
            resolvedParts.length = 0; // Reset to root/home
        } else {
            resolvedParts.push(part);
        }
    });
    
    return resolvedParts.join('/');
  };

  const executeCommand = async (cmdStr: string) => {
    const args = cmdStr.trim().split(/\s+/);
    const cmd = args[0].toLowerCase();
    
    // Add Input to history
    setHistory(prev => [...prev, { id: Date.now().toString(), type: 'input', content: cmdStr, cwd }]);
    setInput('');

    const output = async (content: React.ReactNode, type: HistoryItem['type'] = 'output') => {
        setHistory(prev => [...prev, { id: Date.now().toString(), type, content }]);
    };

    // Define environment variables for the terminal session
    const env: Record<string, string> = {
        USER: user.username,
        HOME: '/root',
        SHELL: '/bin/zsh',
        TERM: 'xterm-256color',
        PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
        LANG: 'en_US.UTF-8',
        PWD: cwd === '~' ? '/root' : `/root/${cwd}`,
        EDITOR: 'vim'
    };

    try {
      // -- UNIVERSAL LANGUAGE EXECUTION --
      const langMap: Record<string, string> = {
          'python': 'python', 'python3': 'python', 'py': 'python',
          'node': 'javascript', 'js': 'javascript',
          'go': 'go', 'run': 'go',
          'gcc': 'c', 'cc': 'c',
          'g++': 'cpp', 'cpp': 'cpp',
          'csc': 'csharp', 'dotnet': 'csharp', 'cs': 'csharp',
          'java': 'java', 'javac': 'java',
          'rustc': 'rust', 'cargo': 'rust',
          'php': 'php',
          'ruby': 'ruby',
          'sql': 'sql'
      };

      if (langMap[cmd]) {
          const fileName = args[1];
          if (!fileName) throw new Error(`Usage: ${cmd} <filename>`);
          
          const fullPath = resolvePath(fileName);
          const file = files.find(f => f.name === fullPath);
          
          if (!file) throw new Error(`File not found: ${fileName}`);

          setIsRunning(true);
          output(<div className="flex items-center gap-2 text-yellow-500"><Cpu size={14} className="animate-spin" /> Compiling/Interpreting {fileName}...</div>, 'info');

          try {
              const result = await runCodeSimulation(file.content, langMap[cmd], cmdStr);
              output(result);
          } catch (e: any) {
              output(`Execution Error: ${e.message}`, 'error');
          } finally {
              setIsRunning(false);
          }
          return;
      }

      switch (cmd) {
        case 'help':
          output(`
CORE COMMANDS:
  ls, cd, pwd, mkdir, touch, rm, cat, echo, clear

PROGRAMMING (Universal Runner):
  python <file>     Run Python scripts
  node <file>       Run JavaScript/Node
  csc <file>        Compile & Run C# code
  gcc <file>        Compile & Run C code
  g++ <file>        Compile & Run C++ code
  java <file>       Compile & Run Java
  go run <file>     Run Go programs
  rustc <file>      Compile & Run Rust
  php <file>        Run PHP scripts
  
NETWORK:
  dig, curl, geo, whois, scan

SYSTEM:
  env, whoami, date, git
          `);
          break;

        case 'clear':
          setHistory([]);
          return;

        // -- FILE SYSTEM --
        case 'ls': {
           const pathArg = args[1] || '';
           const targetPath = resolvePath(pathArg);
           const prefix = targetPath ? targetPath + '/' : '';
           
           // Simple filtering
           const items = files.filter(f => {
               if (targetPath === '' && !f.name.includes('/')) return true;
               if (f.name.startsWith(prefix)) {
                   const rest = f.name.slice(prefix.length);
                   return !rest.includes('/');
               }
               return false;
           });

           const res = items.map(f => {
               const name = f.name.split('/').pop();
               if (f.type === 'directory') return <span key={f.name} className="text-blue-400 font-bold mr-4">{name}/</span>;
               if (name?.endsWith('.py')) return <span key={f.name} className="text-blue-300 mr-4">{name}</span>;
               if (name?.endsWith('.c') || name?.endsWith('.cpp')) return <span key={f.name} className="text-purple-400 mr-4">{name}</span>;
               if (name?.endsWith('.js') || name?.endsWith('.ts')) return <span key={f.name} className="text-yellow-400 mr-4">{name}</span>;
               return <span key={f.name} className="text-gray-300 mr-4">{name}</span>;
           });
           output(<div className="flex flex-wrap">{res}</div>);
           break;
        }

        case 'cd': {
            const target = args[1] || '~';
            const newPath = resolvePath(target);
            setCwd(newPath === '' ? '~' : newPath);
            break;
        }

        case 'pwd':
            output(cwd === '~' ? '/root' : `/root/${cwd}`);
            break;

        case 'cat': {
            const fileName = args[1];
            if (!fileName) throw new Error("Usage: cat <filename>");
            const fullPath = resolvePath(fileName);
            const file = files.find(f => f.name === fullPath && f.type !== 'directory');
            if (file) {
                output(file.content);
            } else {
                throw new Error(`File not found: ${fileName}`);
            }
            break;
        }

        case 'mkdir':
        case 'touch': {
            const name = args[1];
            if (!name) throw new Error(`Usage: ${cmd} <name>`);
            const fullPath = resolvePath(name);
            if (files.some(f => f.name === fullPath)) throw new Error("File/Directory already exists");
            
            const type = cmd === 'mkdir' ? 'directory' : 'file';
            // Auto-detect language for touch
            const ext = name.split('.').pop() || 'text';
            let lang = 'text';
            if(['py','python'].includes(ext)) lang = 'python';
            if(['js','ts'].includes(ext)) lang = 'javascript';
            if(['c','cpp','h'].includes(ext)) lang = 'cpp';
            if(['java'].includes(ext)) lang = 'java';
            if(['cs'].includes(ext)) lang = 'csharp';
            
            onUpdateFiles([...files, { name: fullPath, content: '', type, language: lang as any }]);
            output(<span className="text-green-500">Created {type}: {fullPath}</span>, 'success');
            break;
        }

        case 'rm': {
             const name = args[1];
             if (!name) throw new Error("Usage: rm <name>");
             const fullPath = resolvePath(name);
             const newFiles = files.filter(f => f.name !== fullPath && !f.name.startsWith(fullPath + '/'));
             if (newFiles.length === files.length) throw new Error("File not found");
             onUpdateFiles(newFiles);
             output("Deleted.", 'info');
             break;
        }

        case 'git': {
            const subcommand = args[1];
            if (!subcommand) throw new Error("Usage: git <command>");
            
            if (subcommand === 'init') {
                const gitDir = resolvePath('.git');
                
                if (files.some(f => f.name === gitDir || f.name.startsWith(gitDir + '/'))) {
                    output("Reinitialized existing Git repository in " + (cwd === '~' ? '/root' : `/root/${cwd}`) + "/.git/", 'info');
                } else {
                    const newFiles = [
                        ...files,
                        { name: gitDir, content: '', type: 'directory' as const, language: 'text' as const },
                        { name: resolvePath('.git/config'), content: '[core]\n\trepositoryformatversion = 0\n\tfilemode = true\n\tbare = false\n\tlogallrefupdates = true\n', type: 'file' as const, language: 'text' as const },
                        { name: resolvePath('.git/HEAD'), content: 'ref: refs/heads/main\n', type: 'file' as const, language: 'text' as const }
                    ];
                    
                    onUpdateFiles(newFiles as VirtualFile[]);
                    output("Initialized empty Git repository in " + (cwd === '~' ? '/root' : `/root/${cwd}`) + "/.git/", 'success');
                }
            } else {
                throw new Error(`git: '${subcommand}' is not a supported git command in this terminal.`);
            }
            break;
        }

        // -- REAL NETWORKING --
        case 'dig': {
            const domain = args[1];
            if (!domain) throw new Error("Usage: dig <domain>");
            output(<span className="text-yellow-500">Querying Google DNS (8.8.8.8) for {domain}...</span>, 'info');
            try {
                const result = await dnsLookup(domain);
                output(result);
            } catch (e: any) {
                throw e;
            }
            break;
        }

        case 'geo': {
            const ip = args[1];
            if (!ip) throw new Error("Usage: geo <ip_address>");
            output(<span className="text-yellow-500">Locating target {ip}...</span>, 'info');
            const res = await geoIpLookup(ip);
            output(res);
            break;
        }

        case 'curl': {
            let url = args[1];
            if (!url) throw new Error("Usage: curl <url>");
            if (!url.startsWith('http')) url = 'https://' + url;
            output(<span className="text-yellow-500">Sending GET request to {url}...</span>, 'info');
            const content = await fetchUrl(url);
            output(content);
            break;
        }

        case 'whois': {
            const domain = args[1];
            if (!domain) throw new Error("Usage: whois <domain>");
            output(`
Domain Name: ${domain.toUpperCase()}
Registry Domain ID: 235235_DOMAIN_COM-VRSN
Registrar WHOIS Server: whois.registrar.com
Registrar URL: http://www.registrar.com
Updated Date: 2024-01-15T04:22:11Z
Creation Date: 2020-05-12T11:00:00Z
Registry Expiry Date: 2025-05-12T11:00:00Z
Registrar: MarkMonitor Inc.
Registrar IANA ID: 292
Domain Status: clientTransferProhibited
Name Server: NS1.GOOGLE.COM
Name Server: NS2.GOOGLE.COM
DNSSEC: unsigned
            `);
            break;
        }

        // -- HACKER TOOLS --
        case 'scan': {
            const target = args[1];
            if (!target) throw new Error("Usage: scan <target>");
            output(<div className="text-green-400">Starting Nmap 7.92 ( https://nmap.org ) at {new Date().toLocaleTimeString()}</div>, 'info');
            
            // Simulation of a scan
            await new Promise(r => setTimeout(r, 800));
            output("Initiating SYN Stealth Scan...");
            await new Promise(r => setTimeout(r, 1200));
            
            output(
                <div className="font-mono">
                    <div>Nmap scan report for {target}</div>
                    <div>Host is up (0.0023s latency).</div>
                    <br/>
                    <div className="flex border-b border-gray-700 w-64 mb-1 text-gray-400">
                        <span className="w-16">PORT</span>
                        <span className="w-20">STATE</span>
                        <span>SERVICE</span>
                    </div>
                    {[
                        {p: '22/tcp', s: 'open', v: 'ssh'},
                        {p: '80/tcp', s: 'open', v: 'http'},
                        {p: '443/tcp', s: 'open', v: 'https'},
                        {p: '3306/tcp', s: 'filtered', v: 'mysql'},
                        {p: '8080/tcp', s: 'closed', v: 'http-proxy'}
                    ].map(row => (
                        <div key={row.p} className="flex w-64 text-gray-300">
                            <span className="w-16 text-yellow-500">{row.p}</span>
                            <span className={`w-20 ${row.s === 'open' ? 'text-green-500' : 'text-red-500'}`}>{row.s}</span>
                            <span>{row.v}</span>
                        </div>
                    ))}
                    <br/>
                    <div>Nmap done: 1 IP address (1 host up) scanned in 2.45 seconds</div>
                </div>
            );
            break;
        }

        case 'matrix': {
            output("Follow the white rabbit...", 'info');
            break;
        }

        case 'env':
            output(Object.entries(env).map(([k,v]) => `${k}=${v}`).join('\n'));
            break;

        case 'whoami':
            output(<span className="text-green-400 font-bold">{user.username}</span>);
            break;
        
        case 'date':
            output(new Date().toString());
            break;

        case '':
            break;

        default:
           throw new Error(`zsh: command not found: ${cmd}`);
      }
    } catch (e: any) {
        output(e.message, 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#050505] font-mono text-sm overflow-hidden h-full relative" onClick={() => inputRef.current?.focus()}>
      
      {/* OS Status Bar */}
      <div className="h-8 bg-[#1a1a1a] flex items-center justify-between px-4 border-b border-gray-800 select-none z-10">
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-400">
                  <TerminalIcon size={12} className="text-blue-500" />
                  <span className="text-xs font-bold">root@{user.username}: {cwd === '~' ? '/root' : cwd}</span>
              </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-gray-500 font-bold">
              {isRunning && (
                   <div className="flex items-center gap-1.5 text-yellow-500 animate-pulse"><Cpu size={10} /> EXEC</div>
              )}
              <div className="flex items-center gap-1.5"><Wifi size={10} className="text-green-500"/> ETH0: 192.168.1.42</div>
              <div className="flex items-center gap-1.5"><Activity size={10} className="text-blue-500"/> CPU: {isRunning ? '89%' : '12%'}</div>
              <div className="flex items-center gap-1.5"><Server size={10} className="text-purple-500"/> RAM: 4.2GB / 16GB</div>
          </div>
      </div>
      
      {/* Terminal Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-12">
         {history.map((item) => (
             <div key={item.id} className="mb-1.5 leading-relaxed break-all">
                 {item.type === 'input' && (
                     <div className="flex items-center text-gray-100 mt-4 mb-1">
                         <span className="text-green-500 font-bold mr-2">➜</span>
                         <span className="text-blue-400 font-bold mr-2">{item.cwd || '~'}</span>
                         <span className="opacity-90">{item.content}</span>
                     </div>
                 )}
                 {item.type === 'output' && (
                     <div className="text-gray-300 ml-5 whitespace-pre-wrap font-mono">{item.content}</div>
                 )}
                 {item.type === 'info' && (
                     <div className="text-blue-300 ml-5 whitespace-pre-wrap flex items-start gap-2 border-l-2 border-blue-500/50 pl-2 py-1">
                         {item.content}
                     </div>
                 )}
                 {item.type === 'success' && (
                     <div className="text-green-400 ml-5 flex items-center gap-2">
                         <span>✔</span> {item.content}
                     </div>
                 )}
                 {item.type === 'error' && (
                     <div className="text-red-400 ml-5 flex items-start gap-2 bg-red-900/10 p-2 rounded">
                         <ShieldAlert size={14} className="mt-0.5 flex-shrink-0" />
                         <span>{item.content}</span>
                     </div>
                 )}
             </div>
         ))}
         
         {/* Input Line */}
         <div className="flex items-center text-gray-100 mt-2 ml-0 animate-in fade-in duration-200">
             <span className="text-green-500 font-bold mr-2">➜</span>
             <span className="text-blue-400 font-bold mr-2">{cwd === '' ? '~' : cwd}</span>
             <div className="flex-1 relative">
                 <input 
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter') executeCommand(input);
                    }}
                    disabled={isRunning}
                    className="w-full bg-transparent border-none outline-none text-white font-medium caret-white disabled:opacity-50"
                    autoComplete="off"
                    autoFocus
                    spellCheck={false}
                 />
             </div>
         </div>
         <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default Terminal;