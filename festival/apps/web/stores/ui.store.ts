'use client';

import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ============================================================================
// Types
// ============================================================================

export type Theme = 'light' | 'dark' | 'system';
export type Language = 'fr' | 'en';
export type BreakpointSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface Modal {
  id: string;
  component: string;
  props?: Record<string, unknown>;
  priority?: number;
  closeable?: boolean;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface UIPreferences {
  theme: Theme;
  language: Language;
  reducedMotion: boolean;
  compactMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

// ============================================================================
// State Interface
// ============================================================================

interface UIState {
  // Theme & Preferences
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  language: Language;
  preferences: UIPreferences;

  // Layout
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  headerVisible: boolean;

  // Screen size
  isMobile: boolean;
  breakpoint: BreakpointSize;

  // Modals
  modals: Modal[];
  activeModalId: string | null;

  // Toasts
  toasts: Toast[];

  // Loading states
  globalLoading: boolean;
  loadingMessage: string | null;

  // Scroll
  scrollY: number;
  scrollDirection: 'up' | 'down' | null;
}

interface UIActions {
  // Theme
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setResolvedTheme: (theme: 'light' | 'dark') => void;

  // Language
  setLanguage: (language: Language) => void;

  // Preferences
  updatePreferences: (preferences: Partial<UIPreferences>) => void;
  resetPreferences: () => void;

  // Sidebar
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;

  // Mobile menu
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;

  // Header
  setHeaderVisible: (visible: boolean) => void;

  // Screen
  setIsMobile: (isMobile: boolean) => void;
  setBreakpoint: (breakpoint: BreakpointSize) => void;

  // Modals
  openModal: (modal: Omit<Modal, 'id'> & { id?: string }) => string;
  closeModal: (id?: string) => void;
  closeAllModals: () => void;
  isModalOpen: (id: string) => boolean;

  // Toasts
  showToast: (toast: Omit<Toast, 'id'>) => string;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;

  // Loading
  setGlobalLoading: (loading: boolean, message?: string) => void;

  // Scroll
  setScrollY: (y: number) => void;
  setScrollDirection: (direction: 'up' | 'down' | null) => void;
}

export type UIStore = UIState & UIActions;

// ============================================================================
// Constants
// ============================================================================

const STORE_NAME = 'festival-ui';

const DEFAULT_PREFERENCES: UIPreferences = {
  theme: 'system',
  language: 'fr',
  reducedMotion: false,
  compactMode: false,
  fontSize: 'medium',
};

const TOAST_DEFAULT_DURATION = 5000;

// ============================================================================
// Helpers
// ============================================================================

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// ============================================================================
// Store
// ============================================================================

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        theme: 'system',
        resolvedTheme: 'light',
        language: 'fr',
        preferences: DEFAULT_PREFERENCES,

        sidebarOpen: true,
        sidebarCollapsed: false,
        mobileMenuOpen: false,
        headerVisible: true,

        isMobile: false,
        breakpoint: 'lg',

        modals: [],
        activeModalId: null,

        toasts: [],

        globalLoading: false,
        loadingMessage: null,

        scrollY: 0,
        scrollDirection: null,

        // Theme actions
        setTheme: (theme) => {
          set((state) => {
            state.theme = theme;
            state.preferences.theme = theme;
          });
        },

        toggleTheme: () => {
          const currentTheme = get().resolvedTheme;
          const newTheme = currentTheme === 'light' ? 'dark' : 'light';
          set((state) => {
            state.theme = newTheme;
            state.resolvedTheme = newTheme;
            state.preferences.theme = newTheme;
          });
        },

        setResolvedTheme: (theme) => {
          set((state) => {
            state.resolvedTheme = theme;
          });
        },

        // Language actions
        setLanguage: (language) => {
          set((state) => {
            state.language = language;
            state.preferences.language = language;
          });
        },

        // Preferences actions
        updatePreferences: (preferences) => {
          set((state) => {
            state.preferences = { ...state.preferences, ...preferences };

            // Sync individual state properties
            if (preferences.theme !== undefined) {
              state.theme = preferences.theme;
            }
            if (preferences.language !== undefined) {
              state.language = preferences.language;
            }
          });
        },

        resetPreferences: () => {
          set((state) => {
            state.preferences = DEFAULT_PREFERENCES;
            state.theme = DEFAULT_PREFERENCES.theme;
            state.language = DEFAULT_PREFERENCES.language;
          });
        },

        // Sidebar actions
        setSidebarOpen: (open) => {
          set((state) => {
            state.sidebarOpen = open;
          });
        },

        toggleSidebar: () => {
          set((state) => {
            state.sidebarOpen = !state.sidebarOpen;
          });
        },

        setSidebarCollapsed: (collapsed) => {
          set((state) => {
            state.sidebarCollapsed = collapsed;
          });
        },

        toggleSidebarCollapsed: () => {
          set((state) => {
            state.sidebarCollapsed = !state.sidebarCollapsed;
          });
        },

        // Mobile menu actions
        setMobileMenuOpen: (open) => {
          set((state) => {
            state.mobileMenuOpen = open;
          });
        },

        toggleMobileMenu: () => {
          set((state) => {
            state.mobileMenuOpen = !state.mobileMenuOpen;
          });
        },

        // Header actions
        setHeaderVisible: (visible) => {
          set((state) => {
            state.headerVisible = visible;
          });
        },

        // Screen actions
        setIsMobile: (isMobile) => {
          set((state) => {
            state.isMobile = isMobile;
            // Auto-close sidebar on mobile
            if (isMobile) {
              state.sidebarOpen = false;
            }
          });
        },

        setBreakpoint: (breakpoint) => {
          set((state) => {
            state.breakpoint = breakpoint;
            state.isMobile = ['xs', 'sm'].includes(breakpoint);
          });
        },

        // Modal actions
        openModal: (modal) => {
          const id = modal.id || generateId();

          set((state) => {
            // Remove existing modal with same id if exists
            state.modals = state.modals.filter((m) => m.id !== id);

            // Add new modal
            state.modals.push({
              ...modal,
              id,
              closeable: modal.closeable ?? true,
              priority: modal.priority ?? 0,
            });

            // Sort by priority (higher priority = shown on top)
            state.modals.sort((a, b) => (b.priority || 0) - (a.priority || 0));

            state.activeModalId = id;
          });

          return id;
        },

        closeModal: (id) => {
          set((state) => {
            if (id) {
              state.modals = state.modals.filter((m) => m.id !== id);
            } else if (state.activeModalId) {
              // Close active modal
              state.modals = state.modals.filter((m) => m.id !== state.activeModalId);
            }

            // Update active modal
            state.activeModalId = state.modals.length > 0 ? state.modals[0].id : null;
          });
        },

        closeAllModals: () => {
          set((state) => {
            state.modals = [];
            state.activeModalId = null;
          });
        },

        isModalOpen: (id) => {
          return get().modals.some((m) => m.id === id);
        },

        // Toast actions
        showToast: (toast) => {
          const id = generateId();
          const duration = toast.duration ?? TOAST_DEFAULT_DURATION;

          set((state) => {
            state.toasts.push({ ...toast, id });
          });

          // Auto dismiss after duration
          if (duration > 0) {
            setTimeout(() => {
              get().dismissToast(id);
            }, duration);
          }

          return id;
        },

        dismissToast: (id) => {
          set((state) => {
            state.toasts = state.toasts.filter((t) => t.id !== id);
          });
        },

        clearAllToasts: () => {
          set((state) => {
            state.toasts = [];
          });
        },

        // Loading actions
        setGlobalLoading: (loading, message) => {
          set((state) => {
            state.globalLoading = loading;
            state.loadingMessage = loading ? (message || null) : null;
          });
        },

        // Scroll actions
        setScrollY: (y) => {
          set((state) => {
            const previousY = state.scrollY;
            state.scrollY = y;
            state.scrollDirection = y > previousY ? 'down' : y < previousY ? 'up' : state.scrollDirection;
          });
        },

        setScrollDirection: (direction) => {
          set((state) => {
            state.scrollDirection = direction;
          });
        },
      })),
      {
        name: STORE_NAME,
        storage: createJSONStorage(() => {
          if (typeof window !== 'undefined') {
            return localStorage;
          }
          return {
            getItem: () => null,
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            setItem: () => {},
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            removeItem: () => {},
          };
        }),
        partialize: (state) => ({
          theme: state.theme,
          language: state.language,
          preferences: state.preferences,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
      }
    ),
    { name: 'UIStore', enabled: process.env.NODE_ENV === 'development' }
  )
);

// ============================================================================
// Selectors (for optimized re-renders)
// ============================================================================

export const selectTheme = (state: UIStore) => state.theme;
export const selectResolvedTheme = (state: UIStore) => state.resolvedTheme;
export const selectLanguage = (state: UIStore) => state.language;
export const selectPreferences = (state: UIStore) => state.preferences;
export const selectSidebarOpen = (state: UIStore) => state.sidebarOpen;
export const selectSidebarCollapsed = (state: UIStore) => state.sidebarCollapsed;
export const selectMobileMenuOpen = (state: UIStore) => state.mobileMenuOpen;
export const selectIsMobile = (state: UIStore) => state.isMobile;
export const selectBreakpoint = (state: UIStore) => state.breakpoint;
export const selectModals = (state: UIStore) => state.modals;
export const selectActiveModal = (state: UIStore) =>
  state.modals.find((m) => m.id === state.activeModalId) || null;
export const selectToasts = (state: UIStore) => state.toasts;
export const selectGlobalLoading = (state: UIStore) => state.globalLoading;
export const selectLoadingMessage = (state: UIStore) => state.loadingMessage;
export const selectHeaderVisible = (state: UIStore) => state.headerVisible;
