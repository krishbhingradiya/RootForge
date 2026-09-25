import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { ChatProvider } from './context/ChatContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoadingProvider } from './context/LoadingContext';
import { RobotLoadingOverlay } from './components/common/RobotLoadingOverlay';
import { initNativeFeatures, isNative } from './services/nativeService';

// Layout & Common
import { AppLayout } from './components/layout/AppLayout';

// Public Critical Entry Pages (Immediate Load — Never Lazy Loaded)
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';

// Lazy-Loaded Internal Workspace & Tool Modules (Code-Split on Demand)
const WorkspaceListPage = lazy(() => import('./pages/workspaces/WorkspaceListPage').then(m => ({ default: m.WorkspaceListPage })));
const WorkspaceOverviewPage = lazy(() => import('./pages/workspaces/WorkspaceOverviewPage').then(m => ({ default: m.WorkspaceOverviewPage })));
const DiscoveryPage = lazy(() => import('./pages/discovery/DiscoveryPage').then(m => ({ default: m.DiscoveryPage })));
const BusinessAnalysisPage = lazy(() => import('./pages/analysis/BusinessAnalysisPage').then(m => ({ default: m.BusinessAnalysisPage })));
const SolutionBuilderPage = lazy(() => import('./pages/solution/SolutionBuilderPage').then(m => ({ default: m.SolutionBuilderPage })));
const ArchitecturePage = lazy(() => import('./pages/architecture/ArchitecturePage').then(m => ({ default: m.ArchitecturePage })));
const ProcessDesignerPage = lazy(() => import('./pages/process/ProcessDesignerPage').then(m => ({ default: m.ProcessDesignerPage })));
const UxDesignerPage = lazy(() => import('./pages/ux/UxDesignerPage').then(m => ({ default: m.UxDesignerPage })));
const DatabaseDesignerPage = lazy(() => import('./pages/database/DatabaseDesignerPage').then(m => ({ default: m.DatabaseDesignerPage })));
const ImplementationPlannerPage = lazy(() => import('./pages/planning/ImplementationPlannerPage').then(m => ({ default: m.ImplementationPlannerPage })));
const CollaborationPage = lazy(() => import('./pages/collaboration/CollaborationPage').then(m => ({ default: m.CollaborationPage })));
const ExportCenterPage = lazy(() => import('./pages/exports/ExportCenterPage').then(m => ({ default: m.ExportCenterPage })));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const GroqDiscoveryTestPage = lazy(() => import('./pages/discovery/GroqDiscoveryTestPage').then(m => ({ default: m.GroqDiscoveryTestPage })));

// Lightweight module loading fallback
const PageFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div className="spinner-border spinner-border-sm" style={{ width: 24, height: 24, borderWidth: 2, borderColor: '#D97706 transparent transparent transparent' }} />
      <span style={{ fontSize: '0.85rem' }}>Loading workspace module...</span>
    </div>
  </div>
);

// Root Route Handler (in native mobile app, go straight to auth/app; on web, show landing)
const RootRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  if (isNative) {
    if (loading) {
      return <RobotLoadingOverlay isLoading={true} message="Initializing RootForge..." delay={0} />;
    }
    return isAuthenticated ? <Navigate to="/app/workspaces" replace /> : <Navigate to="/login" replace />;
  }
  return <LandingPage />;
};

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <RobotLoadingOverlay isLoading={true} message="Authenticating session..." delay={0} />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Admin Route Guard
const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading, isAdmin } = useAuth();
  if (loading) {
    return <RobotLoadingOverlay isLoading={true} message="Verifying permissions..." delay={0} />;
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) {
    return <Navigate to="/app/workspaces" replace />;
  }
  return children;
};

export default function App() {
  useEffect(() => {
    initNativeFeatures({});
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <ChatProvider>
              <LoadingProvider>
                <BrowserRouter>
                  <Routes>
                    {/* Public Routes — Instant Entry */}
                    <Route path="/" element={<RootRoute />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/verify-email" element={<VerifyEmailPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                    {/* Authenticated Application Shell */}
                    <Route
                      path="/app"
                      element={
                        <ProtectedRoute>
                          <AppLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<Navigate to="/app/workspaces" replace />} />
                      <Route path="workspaces" element={<Suspense fallback={<PageFallback />}><WorkspaceListPage /></Suspense>} />
                      <Route path="workspaces/:id" element={<Suspense fallback={<PageFallback />}><WorkspaceOverviewPage /></Suspense>} />
                      <Route path="workspaces/:id/discovery" element={<Suspense fallback={<PageFallback />}><DiscoveryPage /></Suspense>} />
                      <Route path="workspaces/:id/analysis" element={<Suspense fallback={<PageFallback />}><BusinessAnalysisPage /></Suspense>} />
                      <Route path="workspaces/:id/solution" element={<Suspense fallback={<PageFallback />}><SolutionBuilderPage /></Suspense>} />
                      <Route path="workspaces/:id/architecture" element={<Suspense fallback={<PageFallback />}><ArchitecturePage /></Suspense>} />
                      <Route path="workspaces/:id/process" element={<Suspense fallback={<PageFallback />}><ProcessDesignerPage /></Suspense>} />
                      <Route path="workspaces/:id/ux" element={<Suspense fallback={<PageFallback />}><UxDesignerPage /></Suspense>} />
                      <Route path="workspaces/:id/database" element={<Suspense fallback={<PageFallback />}><DatabaseDesignerPage /></Suspense>} />
                      <Route path="workspaces/:id/planning" element={<Suspense fallback={<PageFallback />}><ImplementationPlannerPage /></Suspense>} />
                      <Route path="workspaces/:id/collaboration" element={<Suspense fallback={<PageFallback />}><CollaborationPage /></Suspense>} />
                      <Route path="workspaces/:id/exports" element={<Suspense fallback={<PageFallback />}><ExportCenterPage /></Suspense>} />
                      <Route path="settings" element={<Suspense fallback={<PageFallback />}><SettingsPage /></Suspense>} />
                      <Route path="ai-discovery-test" element={<Suspense fallback={<PageFallback />}><GroqDiscoveryTestPage /></Suspense>} />
                    </Route>

                    {/* Dedicated Admin Route */}
                    <Route
                      path="/admin"
                      element={
                        <AdminRoute>
                          <AppLayout />
                        </AdminRoute>
                      }
                    >
                      <Route index element={<Suspense fallback={<PageFallback />}><AdminDashboardPage /></Suspense>} />
                    </Route>

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </BrowserRouter>
              </LoadingProvider>
            </ChatProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
