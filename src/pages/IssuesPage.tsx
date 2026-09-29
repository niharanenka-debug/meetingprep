import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import type { Issue, IssueStatus } from '../types/index.js';
import { AlertCircle, ArrowRight, CheckCircle2, Clock, HelpCircle, User } from 'lucide-react';

export function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const list = await api.getIssues({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      setIssues(list);
    } catch (err) {
      console.error('Failed to load issues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [statusFilter]);

  const handleStatusChange = async (id: string, newStatus: IssueStatus) => {
    try {
      await api.updateIssue(id, { status: newStatus });
      setIssues(prev => prev.map(i => (i.id === id ? { ...i, status: newStatus } : i)));
    } catch (err) {
      console.error('Failed to update issue status:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Unresolved Issues & Open Debates
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Open technical blockers and unanswered questions remembered across past meetings.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === st ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st === 'ALL' ? 'All Issues' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 font-mono tabular-nums">
          {issues.length} Issues Tracked
        </span>
      </div>

      {/* Issues Feed */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Loading unresolved issues from memory...</p>
        </div>
      ) : issues.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">No unresolved issues</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All previously raised questions have been answered or resolved.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <AlertCircle className={`w-4 h-4 shrink-0 ${
                    item.status === 'RESOLVED' ? 'text-emerald-500' : 'text-amber-500'
                  }`} />
                  <p className={`text-sm font-semibold ${item.status === 'RESOLVED' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {item.issue}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pl-6">
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Owner: {item.owner || <span className="text-slate-400 italic">Unassigned (Open discussion)</span>}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    Last discussed: {new Date(item.lastDiscussed).toLocaleDateString()}
                  </span>
                  {item.meetingTitle && (
                    <>
                      <span aria-hidden="true">·</span>
                      <Link
                        to={`/meetings/${item.meetingId}`}
                        className="text-indigo-600 font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        Source: {item.meetingTitle}
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </>
                  )}
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <select
                  value={item.status}
                  onChange={e => handleStatusChange(item.id, e.target.value as IssueStatus)}
                  className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 bg-slate-50 font-medium text-slate-700"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
