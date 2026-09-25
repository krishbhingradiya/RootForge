import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

export const WorkspaceContext = createContext(null);

const DEFAULT_DEMO_WORKSPACE = {
  id: 'ws-demo-customer-support',
  name: 'Customer Support Transformation',
  industry: 'Retail & Omnichannel Commerce',
  objective: 'Reduce manual customer support operations by 65% and eliminate ticket triage delays.',
  challenge: 'Customer support requests arrive through email, web forms and other channels. Agents manually categorize requests, assign departments and track resolutions.',
  targetUsers: 'Tier-1 & Tier-2 Support Specialists, Department Supervisors, Store Operations, Retail Shoppers',
  expectedOutcome: 'Automated intent classification, dynamic skill-based ticket routing, AI copilot responses, sub-hour turnaround time.',
  status: 'PLANNING',
  isDemo: true
};

export const WorkspaceProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [stages, setStages] = useState(null);
  const [nextAction, setNextAction] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchWorkspaces = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await api.getWorkspaces();
      const list = (res.workspaces && res.workspaces.length > 0) ? res.workspaces : [DEFAULT_DEMO_WORKSPACE];
      setWorkspaces(list);
      return list;
    } catch (err) {
      console.warn('Failed to load workspaces from server, fallback to demo workspace:', err);
      setWorkspaces([DEFAULT_DEMO_WORKSPACE]);
      return [DEFAULT_DEMO_WORKSPACE];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const selectWorkspace = useCallback(async (id) => {
    if (!id || !isAuthenticated) return;
    try {
      setLoading(true);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rootforge:loading', {
          detail: { active: true, message: 'Preparing your workspace...', key: 'ws_select' }
        }));
      }
      const res = await api.getWorkspace(id);
      setCurrentWorkspace(res.workspace || DEFAULT_DEMO_WORKSPACE);
      setStages(res.stages || null);
      setNextAction(res.nextAction || '');
      return res;
    } catch (err) {
      console.warn(`Failed to load workspace ${id} from server, using demo workspace fallback:`, err);
      setCurrentWorkspace(DEFAULT_DEMO_WORKSPACE);
      return { workspace: DEFAULT_DEMO_WORKSPACE };
    } finally {
      setLoading(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rootforge:loading', {
          detail: { active: false, key: 'ws_select' }
        }));
      }
    }
  }, [isAuthenticated]);

  const refreshWorkspace = useCallback(async (id) => {
    const targetId = id || currentWorkspace?.id;
    if (!targetId || !isAuthenticated) return;
    try {
      const res = await api.getWorkspace(targetId);
      if (res?.workspace) {
        setCurrentWorkspace(res.workspace);
        setStages(res.stages);
        setNextAction(res.nextAction);
      }
      return res;
    } catch (err) {
      console.error(`Failed to refresh workspace ${targetId}:`, err);
    }
  }, [currentWorkspace?.id, isAuthenticated]);

  useEffect(() => {
    const handleWorkspaceUpdated = (e) => {
      const targetId = e?.detail?.workspaceId || currentWorkspace?.id;
      if (targetId) {
        refreshWorkspace(targetId);
      }
    };
    window.addEventListener('rootforge:workspace-updated', handleWorkspaceUpdated);
    return () => window.removeEventListener('rootforge:workspace-updated', handleWorkspaceUpdated);
  }, [currentWorkspace?.id, refreshWorkspace]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWorkspaces();
    } else {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setStages(null);
    }
  }, [isAuthenticated, fetchWorkspaces]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        stages,
        nextAction,
        loading,
        fetchWorkspaces,
        selectWorkspace,
        refreshWorkspace,
        setCurrentWorkspace
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return context;
};
