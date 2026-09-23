// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, push, onValue, update } from 'firebase/database';

let db: any = null;
let firebaseAvailable = false;

const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1551985995778363515/uoe4pmd6Qd7t3LqEMOYZKqpexYwmTAqpKyQsmqkfBUK7TQt5MThJLYXwx_HOriKgIz7m";

// Initialize Firebase immediately
try {
  const firebaseConfig = {
    apiKey: "AIzaSyBMaCOQyt3_sMf3lo7WgO5J7OuMnN40jM4",
    authDomain: "global-stacker-game.firebaseapp.com",
    databaseURL: "https://global-stacker-game-default-rtdb.firebaseio.com",
    projectId: "global-stacker-game",
    storageBucket: "global-stacker-game.firebasestorage.app",
    messagingSenderId: "230230658853",
    appId: "1:230230658853:web:8a302361aff7e1f55d14cc",
    measurementId: "G-8XTMWW7P1K"
  };
  
  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
  firebaseAvailable = true;
  console.log('Firebase initialized');
} catch (error) {
  console.warn('Firebase initialization failed:', error);
  firebaseAvailable = false;
}

// Local storage fallback
const LOCAL_KEYS = {
  PULLS_TO_WIN: 'sword_game_pulls_to_win',
  LEADERBOARD: 'sword_game_leaderboard',
  NAMES: 'sword_game_names',
};

function getLocalPullsToWin(): number {
  try {
    const val = localStorage.getItem(LOCAL_KEYS.PULLS_TO_WIN);
    return val ? parseInt(val) : 1;
  } catch {
    return 1;
  }
}

function setLocalPullsToWin(value: number): void {
  try {
    localStorage.setItem(LOCAL_KEYS.PULLS_TO_WIN, value.toString());
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

function getLocalLeaderboard(): any[] {
  try {
    const val = localStorage.getItem(LOCAL_KEYS.LEADERBOARD);
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
}

function addLocalLeaderboardEntry(entry: any): void {
  try {
    const lb = getLocalLeaderboard();
    lb.unshift(entry);
    localStorage.setItem(LOCAL_KEYS.LEADERBOARD, JSON.stringify(lb));
  } catch (e) {
    console.warn('Failed to save leaderboard:', e);
  }
}

function getLocalNames(): Record<string, string> {
  try {
    const val = localStorage.getItem(LOCAL_KEYS.NAMES);
    return val ? JSON.parse(val) : {};
  } catch {
    return {};
  }
}

function setLocalNames(names: Record<string, string>): void {
  try {
    localStorage.setItem(LOCAL_KEYS.NAMES, JSON.stringify(names));
  } catch (e) {
    console.warn('Failed to save names:', e);
  }
}

// --- Pulls to Win ---
export async function getPullsToWin(): Promise<number> {
  if (!firebaseAvailable || !db) {
    return getLocalPullsToWin();
  }
  
  try {
    const snapshot = await get(ref(db, 'pullsToWin'));
    return snapshot.exists() ? snapshot.val() : getLocalPullsToWin();
  } catch (error) {
    console.warn('Failed to get pullsToWin from Firebase:', error);
    return getLocalPullsToWin();
  }
}

export async function incrementPullsToWin(): Promise<number> {
  if (!firebaseAvailable || !db) {
    const current = getLocalPullsToWin();
    setLocalPullsToWin(current + 1);
    return current + 1;
  }
  
  try {
    const pullsRef = ref(db, 'pullsToWin');
    const snapshot = await get(pullsRef);
    const current = snapshot.exists() ? snapshot.val() : 1;
    await set(pullsRef, current + 1);
    return current + 1;
  } catch (error) {
    console.warn('Failed to increment in Firebase:', error);
    const current = getLocalPullsToWin();
    setLocalPullsToWin(current + 1);
    return current + 1;
  }
}

// --- Leaderboard ---
export async function addWin(entry: { name: string; pulls: number; timestamp: number }) {
  if (!firebaseAvailable || !db) {
    addLocalLeaderboardEntry(entry);
    return;
  }
  
  try {
    const newRef = push(ref(db, 'leaderboard'));
    await set(newRef, entry);
  } catch (error) {
    console.warn('Failed to add win to Firebase:', error);
    addLocalLeaderboardEntry(entry);
  }
}

export function subscribeLeaderboard(callback: (data: any[]) => void): () => void {
  let unsub: (() => void) | null = null;
  
  // Start with local data immediately
  callback(getLocalLeaderboard());
  
  if (!firebaseAvailable || !db) {
    return () => {};
  }
  
  try {
    unsub = onValue(ref(db, 'leaderboard'), (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      
      const data = snapshot.val();
      const arr = Object.values(data).sort((a: any, b: any) => b.timestamp - a.timestamp);
      callback(arr);
    }, (error) => {
      console.warn('Firebase subscription error:', error);
      callback(getLocalLeaderboard());
    });
  } catch (error) {
    console.warn('Failed to subscribe to leaderboard:', error);
  }
  
  return () => {
    if (unsub) unsub();
  };
}

// --- Users / Names ---
export async function isNameTaken(name: string, excludeUserId?: string): Promise<boolean> {
  if (!firebaseAvailable || !db) {
    const names = getLocalNames();
    return Object.entries(names).some(([uid, n]) => 
      n.toLowerCase() === name.toLowerCase() && uid !== excludeUserId
    );
  }
  
  try {
    const snapshot = await get(ref(db, 'names'));
    if (!snapshot.exists()) return false;
    const names: Record<string, string> = snapshot.val();
    return Object.entries(names).some(([uid, n]) => 
      n.toLowerCase() === name.toLowerCase() && uid !== excludeUserId
    );
  } catch (error) {
    console.warn('Failed to check name:', error);
    const names = getLocalNames();
    return Object.entries(names).some(([uid, n]) => 
      n.toLowerCase() === name.toLowerCase() && uid !== excludeUserId
    );
  }
}

export async function renameUser(userId: string, oldName: string, newName: string) {
  // Always update local storage
  const names = getLocalNames();
  names[userId] = newName;
  setLocalNames(names);
  
  const lb = getLocalLeaderboard();
  const updated = lb.map((entry: any) => 
    entry.name === oldName ? { ...entry, name: newName } : entry
  );
  try {
    localStorage.setItem(LOCAL_KEYS.LEADERBOARD, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to update local leaderboard:', e);
  }
  
  if (!firebaseAvailable || !db) {
    return;
  }
  
  try {
    await set(ref(db, `names/${userId}`), newName);
    
    const snapshot = await get(ref(db, 'leaderboard'));
    if (!snapshot.exists()) return;
    const data = snapshot.val();
    const updates: Record<string, any> = {};
    Object.entries(data).forEach(([key, entry]: [string, any]) => {
      if (entry.name === oldName) {
        updates[`leaderboard/${key}/name`] = newName;
      }
    });
    if (Object.keys(updates).length > 0) {
      await update(ref(db), updates);
    }
  } catch (error) {
    console.warn('Failed to rename in Firebase:', error);
  }
}

// --- Discord Notifications ---
export async function sendDiscordNotification(playerName: string, pullsAchieved: number, pullsToWin: number) {
  const diff = pullsToWin - pullsAchieved;
  let message = '';
  let color = 0x888888;
  
  if (pullsAchieved >= pullsToWin) {
    message = `🏆 **${playerName}** pulled the sword in **${pullsToWin} pulls**! A new champion rises!`;
    color = 0xffd700;
  } else if (diff <= 3) {
    const labels: Record<number, string> = {
      1: '🔥',
      2: '⚡',
      3: '💫',
    };
    const emoji = labels[diff] || '✨';
    message = `${emoji} **${playerName}** reached pull **${pullsAchieved}** (${diff} pull${diff > 1 ? 's' : ''} from victory!)`;
    color = diff === 1 ? 0xff4444 : diff === 2 ? 0xff8800 : 0xffaa00;
  } else {
    return;
  }

  try {
    await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          description: message,
          color: color,
          footer: { text: `pulls to win: ${pullsToWin}` }
        }]
      }),
    });
  } catch (e) {
    console.warn('Discord notification failed:', e);
  }
}
