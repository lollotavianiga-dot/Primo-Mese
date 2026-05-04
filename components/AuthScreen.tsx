import React, { useState } from 'react';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { User as UserType } from '../types';
import Logo from './Logo';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface AuthScreenProps {
  onLogin: (user: UserType, token: string) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userRef = doc(db, 'users', user.uid);
      let userDoc;
      try {
        userDoc = await getDoc(userRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'users');
      }

      let userData: UserType;

      if (!userDoc || !userDoc.exists()) {
        userData = {
          username: user.displayName || user.email?.split('@')[0] || 'User',
          email: user.email || undefined,
          lastLogin: new Date().toISOString()
        };
        try {
          // Note: incoming email must strictly match request.auth.token.email per our rules
          await setDoc(userRef, {
            ...userData,
            email: user.email || ""
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'users');
        }
      } else {
        userData = userDoc.data() as UserType;
        try {
          await setDoc(userRef, {
            ...userData,
            lastLogin: new Date().toISOString()
          }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, 'users');
        }
      }

      onLogin(userData, await user.getIdToken());
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
          <p className="text-gray-500 text-sm">Sign in to access your workspace.</p>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/10 p-3 rounded-lg border border-red-900/30">
              <AlertTriangle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            <button 
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className={`w-full bg-white hover:bg-gray-100 text-gray-900 font-medium py-3 rounded-lg flex items-center justify-center gap-3 transition-all ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
            >
              <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                <path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.222 0-9.649-3.342-11.127-8.086l-6.572 4.819C9.656 39.663 16.318 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
              </svg>
              Sign in with Google
            </button>
            <p className="text-[10px] text-gray-500 text-center mt-2 leading-relaxed">
              We've migrated to Google Authentication for better security.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
