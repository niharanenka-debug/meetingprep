import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import type { Meeting } from '../types/index.js';
import {
  Calendar,
  Clock,
  FileText,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Users,
  CheckCircle2
} from 'lucide-react';
import { CreateMeetingModal } from '../components/CreateMeetingModal.js';

export function MeetingsPage() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const list = await api.getMeetings({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search || undefined,
      });
      setMeetings(list);
    } catch (err) {
      console.error('Failed to load meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [statusFilter, search, user?.id]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Meetings & Memory</h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse upcoming agendas, prepare briefings with historical context, and review structured MOMs.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Schedule Meeting
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search meetings by title or description..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50"
          />
        </div>

        {/* Interactive segmented controls for status */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-stretch sm:self-auto">
          {['ALL', 'UPCOMING', 'COMPLETED'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === status
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status === 'ALL' ? 'All Meetings' : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Meeting Cards List */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Retrieving team meeting records...</p>
        </div>
      ) : meetings.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">No meetings found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Schedule a new meeting to test the AI memory and preparation workflows.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
          >
            <Plus className="w-3.5 h-3.5" />
            Schedule First Meeting
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {meetings.map(m => {
            const isUpcoming = m.status === 'UPCOMING';
            const isCompleted = m.status === 'COMPLETED';

            return (
              <div
                key={m.id}
                className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      to={`/meetings/${m.id}`}
                      className="text-base font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                    >
                      {m.title}
                    </Link>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        isUpcoming
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : isCompleted
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {m.description || 'No formal description provided.'}
                  </p>

                  {/* Clean unboxed metadata with bullet separators */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 pt-1">
                    <span className="font-mono tabular-nums flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(m.scheduledAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {m.location || 'Virtual'}
                    </span>
                    {m.participants && m.participants.length > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {m.participants.length} Participants
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right side CTAs */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Link
                    to={`/meetings/${m.id}/prep`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200 shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Prepare Me
                  </Link>

                  <Link
                    to={`/meetings/${m.id}/mom`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                    {m.hasMom ? 'View MOM' : 'Enter Notes & MOM'}
                  </Link>

                  <Link
                    to={`/meetings/${m.id}`}
                    className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateMeetingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => fetchMeetings()}
      />
    </div>
  );
}
