import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import ToteList from './pages/ToteList.jsx';
import ToteDetail from './pages/ToteDetail.jsx';
import ShareView from './pages/ShareView.jsx';
import Login from './pages/Login.jsx';
import Admin from './pages/Admin.jsx';
import PageLayout from './components/PageLayout.jsx';
import useTheme from './hooks/useTheme.js';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="page-loading">
      <div className="loader-dots">
        <div className="loader-dot" /><div className="loader-dot" /><div className="loader-dot" />
      </div>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { theme, toggle } = useTheme();
  const themeProps = { theme, onToggleTheme: toggle };

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/share/:token" element={<ShareView {...themeProps} />} />
      <Route path="/" element={
        <ProtectedRoute>
          <PageLayout {...themeProps}>
            <ToteList {...themeProps} />
          </PageLayout>
        </ProtectedRoute>
      } />
      <Route path="/tote/:id" element={
        <ProtectedRoute>
          <PageLayout {...themeProps}>
            <ToteDetail {...themeProps} />
          </PageLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute>
          <PageLayout {...themeProps}>
            <Admin {...themeProps} />
          </PageLayout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
