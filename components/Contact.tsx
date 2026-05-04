import React, { useState } from 'react';
import { Mail, Send, CheckCircle, Copy, MessageSquare } from 'lucide-react';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.message) return;

    setStatus('sending');
    
    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('Message sent:', formData);
    setStatus('success');
    
    // Reset form after delay
    setTimeout(() => {
        setFormData({ email: '', firstName: '', lastName: '', message: '' });
        setStatus('idle');
    }, 3000);
  };

  const copyEmail = () => {
      navigator.clipboard.writeText("info@deploystudio.org");
      alert("Email copied to clipboard!");
  };

  return (
    <div className="w-64 bg-browser-toolbar border-r border-gray-700 flex flex-col h-full select-none text-gray-300">
      <div className="h-9 px-3 flex items-center justify-between border-b border-gray-700 bg-[#252526]">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
          <MessageSquare size={14} />
          <span>CONTACT US</span>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
        
        {/* Official Email Display */}
        <div className="mb-6 bg-gray-800/50 p-3 rounded-lg border border-gray-700">
            <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Official Support</div>
            <div className="flex items-center gap-2 text-blue-400 font-mono text-xs mb-2 break-all">
                <Mail size={12} />
                <span>info@deploystudio.org</span>
            </div>
            <button 
                onClick={copyEmail}
                className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white text-[10px] py-1.5 rounded transition-colors"
            >
                <Copy size={10} /> Copy Address
            </button>
        </div>

        <div className="border-t border-gray-700 mb-6"></div>

        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Send a Message</h3>

        {status === 'success' ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6 flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 mb-3">
                    <CheckCircle size={20} />
                </div>
                <h4 className="text-white font-medium text-sm mb-1">Message Sent!</h4>
                <p className="text-xs text-gray-400">We'll get back to you shortly.</p>
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-[10px] text-gray-500 mb-1">First Name</label>
                        <input 
                            type="text"
                            required
                            value={formData.firstName}
                            onChange={e => setFormData({...formData, firstName: e.target.value})}
                            className="w-full bg-[#3c3c3c] border border-gray-700 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                            placeholder="John"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] text-gray-500 mb-1">Last Name</label>
                        <input 
                            type="text"
                            required
                            value={formData.lastName}
                            onChange={e => setFormData({...formData, lastName: e.target.value})}
                            className="w-full bg-[#3c3c3c] border border-gray-700 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                            placeholder="Doe"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Email Address</label>
                    <input 
                        type="email"
                        required
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-[#3c3c3c] border border-gray-700 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                        placeholder="john@example.com"
                    />
                </div>

                <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Message</label>
                    <textarea 
                        required
                        rows={4}
                        value={formData.message}
                        onChange={e => setFormData({...formData, message: e.target.value})}
                        className="w-full bg-[#3c3c3c] border border-gray-700 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500 resize-none"
                        placeholder="How can we help you?"
                    />
                </div>

                <button 
                    type="submit"
                    disabled={status === 'sending'}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded flex items-center justify-center gap-2 text-xs font-medium transition-colors"
                >
                    {status === 'sending' ? 'Sending...' : (
                        <>
                            <Send size={12} /> Send Message
                        </>
                    )}
                </button>
            </form>
        )}
      </div>
    </div>
  );
};

export default Contact;