import React, { useEffect } from 'react';
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

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';

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

// Workspace Pages
import { WorkspaceListPage } from './pages/workspaces/WorkspaceListPage';
import { WorkspaceOverviewPage } from './pages/workspaces/WorkspaceOverviewPage';
import { DiscoveryPage } from './pages/discovery/DiscoveryPage';
import { BusinessAnalysisPage } from './pages/analysis/BusinessAnalysisPage';
import { SolutionBuilderPage } from './pages/solution/SolutionBuilderPage';
import { ArchitecturePage } from './pages/architecture/ArchitecturePage';
import { ProcessDesignerPage } from './pages/process/ProcessDesignerPage';
import { UxDesignerPage } from './pages/ux/UxDesignerPage';
import { DatabaseDesignerPage } from './pages/database/DatabaseDesignerPage';
import { ImplementationPlannerPage } from './pages/planning/ImplementationPlannerPage';
import { CollaborationPage } from './pages/collaboration/CollaborationPage';
import { ExportCenterPage } from './pages/exports/ExportCenterPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { SettingsPage } from './pages/settings/SettingsPage';

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
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) {
    return <RobotLoadingOverlay isLoading={true} message="Verifying permissions..." delay={0} />;
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'ADMIN') {
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
                {/* Public Routes */}
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
                  <Route path="workspaces" element={<WorkspaceListPage />} />
                  <Route path="workspaces/:id" element={<WorkspaceOverviewPage />} />
                  <Route path="workspaces/:id/discovery" element={<DiscoveryPage />} />
                  <Route path="workspaces/:id/analysis" element={<BusinessAnalysisPage />} />
                  <Route path="workspaces/:id/solution" element={<SolutionBuilderPage />} />
                  <Route path="workspaces/:id/architecture" element={<ArchitecturePage />} />
                  <Route path="workspaces/:id/process" element={<ProcessDesignerPage />} />
                  <Route path="workspaces/:id/ux" element={<UxDesignerPage />} />
                  <Route path="workspaces/:id/database" element={<DatabaseDesignerPage />} />
                  <Route path="workspaces/:id/planning" element={<ImplementationPlannerPage />} />
                  <Route path="workspaces/:id/collaboration" element={<CollaborationPage />} />
                  <Route path="workspaces/:id/exports" element={<ExportCenterPage />} />
                  <Route path="settings" element={<SettingsPage />} />
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
                  <Route index element={<AdminDashboardPage />} />
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
