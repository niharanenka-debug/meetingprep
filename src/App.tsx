import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { NotificationProvider } from './context/NotificationContext.js';
import { Navbar } from './components/Navbar.js';
import { DemoToolbar } from './components/DemoToolbar.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { MeetingsPage } from './pages/MeetingsPage.js';
import { MeetingDetailPage } from './pages/MeetingDetailPage.js';
import { MeetingPrepPage } from './pages/MeetingPrepPage.js';
import { MOMReviewPage } from './pages/MOMReviewPage.js';
import { TasksPage } from './pages/TasksPage.js';
import { CommitmentsPage } from './pages/CommitmentsPage.js';
import { DecisionsPage } from './pages/DecisionsPage.js';
import { IssuesPage } from './pages/IssuesPage.js';
import { ChatbotPage } from './pages/ChatbotPage.js';
import { TeamManagementPage } from './pages/TeamManagementPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="py-16 text-center text-sm text-slate-500" role="status">Checking your session...</div>;
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}

function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* Top Demo Story Persona Switcher */}
      <DemoToolbar />

      {/* Main Top Navigation Bar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/meetings" element={<ProtectedRoute><MeetingsPage /></ProtectedRoute>} />
          <Route path="/meetings/:id" element={<ProtectedRoute><MeetingDetailPage /></ProtectedRoute>} />
          <Route path="/meetings/:id/prep" element={<ProtectedRoute><MeetingPrepPage /></ProtectedRoute>} />
          <Route path="/meetings/:id/mom" element={<ProtectedRoute><MOMReviewPage /></ProtectedRoute>} />
          <Route path="/tasks/new" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
          <Route path="/commitments" element={<ProtectedRoute><CommitmentsPage /></ProtectedRoute>} />
          <Route path="/decisions" element={<ProtectedRoute><DecisionsPage /></ProtectedRoute>} />
          <Route path="/issues" element={<ProtectedRoute><IssuesPage /></ProtectedRoute>} />
          <Route path="/assistant" element={<ProtectedRoute><ChatbotPage /></ProtectedRoute>} />
          <Route path="/team" element={<ProtectedRoute><TeamManagementPage /></ProtectedRoute>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Clean quiet footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Meeting Prep Agent · <span className="font-semibold text-slate-700">"From meeting conversations to accountable action."</span>
          </div>
          <div className="text-[11px] text-slate-400">
            AI-generated briefings and minutes should be reviewed before being treated as an official record.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppLayout />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
