import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, push, onValue, update } from 'firebase/database';

// Firebase config - replace with your actual config
const firebaseConfig = {
  apiKey: "demo-key",
  authDomain: "demo.firebaseapp.com",
  databaseURL: "https://demo-default.rtdb.firebaseio.com",
  projectId: "demo",
  storageBucket: "demo.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:000000000000"
};

let db: ReturnType<typeof getDatabase> | null = null;
let useLocalMode = true;

try {
  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
  useLocalMode = false;
} catch {
  useLocalMode = true;
}

// Local storage fallback for demo
const LOCAL_KEYS = {
  PULLS_TO_WIN: 'sword_game_pulls_to_win',
  LEADERBOARD: 'sword_game_leaderboard',
  USERS: 'sword_game_users',
};

function getLocalPullsToWin(): number {
  const val = localStorage.getItem(LOCAL_KEYS.PULLS_TO_WIN);
  return val ? parseInt(val) : 1;
}

function setLocalPullsToWin(val: number) {
  localStorage.setItem(LOCAL_KEYS.PULLS_TO_WIN, val.toString());
}

function getLocalLeaderboard(): any[] {
  const val = localStorage.getItem(LOCAL_KEYS.LEADERBOARD);
  return val ? JSON.parse(val) : [];
}

function addLocalLeaderboardEntry(entry: any) {
  const lb = getLocalLeaderboard();
  lb.unshift(entry);
  localStorage.setItem(LOCAL_KEYS.LEADERBOARD, JSON.stringify(lb));
}

function getLocalUsers(): Record<string, any> {
  const val = localStorage.getItem(LOCAL_KEYS.USERS);
  return val ? JSON.parse(val) : {};
}

function setLocalUser(userId: string, data: any) {
  const users = getLocalUsers();
  users[userId] = data;
  localStorage.setItem(LOCAL_KEYS.USERS, JSON.stringify(users));
}

// API
export async function getPullsToWin(): Promise<number> {
  if (useLocalMode) return getLocalPullsToWin();
  try {
    const snapshot = await get(ref(db!, 'pullsToWin'));
    return snapshot.exists() ? snapshot.val() : 1;
  } catch {
    return getLocalPullsToWin();
  }
}

export async function incrementPullsToWin(): Promise<number> {
  if (useLocalMode) {
    const current = getLocalPullsToWin();
    setLocalPullsToWin(current + 1);
    return current + 1;
  }
  try {
    const snapshot = await get(ref(db!, 'pullsToWin'));
    const current = snapshot.exists() ? snapshot.val() : 1;
    await set(ref(db!, 'pullsToWin'), current + 1);
    return current + 1;
  } catch {
    const current = getLocalPullsToWin();
    setLocalPullsToWin(current + 1);
    return current + 1;
  }
}

export async function addWin(entry: { name: string; pulls: number; timestamp: number }) {
  if (useLocalMode) {
    addLocalLeaderboardEntry(entry);
    return;
  }
  try {
    const newRef = push(ref(db!, 'leaderboard'));
    await set(newRef, entry);
  } catch {
    addLocalLeaderboardEntry(entry);
  }
}

export async function getLeaderboard(): Promise<any[]> {
  if (useLocalMode) return getLocalLeaderboard();
  try {
    const snapshot = await get(ref(db!, 'leaderboard'));
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.values(data).sort((a: any, b: any) => b.timestamp - a.timestamp);
  } catch {
    return getLocalLeaderboard();
  }
}

export function subscribeLeaderboard(callback: (data: any[]) => void) {
  if (useLocalMode) {
    callback(getLocalLeaderboard());
    return () => {};
  }
  try {
    const unsub = onValue(ref(db!, 'leaderboard'), (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      const data = snapshot.val();
      const arr = Object.values(data).sort((a: any, b: any) => b.timestamp - a.timestamp);
      callback(arr);
    });
    return unsub;
  } catch {
    callback(getLocalLeaderboard());
    return () => {};
  }
}

export async function setUser(userId: string, name: string) {
  if (useLocalMode) {
    setLocalUser(userId, { name, createdAt: Date.now() });
    return;
  }
  try {
    await set(ref(db!, `users/${userId}`), { name, createdAt: Date.now() });
  } catch {
    setLocalUser(userId, { name, createdAt: Date.now() });
  }
}

export async function renameUser(oldName: string, newName: string) {
  if (useLocalMode) {
    // Update leaderboard entries
    const lb = getLocalLeaderboard();
    const updated = lb.map((e: any) => e.name === oldName ? { ...e, name: newName } : e);
    localStorage.setItem(LOCAL_KEYS.LEADERBOARD, JSON.stringify(updated));
    return;
  }
  try {
    const snapshot = await get(ref(db!, 'leaderboard'));
    if (!snapshot.exists()) return;
    const data = snapshot.val();
    const updates: Record<string, any> = {};
    Object.entries(data).forEach(([key, entry]: [string, any]) => {
      if (entry.name === oldName) {
        updates[`leaderboard/${key}/name`] = newName;
      }
    });
    if (Object.keys(updates).length > 0) {
      await update(ref(db!), updates);
    }
  } catch {
    const lb = getLocalLeaderboard();
    const updated = lb.map((e: any) => e.name === oldName ? { ...e, name: newName } : e);
    localStorage.setItem(LOCAL_KEYS.LEADERBOARD, JSON.stringify(updated));
  }
}
