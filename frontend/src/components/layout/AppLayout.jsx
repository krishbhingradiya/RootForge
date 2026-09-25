import React, { useState, useEffect } from 'react';
import { Outlet, useParams, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { MobileNav } from './MobileNav';
import { ToastContainer } from '../common/Toast';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { AiChatErrorBoundary } from '../ai/AiChatErrorBoundary';
import { AiConsultantDrawer } from '../ai/AiConsultantDrawer';
import { RobotLoadingOverlay } from '../common/RobotLoadingOverlay';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useLoading } from '../../context/LoadingContext';

export const AppLayout = () => {
  const { id } = useParams();
  const location = useLocation();
  const { currentWorkspace, selectWorkspace } = useWorkspace();
  const { isLoading, loadingMessage, stopLoading } = useLoading();
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  useEffect(() => {
    if (id && currentWorkspace?.id !== id) {
      selectWorkspace(id);
    }
  }, [id, currentWorkspace, selectWorkspace]);

  useEffect(() => {
    // Clear any section navigation transition key when location changes
    stopLoading('section_nav');
  }, [location.pathname, stopLoading]);

  useEffect(() => {
    const handleOpenDrawer = () => setAiDrawerOpen(true);
    window.addEventListener('rootforge:open-ai-drawer', handleOpenDrawer);
    window.addEventListener('open-ai-drawer', handleOpenDrawer);
    return () => {
      window.removeEventListener('rootforge:open-ai-drawer', handleOpenDrawer);
      window.removeEventListener('open-ai-drawer', handleOpenDrawer);
    };
  }, []);

  const isOverlayExcluded = location.pathname.includes('/discovery') || location.pathname.includes('/architecture') || location.pathname.includes('/process');

  return (
    <div className="app-container">
      {/* Mobile-first Navigation Suite */}
      <MobileNav onOpenAiDrawer={() => setAiDrawerOpen(true)} />

      {/* Desktop Sidebar */}
      <Sidebar />

      <div className="main-content">
        {/* Desktop Navbar */}
        <Navbar onOpenAiDrawer={() => setAiDrawerOpen(true)} />
        <main className="content-body">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
        {/* Loading canvas — disabled for discovery, architecture, and process pages */}
        {!isOverlayExcluded && <RobotLoadingOverlay isLoading={isLoading} message={loadingMessage} />}
      </div>

      <AiChatErrorBoundary
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        onRetry={() => setAiDrawerOpen(true)}
      >
        <AiConsultantDrawer
          isOpen={aiDrawerOpen}
          onClose={() => setAiDrawerOpen(false)}
        />
      </AiChatErrorBoundary>
      <ToastContainer />
    </div>
  );
};
