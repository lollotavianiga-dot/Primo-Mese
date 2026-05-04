import React, { useState } from 'react';
import { ArrowRight, AlertTriangle, Mail, Lock, Phone } from 'lucide-react';
import { User as UserType } from '../types';
import Logo from './Logo';

interface AuthScreenProps {
  onLogin: (user: UserType, token: string) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'options'>('options');
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleAnonAuth = async () => {
    setError('');
    setIsLoading(true);
    try {
      const email = `anon_${Date.now()}@anonymous.local`;
      const password = Math.random().toString(36).slice(-8);
      const username = `Anon_${Date.now().toString().slice(-4)}`;

      const res = await fetch('/api/auth/anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username })
      });

      let data;
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch(e) {
        throw new Error(`Server returned invalid response: ${text.substring(0, 50)}`);
      }

      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      onLogin(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Anonymous login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body = authMode === 'register' ? 
        { email, password, firstName, lastName, phoneNumber } : 
        { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      let data;
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch(e) {
        throw new Error(`Server returned invalid response: ${text.substring(0, 50)}`);
      }
      
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onLogin(data.user, data.token);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen bg-[#0f0f0f] flex items-center justify-center font-sans text-gray-300 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]"></div>
          <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md bg-[#1e1e1e] border border-gray-800 rounded-2xl shadow-2xl p-8 relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-blue-500/20 shadow-lg shadow-blue-500/10">
            <Logo className="text-blue-500" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Deploy Studio</h1>
          <p className="text-gray-500 text-sm">
            {authMode === 'register' ? 'Create an account' : 'Sign in to access your workspace.'}
          </p>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/10 p-3 rounded-lg border border-red-900/30">
              <AlertTriangle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {authMode === 'options' ? (
            <div className="space-y-3">
              <button 
                onClick={() => setAuthMode('login')}
                className="w-full bg-[#2a2a2a] hover:bg-[#333] border border-gray-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-3 transition-all"
              >
                <Mail size={18} />
                Sign in with Email
              </button>
              
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-gray-700"></div>
                <span className="flex-shrink-0 mx-4 text-gray-500 text-xs">OR</span>
                <div className="flex-grow border-t border-gray-700"></div>
              </div>

              <button 
                onClick={handleAnonAuth}
                disabled={isLoading}
                className={`w-full bg-[#2a2a2a] hover:bg-[#333] border border-gray-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-3 transition-all ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
              >
                <span className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Continue Anonymously
                </span>
              </button>
              <p className="text-[10px] text-gray-500 text-center mt-2 leading-relaxed">
                By continuing anonymously, an account is created for you. Note that anonymous accounts will be deleted after 30 days of inactivity.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            
            {authMode === 'register' && (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">First Name</label>
                  <input 
                    type="text" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-[#252526] border border-gray-700 rounded-lg py-2.5 px-3 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Last Name</label>
                  <input 
                    type="text" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-[#252526] border border-gray-700 rounded-lg py-2.5 px-3 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                    placeholder="Doe"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-3 text-gray-500" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#252526] border border-gray-700 rounded-lg py-2.5 pl-10 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-gray-500" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#252526] border border-gray-700 rounded-lg py-2.5 pl-10 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            
            {authMode === 'register' && (
              <div className="animate-in fade-in">
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Phone Number (Required)</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-3 text-gray-500" />
                  <input 
                    type="tel" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-[#252526] border border-gray-700 rounded-lg py-2.5 pl-10 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                    placeholder="+1234567890"
                    required
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1.5">Include country code (e.g., +1 for US, +39 for IT)</p>
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className={`w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all mt-6 shadow-lg shadow-blue-900/20 ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
            >
              {isLoading ? 'Processing...' : (authMode === 'register' ? 'Create Account' : 'Sign In')}
              {!isLoading && <ArrowRight size={16} />}
            </button>

            <div className="flex flex-col items-center gap-3 pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(''); }}
                className="text-xs text-blue-400 hover:underline"
              >
                {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('options'); setError(''); }}
                className="text-xs text-gray-500 hover:text-white"
              >
                Back to all options
              </button>
            </div>
          </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
