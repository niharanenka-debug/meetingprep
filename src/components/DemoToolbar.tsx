import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import { RotateCcw, Sparkles, UserCheck, CheckCircle2 } from 'lucide-react';

export function DemoToolbar() {
  const { user, users, switchUser, isDemoAuthEnabled } = useAuth();
  const [resetting, setResetting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleReset = async () => {
    if (!confirm('Reset demo database to original initial state with Project Alpha meetings and tasks?')) return;
    setResetting(true);
    try {
      await api.resetDemo();
      setFeedback('Demo data reset successfully!');
      window.location.reload();
    } catch (err: any) {
      alert('Error resetting demo: ' + err.message);
      setResetting(false);
    }
  };

  const demoPersonas = users.slice(0, 4);

  if (!isDemoAuthEnabled || !user) return null;

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-slate-200 px-4 py-2 text-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 font-medium text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
            Hackathon Demo Story
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 hidden sm:inline">
            Switch persona to test cross-user memory & individual task assignment:
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-800 rounded p-0.5 border border-slate-700">
            {demoPersonas.map(p => {
              const isActive = user?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => switchUser(p.id)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                  title={`${p.name} (${p.jobTitle || p.role})`}
                >
                  {p.name}
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded transition-colors whitespace-nowrap"
            title="Reset database to initial demo state"
          >
            <RotateCcw className={`w-3 h-3 ${resetting ? 'animate-spin' : ''}`} />
            {resetting ? 'Resetting...' : 'Reset Demo Data'}
          </button>
        </div>
      </div>
      {feedback && (
        <div className="text-center text-emerald-400 font-medium py-1 animate-pulse">
          {feedback}
        </div>
      )}
    </div>
  );
}
