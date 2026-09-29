import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import type { Decision } from '../types/index.js';
import { CheckCircle2, Calendar, ArrowRight, BookOpen, Search } from 'lucide-react';

export function DecisionsPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getDecisions().then(list => {
      setDecisions(list);
    }).catch(err => {
      console.error('Failed to load decisions log:', err);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const filtered = decisions.filter(d => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return d.decision.toLowerCase().includes(q) || (d.context || '').toLowerCase().includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Decision Log
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Historical record of architectural, operational, and technical choices agreed upon in team meetings.
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search decisions by keyword or rationale..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50"
          />
        </div>
        <span className="text-xs text-slate-500 font-mono tabular-nums">
          {filtered.length} Decisions Logged
        </span>
      </div>

      {/* Decisions Feed */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Retrieving decision logs...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">No decisions match search</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Decisions are extracted when generating Minutes of Meeting.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(d => (
            <div
              key={d.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-slate-300 transition-all space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xs font-bold text-slate-900 leading-snug flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{d.decision}</span>
                  </h3>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border bg-emerald-50 text-emerald-800 border-emerald-200 shrink-0">
                    {d.status || 'AGREED'}
                  </span>
                </div>

                {d.context && (
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <strong className="text-slate-700">Context:</strong> {d.context}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="font-mono tabular-nums text-[11px]">
                  {new Date(d.createdAt).toLocaleDateString()}
                </span>
                {d.meetingTitle && (
                  <Link
                    to={`/meetings/${d.meetingId}`}
                    className="text-indigo-600 font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    <span>{d.meetingTitle}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
