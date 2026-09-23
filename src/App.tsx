import { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import confetti from 'canvas-confetti';
import { Sword, Stone, Ground, Particles, Trees, Rocks, Grass } from './components/Scene';
import { FallbackScene } from './components/FallbackScene';
import { CanvasErrorBoundary } from './components/CanvasErrorBoundary';
import {
  getPullsToWin,
  incrementPullsToWin,
  addWin,
  subscribeLeaderboard,
  renameUser,
  isNameTaken,
  sendDiscordNotification,
} from './firebase';

type GameState = 'idle' | 'pulling' | 'won' | 'cooldown' | 'returning';
type WinStage = 'victory' | 'celebration' | 'tries' | 'distribution' | 'stats' | 'done';

interface LeaderboardEntry {
  name: string;
  pulls: number;
  timestamp: number;
}

// WebGL detection
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

function App() {
  // Start with defaults - don't wait for Firebase
  const [gameState, setGameState] = useState<GameState>('idle');
  const [pullsToWin, setPullsToWin] = useState(1);
  const [currentPull, setCurrentPull] = useState(0);
  const [pullProgress, setPullProgress] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('sword_player_name') || '');
  const [playerId, setPlayerId] = useState(() => localStorage.getItem('sword_player_id') || '');
  const [showNameInput, setShowNameInput] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [nameError, setNameError] = useState('');
  const [nameChecking, setNameChecking] = useState(false);
  const [failStats, setFailStats] = useState<Record<number, number>>({});
  const [totalTries, setTotalTries] = useState(0);
  const [lastWinPulls, setLastWinPulls] = useState(0);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [winStage, setWinStage] = useState<WinStage | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [webGLSupported] = useState(() => isWebGLAvailable());
  const [canvasReady, setCanvasReady] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  const animationRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  // Generate player ID on first visit
  useEffect(() => {
    if (!playerId) {
      const id = 'player_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      setPlayerId(id);
      localStorage.setItem('sword_player_id', id);
    }
  }, [playerId]);

  // Load data in background - don't block rendering
  useEffect(() => {
    console.log('App mounted, loading data in background...');
    
    // Load pulls to win (non-blocking)
    getPullsToWin().then((pulls) => {
      if (isMountedRef.current) {
        console.log('Loaded pullsToWin:', pulls);
        setPullsToWin(pulls);
      }
    }).catch((e) => {
      console.warn('Failed to load pullsToWin:', e);
    });
    
    // Subscribe to leaderboard (non-blocking)
    const unsub = subscribeLeaderboard((data) => {
      console.log('Leaderboard update:', data.length, 'entries');
      if (isMountedRef.current) {
        setLeaderboard(data);
      }
    });
    
    // Mark as loaded immediately
    setTimeout(() => {
      if (isMountedRef.current) {
        console.log('Setting isLoaded to true');
        setIsLoaded(true);
      }
    }, 100);
    
    return () => {
      console.log('App unmounting');
      isMountedRef.current = false;
      if (unsub) unsub();
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

  // Win stage progression
  useEffect(() => {
    if (winStage === 'victory') {
      const timer = setTimeout(() => setWinStage('celebration'), 1500);
      return () => clearTimeout(timer);
    }
    if (winStage === 'celebration') {
      const timer = setTimeout(() => setWinStage('tries'), 3000);
      return () => clearTimeout(timer);
    }
    if (winStage === 'tries') {
      const timer = setTimeout(() => setWinStage('distribution'), 2500);
      return () => clearTimeout(timer);
    }
    if (winStage === 'distribution') {
      const timer = setTimeout(() => setWinStage('stats'), 2500);
      return () => clearTimeout(timer);
    }
  }, [winStage]);

  // Safety timeout - force load after 3 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isLoaded) {
        console.warn('Loading timeout - forcing display');
        setIsLoaded(true);
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, [isLoaded]);

  // Hide loading screen when app is ready
  useEffect(() => {
    if (isLoaded) {
      const loading = document.getElementById('loading');
      if (loading) {
        loading.classList.add('hidden');
        setTimeout(() => loading.remove(), 300);
      }
    }
  }, [isLoaded]);

  // Check if Canvas has rendered, if not use fallback
  useEffect(() => {
    if (isLoaded && webGLSupported && !useFallback) {
      const canvasTimeout = setTimeout(() => {
        if (!canvasReady) {
          console.warn('Canvas did not initialize, using fallback scene');
          setUseFallback(true);
        }
      }, 2000);
      return () => clearTimeout(canvasTimeout);
    }
  }, [isLoaded, webGLSupported, canvasReady, useFallback]);

  const getPullTimings = useCallback((k: number): number[] => {
    const timings: number[] = [];
    for (let i = 0; i < k; i++) {
      const timeFromEnd = k - 1 - i;
      const time = Math.max(0.25, 1 * Math.pow(0.8, timeFromEnd));
      timings.push(time);
    }
    return timings;
  }, []);

  const fireConfetti = useCallback(() => {
    const duration = 4000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 65,
        origin: { x: 0, y: 0.7 },
        colors: ['#ffd700', '#ff6b35', '#ffffff'],
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 65,
        origin: { x: 1, y: 0.7 },
        colors: ['#ffd700', '#ff6b35', '#ffffff'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    confetti({
      particleCount: 200,
      spread: 140,
      origin: { x: 0.5, y: 0.4 },
      colors: ['#ffd700', '#ff6b35', '#ffffff', '#4ade80', '#ff4444'],
      startVelocity: 50,
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
    const targetProgress = (pullIndex + 1) / pullsToWin;

    const animate = (now: number) => {
      if (!isMountedRef.current) return;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentProgress = startFrom + (targetProgress - startFrom) * eased;
      setPullProgress(currentProgress);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        if (pullIndex === 0) {
          onSuccess();
        } else {
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
      const eased = progress * progress;
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
        setGameState('won');
        setLastWinPulls(pullsToWin);
        setWinStage('victory');
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

        await sendDiscordNotification(playerName, pullsToWin, pullsToWin);
        
        return;
      }

      setCurrentPull(index);
      const startFrom = index / pullsToWin;

      animatePull(
        index,
        timings[index],
        startFrom,
        () => {
          doPull(index + 1);
        },
        () => {
          setFailStats(prev => ({
            ...prev,
            [index + 1]: (prev[index + 1] || 0) + 1
          }));
          
          const pullsFromWin = pullsToWin - (index + 1);
          if (pullsFromWin >= 1 && pullsFromWin <= 3) {
            sendDiscordNotification(playerName, index + 1, pullsToWin);
          }
          
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

  const handleNameSubmit = async () => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    
    setNameChecking(true);
    setNameError('');

    try {
      const taken = await isNameTaken(trimmed, playerId || undefined);
      if (taken) {
        setNameError('name already taken');
        setNameChecking(false);
        return;
      }

      const oldName = playerName;
      setPlayerName(trimmed);
      localStorage.setItem('sword_player_name', trimmed);
      setShowNameInput(false);
      setNameError('');
      
      if (oldName && oldName !== trimmed && playerId) {
        await renameUser(playerId, oldName, trimmed);
      }
    } catch (e) {
      setNameError('error checking name');
    }
    setNameChecking(false);
  };

  const handleContinue = () => {
    setFailStats({});
    setTotalTries(0);
    setWinStage(null);
    setGameState('returning');
    animateReturn(1, () => {
      if (!isMountedRef.current) return;
      setGameState('cooldown');
    });
  };

  const handleSkipToStats = () => {
    setWinStage('done');
  };

  // Loading screen
  if (!isLoaded) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#0a0f0a] font-['Fira_Code',monospace]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⚔️</div>
          <p className="text-amber-400/60 text-sm tracking-wider">loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative overflow-hidden bg-[#0a0f0a] font-['Fira_Code',monospace]">
      {/* 3D Canvas or Fallback */}
      {(webGLSupported && !useFallback) ? (
        <CanvasErrorBoundary fallback={<FallbackScene pullProgress={pullProgress} />}>
          <Canvas
            camera={{ position: [0, 1, 5], fov: 50 }}
            className="absolute inset-0"
            dpr={1}
            gl={{ 
              antialias: false, 
              alpha: false,
              powerPreference: 'low-power'
            }}
            onCreated={({ gl }) => {
              gl.setClearColor('#0a0f0a');
              console.log('Canvas created successfully');
              setCanvasReady(true);
            }}
          >
            <ambientLight intensity={0.4} />
            <directionalLight
              position={[5, 8, 5]}
              intensity={1}
            />
            <pointLight position={[0, 3, 0]} intensity={0.6} color="#ffd700" distance={8} />
            <fog attach="fog" args={['#0a1a0a', 10, 20]} />
            
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
        </CanvasErrorBoundary>
      ) : (
        <div className="absolute inset-0">
          <FallbackScene pullProgress={pullProgress} />
        </div>
      )}

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
            onClick={() => { setEditingName(playerName); setShowNameInput(true); setNameError(''); }}
            className="bg-black/40 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10 hover:border-amber-400/50 transition-colors cursor-pointer"
          >
            <span className="text-white/50 text-[10px] uppercase tracking-wider">player</span>
            <div className="text-sm text-white">{playerName || 'set name'}</div>
          </button>
        </div>

        {/* Small persistent leaderboard */}
        <div className="absolute top-20 left-4 pointer-events-auto">
          <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 w-48 max-h-48 overflow-hidden">
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className="w-full flex justify-between items-center px-3 py-2 text-[10px] uppercase tracking-wider text-amber-400/80 hover:text-amber-400 cursor-pointer"
            >
              <span>🏆 champions</span>
              <span className="text-white/30">{showLeaderboard ? '▲' : '▼'}</span>
            </button>
            {showLeaderboard && (
              <div className="px-2 pb-2 max-h-36 overflow-y-auto">
                {leaderboard.length === 0 ? (
                  <p className="text-white/20 text-[10px] px-1">none yet</p>
                ) : (
                  <div className="space-y-0.5">
                    {leaderboard.slice(0, 20).map((entry, i) => (
                      <div
                        key={`${entry.timestamp}-${i}`}
                        className={`flex justify-between items-center px-2 py-1 rounded text-[10px] ${
                          i === 0 ? 'bg-amber-500/15 border border-amber-400/20' : ''
                        }`}
                      >
                        <span className={`truncate ${i === 0 ? 'text-amber-300' : 'text-white/50'}`}>
                          {entry.name}
                        </span>
                        <span className={`ml-2 shrink-0 ${i === 0 ? 'text-amber-400' : 'text-white/30'}`}>
                          {entry.pulls}p
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
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

        {/* Win overlay - multi-stage */}
        {gameState === 'won' && winStage && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
            {winStage === 'victory' && (
              <div className="text-center" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                <div className="text-6xl mb-4">⚔️</div>
                <h1 className="text-4xl text-amber-400 font-bold tracking-widest" style={{ animation: 'pulse 1s ease-in-out infinite' }}>
                  VICTORY!
                </h1>
              </div>
            )}

            {winStage === 'celebration' && (
              <div className="text-center" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                <div className="text-5xl mb-3">🎉✨🏆✨🎉</div>
                <h2 className="text-2xl text-amber-300 font-bold tracking-wider mb-2">CELEBRATION!</h2>
                <p className="text-white/40 text-xs">the realm rejoices</p>
              </div>
            )}

            {winStage === 'tries' && (
              <div className="text-center" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">total tries</p>
                <div className="text-5xl text-white font-bold">{totalTries}</div>
                <p className="text-white/30 text-xs mt-2">attempts to pull the sword</p>
              </div>
            )}

            {winStage === 'distribution' && (
              <div className="bg-black/85 backdrop-blur-lg rounded-2xl border border-amber-400/30 p-6 max-w-xs w-full mx-4" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                <p className="text-white/40 text-[10px] uppercase tracking-wider mb-3 text-center">attempt distribution</p>
                <div className="space-y-2">
                  {(() => {
                    const dist: { pulls: string; count: number; isWin: boolean }[] = [];
                    
                    Object.entries(failStats)
                      .sort(([a], [b]) => parseInt(a) - parseInt(b))
                      .forEach(([pull, count]) => {
                        dist.push({ pulls: pull, count, isWin: false });
                      });
                    
                    dist.push({ pulls: String(pullsToWin), count: 1, isWin: true });
                    
                    const maxCount = Math.max(...dist.map(d => d.count), 1);
                    
                    return dist.map((d) => (
                      <div key={d.pulls} className="flex justify-between items-center">
                        <span className={`text-sm ${d.isWin ? 'text-amber-300 font-medium' : 'text-white/60'}`}>
                          {d.pulls} pull{parseInt(d.pulls) > 1 ? 's' : ''}{d.isWin ? ' ✓' : ' loss'}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${d.isWin ? 'bg-amber-400' : 'bg-white/20'}`}
                              style={{ width: `${(d.count / maxCount) * 100}%` }}
                            />
                          </div>
                          <span className={`text-sm w-8 text-right ${d.isWin ? 'text-amber-400' : 'text-white/40'}`}>{d.count}×</span>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {winStage === 'stats' && (
              <div className="bg-black/85 backdrop-blur-lg rounded-2xl border border-amber-400/30 p-6 max-w-xs w-full mx-4" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                <p className="text-white/40 text-[10px] uppercase tracking-wider mb-3 text-center">session stats</p>
                <div className="space-y-1.5">
                  {Object.keys(failStats).length > 0 ? (
                    Object.entries(failStats)
                      .sort(([a], [b]) => parseInt(a) - parseInt(b))
                      .map(([pulls, count]) => (
                        <div key={pulls} className="flex justify-between text-xs">
                          <span className="text-white/50">{pulls} pull{parseInt(pulls) > 1 ? 's' : ''} loss</span>
                          <span className="text-amber-400/80">{count}×</span>
                        </div>
                      ))
                  ) : (
                    <p className="text-white/40 text-xs text-center">perfect — no losses!</p>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-white/5 flex justify-between text-xs">
                  <span className="text-white/40">total tries</span>
                  <span className="text-white/70">{totalTries}</span>
                </div>
                <div className="mt-2 flex justify-between text-xs">
                  <span className="text-white/40">won at</span>
                  <span className="text-amber-400">{lastWinPulls} pulls</span>
                </div>
              </div>
            )}

            {winStage === 'done' && (
              <div className="bg-black/85 backdrop-blur-lg rounded-2xl border border-amber-400/30 p-6 max-w-xs w-full mx-4" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                <div className="text-center">
                  <div className="text-3xl mb-2">⚔️</div>
                  <h2 className="text-lg text-amber-400 font-bold mb-1 tracking-wider">VICTORY</h2>
                  <p className="text-white/50 text-xs mb-4">
                    pulled in {lastWinPulls} {lastWinPulls === 1 ? 'pull' : 'pulls'} • {totalTries} tries
                  </p>
                  
                  <div className="text-left bg-white/[0.03] rounded-lg p-3 mb-4 border border-white/5">
                    <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2">stats</p>
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
                  </div>

                  <button
                    onClick={handleContinue}
                    className="px-6 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 hover:border-amber-400/70 rounded-lg text-amber-100 text-xs tracking-wider transition-all cursor-pointer"
                  >
                    CONTINUE
                  </button>
                </div>
              </div>
            )}

            {winStage && winStage !== 'done' && (
              <button
                onClick={handleSkipToStats}
                className="absolute bottom-8 right-8 text-white/20 hover:text-white/50 text-[10px] tracking-wider transition-colors cursor-pointer"
              >
                skip →
              </button>
            )}
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
              onChange={(e) => { setEditingName(e.target.value); setNameError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              placeholder="your name..."
              maxLength={20}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400/50 placeholder-white/20 mb-2 font-['Fira_Code',monospace]"
              autoFocus
            />
            {nameError && (
              <p className="text-red-400 text-[10px] mb-2">{nameError}</p>
            )}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleNameSubmit}
                disabled={!editingName.trim() || nameChecking}
                className="flex-1 px-4 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 rounded-lg text-amber-100 text-xs tracking-wider transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {nameChecking ? '...' : (playerName ? 'UPDATE' : 'ENTER')}
              </button>
              {playerName && (
                <button
                  onClick={() => { setShowNameInput(false); setNameError(''); }}
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
