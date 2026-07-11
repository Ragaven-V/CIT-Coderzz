import React, { useState } from 'react';
import { api } from '../api';
import { User, Role } from '../types';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'danger') => void;
}

export default function Login({ onLoginSuccess, showToast }: LoginProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(Role.FLEET_MANAGER);
  const [passcode, setPasscode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Track failed attempts for locking out account
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      showToast('Account is locked due to multiple failed attempts.', 'danger');
      return;
    }
    if (!email || !password) {
      showToast('Please enter both email and password.', 'warning');
      return;
    }
    if (isRegister && !name) {
      showToast('Please provide your name.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      if (isRegister) {
        const res = await api.register(name, email, password, role, role === Role.FLEET_MANAGER ? passcode : undefined);
        showToast(`Welcome to TransitOps, ${res.user.name}!`, 'success');
        onLoginSuccess(res.user);
      } else {
        const res = await api.login(email, password);
        setFailedAttempts(0); // reset on success
        showToast(`Welcome back, ${res.user.name}!`, 'success');
        onLoginSuccess(res.user);
      }
    } catch (error: any) {
      if (!isRegister) {
        const nextFailed = failedAttempts + 1;
        setFailedAttempts(nextFailed);
        if (nextFailed >= 5) {
          setIsLocked(true);
          showToast('Account locked after 5 failed attempts.', 'danger');
        } else {
          showToast(`Invalid credentials. ${5 - nextFailed} attempts remaining.`, 'danger');
        }
      } else {
        showToast(error.message || 'Registration failed.', 'danger');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loginDemoAccount = async (demoEmail: string) => {
    if (isLocked) {
      showToast('Login is disabled. Reset failed attempts by clicking below.', 'warning');
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.login(demoEmail, 'password123');
      showToast(`Logged in as ${res.user.role}: ${res.user.name}`, 'success');
      onLoginSuccess(res.user);
    } catch (error: any) {
      showToast(error.message || 'Demo login failed.', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen bg-slate-950 text-slate-100 font-sans" id="login-screen">
      {/* Left Pane - Branding & Info */}
      <div className="hidden md:flex md:w-5/12 bg-slate-950 p-12 flex-col justify-between border-r border-slate-900/60 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.05),transparent_45%)]"></div>
        
        {/* Top brand */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-slate-950 font-extrabold text-lg shadow-amber-500/20 shadow-lg">
            T
          </div>
          <div>
            <h1 className="font-bold text-lg text-white font-heading tracking-tight">TransitOps</h1>
            <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Smart Transport Operations Platform</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-[10px] text-slate-600 relative z-10">
          TransitOps © 2026 • RBAC Enabled Platform
        </div>
      </div>

      {/* Right Pane - Form Card */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative">
        <div className="max-w-md w-full flex flex-col gap-6">
          
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {isRegister ? 'Create your profile' : 'Sign in to your account.'}
            </h2>
            <p className="text-xs text-slate-400">
              {isRegister ? 'Enter details to claim your secure role access.' : 'Enter your credentials to continue.'}
            </p>
          </div>

          {/* Conditional Error State Box for failed attempts lock */}
          {failedAttempts > 0 && (
            <div className={`p-4 rounded-xl border flex flex-col gap-1 text-xs ${isLocked ? 'bg-red-950/20 border-red-500/30 text-red-400' : 'bg-amber-950/20 border-amber-500/30 text-amber-400'}`}>
              <div className="font-bold flex items-center gap-2">
                <i className="fas fa-exclamation-triangle"></i>
                {isLocked ? 'Account Temporarily Locked' : 'Invalid Credentials'}
              </div>
              <div>
                {isLocked 
                  ? 'Account locked after 5 failed attempts. Please contact platform administrators.' 
                  : `Incorrect email or password. Attempt ${failedAttempts} of 5.`}
              </div>
              {isLocked && (
                <button 
                  onClick={() => { setIsLocked(false); setFailedAttempts(0); }}
                  className="text-left font-bold underline mt-2 hover:text-white cursor-pointer"
                >
                  Reset lock (Admin Override Bypass)
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isRegister && (
              <div className="form-group flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                <input
                  type="text"
                  placeholder="Raven K."
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email</label>
              <input
                type="email"
                placeholder="Ravenk@transitops.in"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {isRegister && (
              <div className="form-group flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Role (RBAC)</label>
                <select
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs outline-none focus:border-amber-500 transition-all cursor-pointer"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                >
                  <option value={Role.FLEET_MANAGER}>Fleet Manager</option>
                  <option value={Role.DISPATCHER}>Dispatcher</option>
                  <option value={Role.SAFETY_OFFICER}>Safety Officer</option>
                  <option value={Role.FINANCIAL_ANALYST}>Financial Analyst</option>
                </select>
              </div>
            )}

            {isRegister && role === Role.FLEET_MANAGER && (
              <div className="form-group flex flex-col gap-1">
                <label className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1">
                  <i className="fas fa-shield-alt"></i> Fleet Manager Security Passcode
                </label>
                <input
                  type="password"
                  placeholder="Enter registration key (e.g. TRANSIT_ADMIN_2026)"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-850 rounded-xl text-white text-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="flex items-center justify-between text-xs py-1">
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                <input type="checkbox" className="accent-amber-500 rounded" defaultChecked />
                Remember me
              </label>
              <a href="#" onClick={(e) => { e.preventDefault(); showToast('Password reset link sent to registered email address.', 'success'); }} className="text-amber-500 hover:underline">Forgot password?</a>
            </div>

            <button
              type="submit"
              disabled={isLoading || isLocked}
              className="mt-2 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/10 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
              ) : isRegister ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="text-center text-xs text-slate-400">
            {isRegister ? 'Already have an account?' : "Don't have an account yet?"}{' '}
            <button
              type="button"
              className="text-amber-500 hover:underline font-semibold cursor-pointer"
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister ? 'Sign In' : 'Sign Up'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
