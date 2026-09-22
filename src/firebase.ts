// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set, push, onValue, update } from "firebase/database";

// Your web app's Firebase configuration
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
const db = getDatabase(app);

const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1551985995778363515/uoe4pmd6Qd7t3LqEMOYZKqpexYwmTAqpKyQsmqkfBUK7TQt5MThJLYXwx_HOriKgIz7m";

// --- Pulls to Win ---
export async function getPullsToWin(): Promise<number> {
  const snapshot = await get(ref(db, 'pullsToWin'));
  return snapshot.exists() ? snapshot.val() : 1;
}

export async function incrementPullsToWin(): Promise<number> {
  const pullsRef = ref(db, 'pullsToWin');
  const snapshot = await get(pullsRef);
  const current = snapshot.exists() ? snapshot.val() : 1;
  await set(pullsRef, current + 1);
  return current + 1;
}

// --- Leaderboard ---
export async function addWin(entry: { name: string; pulls: number; timestamp: number }) {
  const newRef = push(ref(db, 'leaderboard'));
  await set(newRef, entry);
}

export async function getLeaderboard(): Promise<any[]> {
  const snapshot = await get(ref(db, 'leaderboard'));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.values(data).sort((a: any, b: any) => b.timestamp - a.timestamp);
}

export function subscribeLeaderboard(callback: (data: any[]) => void): () => void {
  const unsub = onValue(ref(db, 'leaderboard'), (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = snapshot.val();
    const arr = Object.values(data).sort((a: any, b: any) => b.timestamp - a.timestamp);
    callback(arr);
  });
  return unsub;
}

// --- Users / Names ---
export async function isNameTaken(name: string, excludeUserId?: string): Promise<boolean> {
  const snapshot = await get(ref(db, 'names'));
  if (!snapshot.exists()) return false;
  const names: Record<string, string> = snapshot.val();
  return Object.entries(names).some(([uid, n]) => n.toLowerCase() === name.toLowerCase() && uid !== excludeUserId);
}

export async function setUser(userId: string, name: string) {
  await set(ref(db, `names/${userId}`), name);
}

export async function renameUser(userId: string, oldName: string, newName: string) {
  // Update the name registry
  await set(ref(db, `names/${userId}`), newName);
  
  // Update all leaderboard entries with old name
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
}

// --- Discord Notifications ---
export async function sendDiscordNotification(playerName: string, pullsAchieved: number, pullsToWin: number) {
  const diff = pullsToWin - pullsAchieved;
  let message = '';
  let color = 0x888888;
  
  if (pullsAchieved >= pullsToWin) {
    // Winner!
    message = `🏆 **${playerName}** pulled the sword in **${pullsToWin} pulls**! A new champion rises!`;
    color = 0xffd700;
  } else if (diff <= 3) {
    // Close to winning
    const labels: Record<number, string> = {
      1: '🔥',
      2: '⚡',
      3: '💫',
    };
    const emoji = labels[diff] || '✨';
    message = `${emoji} **${playerName}** reached pull **${pullsAchieved}** (${diff} pull${diff > 1 ? 's' : ''} from victory!)`;
    color = diff === 1 ? 0xff4444 : diff === 2 ? 0xff8800 : 0xffaa00;
  } else {
    return; // Don't notify for far-from-winning attempts
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
