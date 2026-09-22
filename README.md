# Pull the Sword 🗡️

A 3D interactive game where you pull the sword from the stone. Built with React, Three.js, and Firebase.

## Features

- 🎮 **Progressive difficulty**: Each win increases the pulls needed for the next victory
- 🌲 **3D environment**: Forest scene with sword, stone, trees, and atmospheric effects
- 🏆 **Leaderboard**: Track all champions in real-time
- 🎉 **Victory celebrations**: Multi-stage win sequence with confetti
- 📱 **Discord notifications**: Get notified when someone wins or gets close
- 🔒 **Name uniqueness**: Each player has a unique name
- 💾 **Firebase integration**: Real-time database for global state
- 🎨 **Fallback support**: Works even without WebGL

## Tech Stack

- **React 18** - UI framework
- **Three.js** - 3D rendering (via @react-three/fiber)
- **Firebase** - Real-time database
- **Tailwind CSS** - Styling
- **Fira Code** - Monospace font
- **canvas-confetti** - Victory effects

## Game Mechanics

- **First pull**: 100% success rate
- **Subsequent pulls**: 70% success rate
- **Timing**: Each pull takes time (kth pull = 1s, previous ×0.8, min 0.25s)
- **Cooldown**: 2 seconds between attempts
- **Global counter**: Pulls to win increases by 1 after each victory

## Deployment

### GitHub Pages

1. Push to GitHub
2. Go to Settings → Pages
3. Select "Deploy from a branch"
4. Choose `main` branch and `/ (root)` folder
5. Your site will be live at `https://yourusername.github.io/repo-name`

### Vercel/Netlify

1. Connect your GitHub repo
2. Build command: `npm run build`
3. Output directory: `dist`
4. Deploy!

### Local Development

```bash
npm install
npm run dev
```

## Configuration

### Firebase

Update `src/firebase.ts` with your Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  // ...
};
```

### Discord Webhook

Update the webhook URL in `src/firebase.ts`:

```typescript
const DISCORD_WEBHOOK = "YOUR_WEBHOOK_URL";
```

## Troubleshooting

### Blank screen on deployment?

1. Check browser console for errors
2. Verify Firebase config is correct
3. Ensure Firebase Realtime Database rules allow read/write
4. Check if WebGL is supported (fallback scene should appear if not)

### Firebase permission errors?

Set these rules in Firebase Realtime Database:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**Note**: For production, use more restrictive rules with authentication.

## License

MIT
