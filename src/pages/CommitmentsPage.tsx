import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import type { Commitment, CommitmentStatus } from '../types/index.js';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  User as UserIcon,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

export function CommitmentsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'my' | 'team'>('my');
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchCommitments = async () => {
    try {
      setLoading(true);
      if (tab === 'my') {
        const list = await api.getMyCommitments();
        setCommitments(list);
      } else {
        const list = await api.getCommitments({
          status: statusFilter === 'ALL' ? undefined : statusFilter,
        });
        setCommitments(list);
      }
    } catch (err) {
      console.error('Failed to load commitments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommitments();
  }, [tab, statusFilter, user?.id]);

  const handleStatusChange = async (id: string, newStatus: CommitmentStatus) => {
    try {
      await api.updateCommitment(id, { status: newStatus });
      setCommitments(prev => prev.map(c => (c.id === id ? { ...c, status: newStatus } : c)));
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Commitment Tracker
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Tracking personal and team milestone commitments extracted from meeting conversations.
        </p>
      </div>

      {/* Segmented Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-stretch sm:self-auto">
          <button
            onClick={() => setTab('my')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === 'my'
                ? 'bg-white text-indigo-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Commitments ({user?.name})
          </button>
          <button
            onClick={() => setTab('team')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === 'team'
                ? 'bg-white text-indigo-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Team Commitments
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Filter:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>
      </div>

      {/* Commitments Feed */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Retrieving commitments from memory...</p>
        </div>
      ) : commitments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">
            {tab === 'my' ? `No commitments on record for ${user?.name}` : 'No commitments match filter'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Commitments are extracted automatically when generating Minutes of Meeting (MOM).
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {commitments.map(c => {
            const isCompleted = c.status === 'COMPLETED';
            const isOverdue = c.status === 'OVERDUE' || (c.deadline && new Date(c.deadline) < new Date() && !isCompleted);

            return (
              <div
                key={c.id}
                className={`bg-white rounded-xl border p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isCompleted ? 'opacity-70 bg-slate-50/50 border-slate-200' : 'border-slate-200'
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-sm font-semibold ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {c.commitment}
                    </p>
                    {isOverdue && !isCompleted && (
                      <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Overdue
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5 font-medium text-slate-700">
                      <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                      {c.person}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1.5 font-mono tabular-nums">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Deadline: {c.deadline ? new Date(c.deadline).toLocaleDateString() : 'Next Sprint'}
                    </span>
                    {c.meetingTitle && (
                      <>
                        <span aria-hidden="true">·</span>
                        <Link
                          to={`/meetings/${c.meetingId}`}
                          className="text-indigo-600 font-medium hover:underline flex items-center gap-1"
                        >
                          Source: {c.meetingTitle}
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <select
                    value={c.status}
                    onChange={e => handleStatusChange(c.id, e.target.value as CommitmentStatus)}
                    className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 bg-slate-50 font-medium text-slate-700"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="OVERDUE">Overdue</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
