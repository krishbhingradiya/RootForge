import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const LoadingContext = createContext(null);

export const LoadingProvider = ({ children }) => {
  // Store active loading operations in a Map (key -> message)
  const [activeLoaders, setActiveLoaders] = useState(new Map());
  const activeLoadersRef = useRef(activeLoaders);
  activeLoadersRef.current = activeLoaders;

  const startLoading = useCallback((message = 'Thinking...', key = 'default') => {
    setActiveLoaders((prev) => {
      const next = new Map(prev);
      next.set(key, message);
      return next;
    });
  }, []);

  const stopLoading = useCallback((key = 'default') => {
    setActiveLoaders((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const withLoading = useCallback(async (asyncFn, message = 'Thinking...', key = 'op_' + Date.now()) => {
    startLoading(message, key);
    try {
      return await asyncFn();
    } finally {
      stopLoading(key);
    }
  }, [startLoading, stopLoading]);

  // Global event bridge for services like api.js
  useEffect(() => {
    const handleGlobalLoading = (event) => {
      const { active, message, key = 'api_req' } = event.detail || {};
      if (active) {
        startLoading(message || 'Processing with AI...', key);
      } else {
        stopLoading(key);
      }
    };

    window.addEventListener('rootforge:loading', handleGlobalLoading);
    return () => {
      window.removeEventListener('rootforge:loading', handleGlobalLoading);
    };
  }, [startLoading, stopLoading]);

  const isLoading = activeLoaders.size > 0;

  // Derive most recent or descriptive loading message
  let currentMessage = 'Thinking...';
  if (isLoading) {
    const values = Array.from(activeLoaders.values());
    currentMessage = values[values.length - 1] || 'Thinking...';
  }

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        loadingMessage: currentMessage,
        startLoading,
        stopLoading,
        withLoading
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    // Return a safe fallback if used outside provider
    return {
      isLoading: false,
      loadingMessage: '',
      startLoading: () => {},
      stopLoading: () => {},
      withLoading: async (fn) => await fn()
    };
  }
  return context;
};
