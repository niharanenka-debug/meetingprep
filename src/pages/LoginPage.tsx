import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Sparkles, ArrowRight } from 'lucide-react';

export function LoginPage() {
  const { login, switchUser, users, resetPassword, isFirebaseActive, isDemoAuthEnabled, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';

  useEffect(() => {
    if (!authLoading && user) navigate(destination, { replace: true });
  }, [authLoading, user, destination, navigate]);

  const getAuthErrorMessage = (error: unknown): string => {
    const code = (error as { code?: string })?.code;
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Email or password is incorrect.';
    }
    if (code === 'auth/invalid-email') return 'Enter a valid email address.';
    if (code === 'auth/too-many-requests') return 'Too many attempts. Wait a moment and try again.';
    if (code === 'auth/network-request-failed') return 'Could not reach the authentication service. Check your connection.';
    return error instanceof Error ? error.message : 'Unable to sign in. Please try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !email.trim() || (isFirebaseActive && !password)) return;
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPersona = async (userId: string) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await switchUser(userId);
      navigate('/', { replace: true });
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-8 space-y-6">
        <div className="text-center space-y-1.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Sign in to Meeting Prep Agent</h1>
          <p className="text-xs text-slate-500">
            From meeting conversations to accountable action.
          </p>
        </div>

        {/* 1-Click Demo Personas for Judges / Evaluators */}
        {isDemoAuthEnabled && <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Hackathon 1-Click Demo Login
          </div>
          <div className="grid grid-cols-2 gap-2">
            {users.slice(0, 4).map(u => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleQuickPersona(u.id)}
                disabled={loading}
                className="text-left p-2 rounded-lg bg-white border border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors text-xs space-y-0.5"
              >
                <div className="font-semibold text-slate-800">{u.name}</div>
                <div className="text-[10px] text-slate-500 truncate">{u.jobTitle?.split(' ')[0] || u.role}</div>
              </button>
            ))}
          </div>
        </div>}

        {error && (
          <div role="alert" className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Regular Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1">Email address</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null); }}
              placeholder="e.g. maroofmubeen786@gmail.com"
              autoComplete="username"
              required
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700">Password</label>
              <button
                type="button"
                disabled={resetting || loading || !isFirebaseActive}
                onClick={async () => {
                  if (!email.trim()) {
                    setError('Please enter your email above to receive a reset link.');
                    return;
                  }
                  setResetting(true);
                  try {
                    await resetPassword(email.trim());
                    setResetSent(true);
                    setError(null);
                  } catch (resetError) {
                    setError(getAuthErrorMessage(resetError));
                  } finally {
                    setResetting(false);
                  }
                }}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {resetting ? 'Sending...' : 'Forgot password?'}
              </button>
            </div>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null); }}
              placeholder="••••••••"
              autoComplete="current-password"
              required={isFirebaseActive}
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {resetSent && (
            <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg">
              ✓ Password reset email sent to <strong>{email}</strong>. Check your inbox.
            </div>
          )}

          <button
            type="submit"
            disabled={loading || authLoading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          Need a new account?{' '}
          <Link to="/register" className="text-indigo-600 font-semibold hover:underline">
            Register team member
          </Link>
        </div>
      </div>
    </div>
  );
}
