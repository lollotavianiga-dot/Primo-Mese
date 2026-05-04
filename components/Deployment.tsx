// File: components/Deployment.tsx
import React, { useState } from 'react';
import { Rocket, Globe, CheckCircle, Loader2, ExternalLink, AlertCircle, Server, Copy } from 'lucide-react';
import { VirtualFile } from '../types';

interface DeploymentProps {
  files: VirtualFile[];
}

const Deployment: React.FC<DeploymentProps> = ({ files }) => {
  const [domain, setDomain] = useState('');
  const [status, setStatus] = useState<'idle' | 'building' | 'deployed' | 'error'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleDeploy = async () => {
    if (!domain.trim()) return;

    setStatus('building');
    setLogs(['Initializing build environment...']);
    setDeployedUrl(null);

    // Simulate build steps
    await new Promise(r => setTimeout(r, 800));
    setLogs(p => [...p, 'Bundling assets...']);
    
    // Bundle Logic
    try {
        const entryPoint = files.find(f => f.name === 'index.html');
        if (!entryPoint) throw new Error("Missing index.html");

        let html = entryPoint.content;
        
        // Inline CSS
        html = html.replace(/<link[^>]+>/g, (match) => {
          if (!match.includes('rel="stylesheet"')) return match;
          const hrefMatch = match.match(/href="([^"]+)"/);
          if (!hrefMatch) return match;
          
          const href = hrefMatch[1];
          const cssFile = files.find(f => f.name === href);
          return cssFile ? `<style>/* Inlined ${href} */\n${cssFile.content}</style>` : match;
        });
        
        // Inline JS
        html = html.replace(/<script[^>]+src="([^"]+)"[^>]*><\/script>/g, (match, src) => {
          const jsFile = files.find(f => f.name === src);
          return jsFile ? `<script>/* Inlined ${src} */\n${jsFile.content}</script>` : match;
        });

        await new Promise(r => setTimeout(r, 800));
        setLogs(p => [...p, 'Optimizing build...']);
        
        await new Promise(r => setTimeout(r, 800));
        setLogs(p => [...p, 'Uploading to CDN...']);
        
        await new Promise(r => setTimeout(r, 600));

        // Save to DB
        const token = localStorage.getItem('token');
        if (token) {
          const response = await fetch('/api/deploy/subdomain', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                  name: domain,
                  subdomain: domain,
                  bundledContent: html
              })
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.previewUrl) setPreviewUrl(window.location.origin + data.previewUrl);
          }
        }
        
        // Simulating deployment success
        setStatus('deployed');
        setDeployedUrl(`https://${domain.toLowerCase()}`);
        setLogs(p => [...p, 'Project ready for domain binding...', 'Please configure DNS records.', 'Deployment successful!']);

    } catch (e: any) {
        setStatus('error');
        setLogs(p => [...p, `Build failed: ${e.message}`]);
    }
  };

  return (
    <div className="w-64 bg-browser-toolbar border-r border-gray-700 flex flex-col h-full select-none text-gray-300">
      <div className="h-9 px-3 flex items-center justify-between border-b border-gray-700 bg-[#252526]">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
          <Rocket size={14} />
          <span>DEPLOYMENT</span>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
         <div className="mb-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Custom Domain</h3>
            <div className="flex items-center bg-gray-900 border border-gray-700 rounded-md overflow-hidden focus-within:border-blue-500 transition-colors">
                <div className="pl-3 pr-2 text-gray-500">
                    <Globe size={14} />
                </div>
                <input 
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, ''))}
                    placeholder="www.yourdomain.com"
                    className="flex-1 bg-transparent border-none outline-none text-xs text-white py-2 pr-3"
                    disabled={status === 'building'}
                />
            </div>
            <p className="text-[10px] text-gray-500 mt-2">
                Enter your custom domain (e.g., www.example.com) to deploy. A domain is required to publish.
            </p>
         </div>

         {status === 'deployed' ? (
             <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-6 animate-in fade-in zoom-in duration-300">
                 <div className="flex items-center gap-2 text-blue-400 font-bold text-xs mb-2">
                     <CheckCircle size={14} />
                     <span>Ready for DNS Setup</span>
                 </div>
                 
                 <div className="text-[10px] text-gray-300 mb-3">
                    To connect your domain, add the following DNS record to your domain provider (e.g. GoDaddy, Namecheap):
                 </div>
                 
                 <div className="bg-black/40 border border-white/5 rounded-md p-2 mb-3">
                    <div className="grid grid-cols-[auto_1fr_1fr] md:grid-cols-[auto_1fr_1fr_auto] gap-2 text-[9px] font-mono text-gray-400 mb-1">
                        <div>TYPE</div>
                        <div>NAME</div>
                        <div className="col-span-2">VALUE</div>
                    </div>
                    {domain.startsWith('www.') && (
                    <div className="grid grid-cols-[auto_1fr_1fr] md:grid-cols-[auto_1fr_1fr_auto] gap-2 text-[10px] font-mono text-white mt-1 pt-1 items-center">
                        <div>CNAME</div>
                        <div>www</div>
                        <div className="text-blue-400 truncate">{window.location.hostname}</div>
                        <button onClick={() => handleCopy(window.location.hostname)} className="text-gray-500 hover:text-white transition-colors" title="Copy Value">
                            {copiedText === window.location.hostname ? <CheckCircle size={10} className="text-green-500" /> : <Copy size={10} />}
                        </button>
                    </div>
                    )}
                    <div className="grid grid-cols-[auto_1fr_1fr] md:grid-cols-[auto_1fr_1fr_auto] gap-2 text-[10px] font-mono text-white mt-1 pt-1 border-t border-white/10 items-center">
                        <div>CNAME</div>
                        <div>@</div>
                        <div className="text-blue-400 truncate">{window.location.hostname}</div>
                        <button onClick={() => handleCopy(window.location.hostname)} className="text-gray-500 hover:text-white transition-colors" title="Copy Value">
                            {copiedText === window.location.hostname ? <CheckCircle size={10} className="text-green-500" /> : <Copy size={10} />}
                        </button>
                    </div>
                 </div>
                 
                 <div className="flex items-start gap-1.5 text-[9px] text-gray-500 mb-4">
                    <Server size={10} className="mt-0.5 flex-shrink-0" />
                    <p>DNS changes may take up to 48 hours to propagate globally. Since this is a restricted preview environment, custom domains (including Vercel IP or custom CNAME) will not work. Access your site via the Preview Link below:</p>
                 </div>

                 {previewUrl && (
                     <a 
                        href={previewUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium py-1.5 rounded transition-colors mb-2"
                     >
                        <ExternalLink size={12} />
                        Visit Preview Site
                     </a>
                 )}

                 <button 
                    onClick={() => setStatus('idle')}
                    className="w-full bg-transparent border border-gray-600 hover:bg-gray-800 text-gray-300 text-xs font-medium py-1.5 rounded transition-colors"
                 >
                    Deploy New Version
                 </button>
             </div>
         ) : (
             <button
                onClick={handleDeploy}
                disabled={status === 'building' || !domain}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium py-2 rounded flex items-center justify-center gap-2 transition-all"
             >
                 {status === 'building' ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
                 {status === 'building' ? 'Deploying...' : 'Publish Project'}
             </button>
         )}

         {/* Logs / Status */}
         {(status === 'building' || status === 'error' || logs.length > 0) && (
             <div className="mt-6">
                 <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Build Logs</h3>
                 <div className="bg-black/40 rounded-lg p-3 font-mono text-[10px] space-y-1.5 h-40 overflow-y-auto custom-scrollbar border border-white/5">
                     {logs.map((log, i) => (
                         <div key={i} className={`flex items-start gap-2 ${log.includes('failed') ? 'text-red-400' : log.includes('successful') ? 'text-green-400' : 'text-gray-400'}`}>
                             <span className="opacity-50 select-none">{'>'}</span>
                             <span>{log}</span>
                         </div>
                     ))}
                     {status === 'building' && (
                         <div className="flex items-center gap-2 text-blue-400 animate-pulse">
                             <span className="opacity-50">{'>'}</span>
                             <span>Working...</span>
                         </div>
                     )}
                 </div>
             </div>
         )}

         {status === 'error' && (
             <div className="mt-4 flex items-center gap-2 text-red-400 text-xs bg-red-900/10 p-2 rounded border border-red-500/20">
                 <AlertCircle size={14} />
                 <span>Deployment Failed</span>
             </div>
         )}
      </div>
    </div>
  );
};

export default Deployment;