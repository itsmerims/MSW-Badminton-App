// Offline mode support utilities

export const isOnline = (): boolean => {
  if (typeof navigator !== 'undefined') {
    return navigator.onLine;
  }
  return true;
};

export const setupOfflineListeners = (
  onOnline: () => void,
  onOffline: () => void
) => {
  if (typeof window !== 'undefined') {
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }
  return () => {};
};

// Local storage keys
const STORAGE_KEYS = {
  PLAYERS: 'tbc_players_offline',
  MATCHES: 'tbc_matches_offline',
  COURTS: 'tbc_courts_offline',
  SESSIONS: 'tbc_sessions_offline',
  FEES: 'tbc_fees_offline',
  PENDING_ACTIONS: 'tbc_pending_actions',
};

// Save data to local storage for offline access
export const saveToLocalStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to local storage:', error);
  }
};

// Load data from local storage
export const loadFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error('Failed to load from local storage:', error);
    return defaultValue;
  }
};

// Clear data from local storage
export const clearFromLocalStorage = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear from local storage:', error);
  }
};

// Save pending actions for sync when online
export interface PendingAction {
  id: string;
  type: 'add' | 'update' | 'delete';
  collection: 'players' | 'matches' | 'courts' | 'sessions' | 'fees';
  data: any;
  timestamp: number;
}

export const savePendingAction = (action: PendingAction) => {
  const pendingActions = loadFromLocalStorage<PendingAction[]>(
    STORAGE_KEYS.PENDING_ACTIONS,
    []
  );
  pendingActions.push(action);
  saveToLocalStorage(STORAGE_KEYS.PENDING_ACTIONS, pendingActions);
};

export const getPendingActions = (): PendingAction[] => {
  return loadFromLocalStorage<PendingAction[]>(
    STORAGE_KEYS.PENDING_ACTIONS,
    []
  );
};

export const clearPendingActions = () => {
  clearFromLocalStorage(STORAGE_KEYS.PENDING_ACTIONS);
};

// Sync pending actions when back online
export const syncPendingActions = async (
  executeAction: (action: PendingAction) => Promise<void>
) => {
  const pendingActions = getPendingActions();
  
  for (const action of pendingActions) {
    try {
      await executeAction(action);
    } catch (error) {
      console.error('Failed to sync action:', action, error);
    }
  }
  
  if (pendingActions.length > 0) {
    clearPendingActions();
  }
  
  return pendingActions.length;
};

// Check if there are pending actions
export const hasPendingActions = (): boolean => {
  return getPendingActions().length > 0;
};
