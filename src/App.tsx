import { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import confetti from 'canvas-confetti';
import { Sword, Stone, Ground, Particles, Trees, Rocks, Grass } from './components/Scene';
import {
  getPullsToWin,
  incrementPullsToWin,
  addWin,
  subscribeLeaderboard,
  renameUser,
} from './firebase';

type GameState = 'idle' | 'pulling' | 'won' | 'cooldown' | 'returning';

interface LeaderboardEntry {
  name: string;
  pulls: number;
  timestamp: number;
}

function App() {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [pullsToWin, setPullsToWin] = useState(1);
  const [currentPull, setCurrentPull] = useState(0);
  const [pullProgress, setPullProgress] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('sword_player_name') || '');
  const [showNameInput, setShowNameInput] = useState(false);
  const [editingName, setEditingName] = useState('');
  // Stats: how many times failed at each pull depth
  const [failStats, setFailStats] = useState<Record<number, number>>({});
  const [totalTries, setTotalTries] = useState(0);
  const [lastWinPulls, setLastWinPulls] = useState(0);
  const [cooldownTime, setCooldownTime] = useState(0);
  const animationRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  // Load initial data
  useEffect(() => {
    getPullsToWin().then(setPullsToWin);
    const unsub = subscribeLeaderboard((data) => {
      setLeaderboard(data);
    });
    return () => {
      isMountedRef.current = false;
      unsub();
    };
  }, []);

  // Check if name is needed
  useEffect(() => {
    if (!playerName) {
      setShowNameInput(true);
    }
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (gameState === 'cooldown') {
      setCooldownTime(2);
      const interval = setInterval(() => {
        setCooldownTime(prev => {
          if (prev <= 0.1) {
            clearInterval(interval);
            setGameState('idle');
            return 0;
          }
          return Math.max(0, prev - 0.1);
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [gameState]);

  const getPullTimings = useCallback((k: number): number[] => {
    // kth pull = 1s, each before = x0.8 (min 0.25)
    // For k=3: [0.64, 0.8, 1.0]
    const timings: number[] = [];
    for (let i = 0; i < k; i++) {
      const timeFromEnd = k - 1 - i;
      const time = Math.max(0.25, 1 * Math.pow(0.8, timeFromEnd));
      timings.push(time);
    }
    return timings;
  }, []);

  const fireConfetti = useCallback(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#ffd700', '#ff6b35', '#ffffff'],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#ffd700', '#ff6b35', '#ffffff'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    // Big burst
    confetti({
      particleCount: 150,
      spread: 120,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#ffd700', '#ff6b35', '#ffffff', '#4ade80'],
      startVelocity: 45,
    });
  }, []);

  const animatePull = useCallback((
    pullIndex: number,
    duration: number,
    startFrom: number,
    onSuccess: () => void,
    onFail: () => void
  ) => {
    const startTime = performance.now();
    const durationMs = duration * 1000;
    const targetProgress = (pullIndex + 1) / pullsToWin; // cumulative target

    const animate = (now: number) => {
      if (!isMountedRef.current) return;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      // Interpolate from start position to target
      const currentProgress = startFrom + (targetProgress - startFrom) * eased;
      setPullProgress(currentProgress);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Pull complete - determine success
        if (pullIndex === 0) {
          // First pull always succeeds
          onSuccess();
        } else {
          // 70% chance of success
          if (Math.random() < 0.7) {
            onSuccess();
          } else {
            onFail();
          }
        }
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [pullsToWin]);

  const animateReturn = useCallback((fromProgress: number, callback: () => void) => {
    const startTime = performance.now();
    const duration = 500;

    const animate = (now: number) => {
      if (!isMountedRef.current) return;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress * progress; // ease in (accelerating down)
      const current = fromProgress * (1 - eased);
      setPullProgress(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setPullProgress(0);
        callback();
      }
    };

    requestAnimationFrame(animate);
  }, []);

  const handlePull = useCallback(async () => {
    if (gameState !== 'idle' || !playerName) return;

    setGameState('pulling');
    setCurrentPull(0);
    setPullProgress(0);
    setTotalTries(prev => prev + 1);

    const timings = getPullTimings(pullsToWin);

    const doPull = async (index: number) => {
      if (!isMountedRef.current) return;
      
      if (index >= pullsToWin) {
        // Won!
        setGameState('won');
        setLastWinPulls(pullsToWin);
        fireConfetti();
        
        const newCount = await incrementPullsToWin();
        if (isMountedRef.current) {
          setPullsToWin(newCount);
        }
        
        await addWin({
          name: playerName,
          pulls: pullsToWin,
          timestamp: Date.now(),
        });
        
        return;
      }

      setCurrentPull(index);
      const startFrom = index / pullsToWin; // where the sword currently is

      animatePull(
        index,
        timings[index],
        startFrom,
        () => {
          // Success - move to next pull
          doPull(index + 1);
        },
        () => {
          // Failed - record fail stat and return sword
          setFailStats(prev => ({
            ...prev,
            [index + 1]: (prev[index + 1] || 0) + 1
          }));
          setGameState('returning');
          const currentProgress = (index + 1) / pullsToWin;
          
          animateReturn(currentProgress, () => {
            if (!isMountedRef.current) return;
            setGameState('cooldown');
          });
        }
      );
    };

    doPull(0);
  }, [gameState, playerName, pullsToWin, getPullTimings, animatePull, fireConfetti, animateReturn]);

  const handleNameSubmit = () => {
    if (editingName.trim()) {
      const oldName = playerName;
      const newName = editingName.trim();
      setPlayerName(newName);
      localStorage.setItem('sword_player_name', newName);
      setShowNameInput(false);
      
      if (oldName && oldName !== newName) {
        renameUser(oldName, newName);
      }
    }
  };

  const handleContinue = () => {
    setFailStats({});
    setTotalTries(0);
    setGameState('returning');
    // Animate sword back to stone
    animateReturn(1, () => {
      if (!isMountedRef.current) return;
      setGameState('cooldown');
    });
  };

  return (
    <div className="w-full h-screen relative overflow-hidden bg-[#0a0f0a] font-['Fira_Code',monospace]">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 1, 5], fov: 50 }}
        shadows
        className="absolute inset-0"
      >
        <ambientLight intensity={0.3} />
        <directionalLight
          position={[5, 8, 5]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[0, 3, 0]} intensity={0.8} color="#ffd700" distance={8} />
        <pointLight position={[-3, 2, -2]} intensity={0.3} color="#4488ff" distance={10} />
        <fog attach="fog" args={['#0a1a0a', 8, 25]} />
        
        <Sword pullProgress={pullProgress} shaking={gameState === 'pulling'} />
        <Stone />
        <Ground />
        <Particles />
        <Trees />
        <Rocks />
        <Grass />
        
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={Math.PI / 5}
          autoRotate={gameState === 'idle'}
          autoRotateSpeed={0.3}
        />
      </Canvas>

      {/* Minimal UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top bar */}
        <div className="flex justify-between items-start p-4 pointer-events-auto">
          {/* Pulls to win indicator */}
          <div className="bg-black/40 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
            <span className="text-white/50 text-[10px] uppercase tracking-wider">pulls to win</span>
            <div className="text-2xl text-amber-400 font-bold">{pullsToWin}</div>
          </div>

          {/* Player name */}
          <button
            onClick={() => { setEditingName(playerName); setShowNameInput(true); }}
            className="bg-black/40 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10 hover:border-amber-400/50 transition-colors cursor-pointer"
          >
            <span className="text-white/50 text-[10px] uppercase tracking-wider">player</span>
            <div className="text-sm text-white">{playerName || 'set name'}</div>
          </button>
        </div>

        {/* Center - Pull button area */}
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 pointer-events-auto">
          {gameState === 'idle' && (
            <div className="text-center">
              <button
                onClick={handlePull}
                disabled={!playerName}
                className="group relative px-8 py-4 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/40 hover:border-amber-400/80 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span className="text-amber-100 text-base tracking-wider font-medium">PULL THE SWORD</span>
                <div className="absolute inset-0 rounded-xl bg-amber-400/0 group-hover:bg-amber-400/5 transition-all" />
              </button>
              <p className="text-white/20 text-[10px] mt-3 tracking-wider">the sword awaits...</p>
            </div>
          )}

          {gameState === 'pulling' && (
            <div className="text-center">
              <div className="text-amber-400 text-sm tracking-wider">
                pull {currentPull + 1}/{pullsToWin}
              </div>
              <div className="mt-2 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-75 rounded-full"
                  style={{ width: `${pullProgress * 100}%` }}
                />
              </div>
            </div>
          )}

          {gameState === 'returning' && (
            <div className="text-center">
              <div className="text-red-400/80 text-sm">the sword resists...</div>
            </div>
          )}

          {gameState === 'cooldown' && (
            <div className="text-center">
              <div className="text-white/30 text-xs tracking-wider">cooldown</div>
              <div className="text-white/50 text-lg font-light">{cooldownTime.toFixed(1)}s</div>
            </div>
          )}
        </div>

        {/* Leaderboard toggle */}
        <div className="absolute bottom-4 right-4 pointer-events-auto">
          <button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10 hover:border-amber-400/50 transition-colors text-white/50 hover:text-amber-400 text-xs cursor-pointer"
          >
            {showLeaderboard ? '✕' : '🏆'}
          </button>
        </div>

        {/* Leaderboard panel */}
        {showLeaderboard && (
          <div className="absolute bottom-14 right-4 w-72 max-h-[60vh] overflow-y-auto bg-black/80 backdrop-blur-md rounded-xl border border-white/10 pointer-events-auto">
            <div className="p-4">
              <h3 className="text-amber-400 text-xs font-bold mb-3 uppercase tracking-wider">champions</h3>
              {leaderboard.length === 0 ? (
                <p className="text-white/30 text-xs">no champions yet</p>
              ) : (
                <div className="space-y-1.5">
                  {leaderboard.map((entry, i) => (
                    <div
                      key={`${entry.timestamp}-${i}`}
                      className={`flex justify-between items-center px-3 py-2 rounded-lg text-xs ${
                        i === 0 ? 'bg-amber-500/15 border border-amber-400/20' : 'bg-white/[0.03]'
                      }`}
                    >
                      <span className={`font-medium ${i === 0 ? 'text-amber-300' : 'text-white/70'}`}>
                        {entry.pulls} {entry.pulls === 1 ? 'pull' : 'pulls'}
                      </span>
                      <span className={`truncate ml-3 ${i === 0 ? 'text-amber-200' : 'text-white/50'}`}>
                        {entry.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Win overlay */}
        {gameState === 'won' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
            <div className="bg-black/85 backdrop-blur-lg rounded-2xl border border-amber-400/30 p-8 max-w-xs w-full mx-4" style={{ animation: 'fadeIn 0.5s ease-out' }}>
              <div className="text-center">
                <div className="text-5xl mb-3">⚔️</div>
                <h2 className="text-xl text-amber-400 font-bold mb-1 tracking-wider">VICTORY</h2>
                <p className="text-white/50 text-xs mb-4">
                  pulled in {lastWinPulls} {lastWinPulls === 1 ? 'pull' : 'pulls'}
                </p>
                
                {/* Stats */}
                <div className="text-left bg-white/[0.03] rounded-lg p-3 mb-4 border border-white/5">
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2">session stats</p>
                  {Object.keys(failStats).length > 0 ? (
                    <div className="space-y-1">
                      {Object.entries(failStats)
                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                        .map(([pulls, count]) => (
                          <div key={pulls} className="flex justify-between text-xs">
                            <span className="text-white/50">{pulls} pull{parseInt(pulls) > 1 ? 's' : ''} loss</span>
                            <span className="text-amber-400/80">{count}×</span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-white/40 text-xs">perfect pull — no losses!</p>
                  )}
                  <div className="mt-2 pt-2 border-t border-white/5 flex justify-between text-xs">
                    <span className="text-white/40">total tries</span>
                    <span className="text-white/70">{totalTries}</span>
                  </div>
                </div>

                <button
                  onClick={handleContinue}
                  className="px-6 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 hover:border-amber-400/70 rounded-lg text-amber-100 text-xs tracking-wider transition-all cursor-pointer"
                >
                  CONTINUE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Name input modal */}
      {showNameInput && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
          <div className="bg-[#12121a] rounded-2xl border border-white/10 p-6 w-80 shadow-2xl">
            <h3 className="text-amber-400 text-base font-bold mb-1 tracking-wider">
              {playerName ? 'change name' : 'enter the arena'}
            </h3>
            <p className="text-white/30 text-[10px] mb-4 uppercase tracking-wider">
              {playerName ? 'wins transfer to new name' : 'choose your champion name'}
            </p>
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              placeholder="your name..."
              maxLength={20}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400/50 placeholder-white/20 mb-4 font-['Fira_Code',monospace]"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleNameSubmit}
                disabled={!editingName.trim()}
                className="flex-1 px-4 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 rounded-lg text-amber-100 text-xs tracking-wider transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {playerName ? 'UPDATE' : 'ENTER'}
              </button>
              {playerName && (
                <button
                  onClick={() => setShowNameInput(false)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/50 text-xs tracking-wider transition-colors cursor-pointer"
                >
                  CANCEL
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
