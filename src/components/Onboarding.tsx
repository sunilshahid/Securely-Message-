import React, { useState } from 'react';
import { Camera, Settings, Key, Zap, CheckCircle2, User, Phone, Check, Shield, Eye, EyeOff } from 'lucide-react';
import { generateSignalIdentity, exportIdentity, importIdentity, sha256Hex, encryptIdentityWithPassword, decryptIdentityWithPassword, bufferToBase64 } from '../crypto';

export type SignalIdentity = {
  registrationId: number;
  identityKeyPair: any;
  signedPreKey: any;
  preKeys: any[];
  securelyId: string;
  displayName?: string;
  username?: string;
  phoneNumber?: string;
  photoUrl?: string;
  about?: string;
};

type OnboardingProps = {
  onIdentityCreated: (identity: SignalIdentity) => void;
};

export default function Onboarding({ onIdentityCreated }: OnboardingProps) {
  const [step, setStep] = useState<'intro' | 'signup_profile' | 'login_profile' | 'generating' | 'success'>('intro');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignup = async () => {
    if (!password) {
      setErrorMsg("Password is required to secure your keys.");
      return;
    }
    if (!username || username.trim() === "" || username.includes(" ")) {
      setErrorMsg("Username is required and cannot contain spaces.");
      return;
    }
    setStep('generating');
    setErrorMsg('');
    try {
      const identity = await generateSignalIdentity();
      const identityWithProfile: SignalIdentity = {
        ...identity,
        displayName: displayName.trim() || undefined,
        username: username.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
      };
      
      const jsonStr = exportIdentity(identityWithProfile);
      const { encryptedHex, saltHex } = await encryptIdentityWithPassword(jsonStr, password);
      const pHash = await sha256Hex(password);
      
      const res = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: identityWithProfile.username,
          phoneNumber: identityWithProfile.phoneNumber,
          displayName: identityWithProfile.displayName,
          passwordHash: pHash,
          encryptedIdentity: encryptedHex,
          saltHex,
          securelyId: identityWithProfile.securelyId,
          discoverable: true,
          registrationId: identityWithProfile.registrationId,
          identityKey: bufferToBase64(identityWithProfile.identityKeyPair.pubKey),
          signedPreKey: {
            keyId: identityWithProfile.signedPreKey.keyId,
            publicKey: bufferToBase64(identityWithProfile.signedPreKey.keyPair.pubKey),
            signature: bufferToBase64(identityWithProfile.signedPreKey.signature)
          },
          preKeys: identityWithProfile.preKeys.map(pk => ({
            keyId: pk.keyId,
            publicKey: bufferToBase64(pk.keyPair.pubKey)
          }))
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      
      setTimeout(() => {
        setStep('success');
        setTimeout(() => {
          onIdentityCreated(identityWithProfile);
        }, 1200);
      }, 1000);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "An error occurred");
      setStep('signup_profile');
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      setErrorMsg("Username and password required.");
      return;
    }
    setStep('generating');
    setErrorMsg('');
    try {
      const pHash = await sha256Hex(password);
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), passwordHash: pHash })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      const decryptedJson = await decryptIdentityWithPassword(data.encryptedIdentity, data.saltHex, password);
      const restoredIdentity = importIdentity(decryptedJson);
      
      setStep('success');
      setTimeout(() => {
        onIdentityCreated(restoredIdentity);
      }, 1200);
    } catch(e: any) {
       setErrorMsg(e.message || "Invalid credentials");
       setStep('login_profile');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-neutral-800 rounded-2xl shadow-2xl p-8 border border-neutral-700/50">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <Zap className="w-8 h-8 text-indigo-400" />
          </div>
        </div>
        
        <h1 className="text-3xl font-semibold text-center tracking-tight mb-2">Securely Message</h1>
        <p className="text-neutral-400 text-center mb-8">Zero-Knowledge E2EE Communications</p>
        
        {errorMsg && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-xl text-center">
            {errorMsg}
          </div>
        )}
        
        {step === 'intro' && (
          <div className="space-y-4">
            <button
              onClick={() => setStep('signup_profile')}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3.5 font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center"
            >
              <Key className="w-5 h-5 mr-2" />
              Create New Account
            </button>
            <button 
              onClick={() => setStep('login_profile')}
              className="w-full bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-xl py-3.5 font-medium transition-all flex items-center justify-center"
            >
              <User className="w-5 h-5 mr-2" />
              Log In to Existing
            </button>
          </div>
        )}

        {step === 'signup_profile' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <label className="text-sm text-neutral-400 block mb-1.5 ml-1">Username (Required here)</label>
              <div className="relative">
                <span className="absolute left-4 top-2.5 text-neutral-500 font-medium">@</span>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="satoshi_123"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 pl-10 pr-4 text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-neutral-400 block mb-1.5 ml-1">Password (To encrypt keys)</label>
              <div className="relative">
                <Shield className="absolute left-3 top-3 w-5 h-5 text-neutral-500" />
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Strong passphrase"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 pl-10 pr-10 text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-neutral-500 hover:text-neutral-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-neutral-400 block mb-1.5 ml-1">Display Name (Optional)</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-neutral-500" />
                <input 
                  type="text" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Satoshi"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 pl-10 pr-4 text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-neutral-400 block mb-1.5 ml-1">Phone Number (Optional)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-5 h-5 text-neutral-500" />
                <input 
                  type="tel" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 pl-10 pr-4 text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              onClick={handleSignup}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3.5 mt-2 font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center"
            >
              <Check className="w-5 h-5 mr-2" />
              Generate Keys & Sign Up
            </button>
            <button onClick={() => { setStep('intro'); setErrorMsg(''); }} className="w-full text-center text-sm text-neutral-500 hover:text-white pb-2">Back</button>
          </div>
        )}

        {step === 'login_profile' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <label className="text-sm text-neutral-400 block mb-1.5 ml-1">Username</label>
              <div className="relative">
                <span className="absolute left-4 top-2.5 text-neutral-500 font-medium">@</span>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="satoshi_123"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 pl-10 pr-4 text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-neutral-400 block mb-1.5 ml-1">Password</label>
              <div className="relative">
                <Shield className="absolute left-3 top-3 w-5 h-5 text-neutral-500" />
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Strong passphrase"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 pl-10 pr-10 text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-neutral-500 hover:text-neutral-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3.5 mt-2 font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center"
            >
              <Key className="w-5 h-5 mr-2" />
              Decrypt Keys & Log In
            </button>
            <button onClick={() => { setStep('intro'); setErrorMsg(''); }} className="w-full text-center text-sm text-neutral-500 hover:text-white pb-2">Back</button>
          </div>
        )}

        {step === 'generating' && (
          <div className="py-8 flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
            <p className="text-neutral-400">Processing cryptographic identity...</p>
            <p className="text-xs text-neutral-500 mt-2">Curve: P-256 (ECDH) + PBKDF2</p>
          </div>
        )}

        {step === 'success' && (
          <div className="py-8 flex flex-col items-center animate-pulse">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
            <p className="text-neutral-200 font-medium tracking-wide">Identity Secured</p>
          </div>
        )}
      </div>
      <p className="text-sm text-neutral-600 mt-8 text-center max-w-sm">
        Absolute Rule 1: The server acts strictly as a blind post office. Keys never leave this device.
      </p>
    </div>
  );
}
