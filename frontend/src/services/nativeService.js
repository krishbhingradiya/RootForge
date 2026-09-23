import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Network } from '@capacitor/network';
import { SplashScreen } from '@capacitor/splash-screen';
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();

/**
 * Initialize native lifecycle and status bar
 */
export async function initNativeFeatures({ onNetworkChange, onBackButton }) {
  if (!isNative) return;

  try {
    // Hide splash screen smoothly after app mounts
    await SplashScreen.hide().catch(() => {});
  } catch (e) {
    console.warn('[NativeService] SplashScreen hide error:', e);
  }

  try {
    // Initial status bar setup
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    await StatusBar.setStyle({
      style: isDark ? Style.Dark : Style.Light
    }).catch(() => {});
    await StatusBar.setBackgroundColor({
      color: isDark ? '#0B0F17' : '#FAF8F5'
    }).catch(() => {});
  } catch (e) {
    console.warn('[NativeService] StatusBar init error:', e);
  }

  // Monitor network status
  try {
    Network.addListener('networkStatusChange', (status) => {
      if (onNetworkChange) {
        onNetworkChange(status.connected, status.connectionType);
      }
      window.dispatchEvent(
        new CustomEvent('rootforge:network-status', {
          detail: { connected: status.connected, connectionType: status.connectionType }
        })
      );
    });
  } catch (e) {
    console.warn('[NativeService] Network listener error:', e);
  }

  // Handle Android hardware back button
  try {
    App.addListener('backButton', ({ canGoBack }) => {
      // Check if any open modals, bottom sheets, or AI drawers exist
      const openDrawer = document.querySelector('.ai-consultant-drawer') || document.querySelector('.ai-drawer-container.open');
      const openModal = document.querySelector('.modal-overlay') || document.querySelector('.mobile-sheet-backdrop');

      if (openDrawer) {
        // Dispatch event to close AI consultant drawer
        window.dispatchEvent(new CustomEvent('rootforge:close-drawer'));
        return;
      }

      if (openModal) {
        // Dispatch event to close active modal or bottom sheet
        window.dispatchEvent(new CustomEvent('rootforge:close-modal'));
        return;
      }

      if (onBackButton) {
        const handled = onBackButton(canGoBack);
        if (handled) return;
      }

      if (canGoBack) {
        window.history.back();
      } else {
        // Double-press back or prompt before exit
        App.exitApp();
      }
    });
  } catch (e) {
    console.warn('[NativeService] BackButton listener error:', e);
  }
}

/**
 * Dynamically update StatusBar color on theme change
 */
export async function updateNativeStatusBar(isDark) {
  if (!isNative) return;
  try {
    await StatusBar.setStyle({
      style: isDark ? Style.Dark : Style.Light
    });
    await StatusBar.setBackgroundColor({
      color: isDark ? '#0B0F17' : '#FAF8F5'
    });
  } catch (e) {
    // Ignore on unsupported platforms
  }
}

/**
 * Check current network status
 */
export async function getNetworkStatus() {
  if (!isNative) {
    return { connected: navigator.onLine, connectionType: 'wifi' };
  }
  try {
    const status = await Network.getStatus();
    return { connected: status.connected, connectionType: status.connectionType };
  } catch (e) {
    return { connected: navigator.onLine, connectionType: 'unknown' };
  }
}

/**
 * Native file sharing (reports, exports, architectural diagrams)
 */
export async function shareContent({ title, text, url, dialogTitle }) {
  if (isNative) {
    try {
      const canShare = await Share.canShare();
      if (canShare.value) {
        await Share.share({
          title: title || 'RootForge AI Solution Builder',
          text: text || '',
          url: url || '',
          dialogTitle: dialogTitle || 'Share with Team'
        });
        return true;
      }
    } catch (e) {
      console.warn('[NativeService] Native share failed, falling back:', e);
    }
  }

  // Web Share API fallback
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch (e) {
      return false;
    }
  }

  // Clipboard fallback
  if (url && navigator.clipboard) {
    await navigator.clipboard.writeText(url);
    return 'copied';
  }

  return false;
}

/**
 * Native Persistent Storage wrapper using Capacitor Preferences
 */
export const nativeStorage = {
  async get(key) {
    if (isNative) {
      const res = await Preferences.get({ key });
      return res.value;
    }
    return localStorage.getItem(key);
  },
  async set(key, value) {
    if (isNative) {
      await Preferences.set({ key, value: String(value) });
    }
    localStorage.setItem(key, String(value));
  },
  async remove(key) {
    if (isNative) {
      await Preferences.remove({ key });
    }
    localStorage.removeItem(key);
  }
};
