interface FallbackSceneProps {
  pullProgress: number;
}

export function FallbackScene({ pullProgress }: FallbackSceneProps) {
  const swordOffset = pullProgress * 100;
  
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#0a1a0a] via-[#0a0f0a] to-[#050805]">
      {/* Stars */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 bg-white/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 60}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Ground */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[#1a3a1a] to-transparent" />

      {/* Trees silhouettes */}
      <div className="absolute bottom-1/4 left-10 w-16 h-32 opacity-20">
        <div className="w-full h-full bg-[#0a2a0a] clip-triangle" />
      </div>
      <div className="absolute bottom-1/4 right-20 w-20 h-40 opacity-15">
        <div className="w-full h-full bg-[#0a2a0a] clip-triangle" />
      </div>

      {/* Sword and Stone */}
      <div className="relative">
        {/* Stone */}
        <div className="w-32 h-24 bg-gradient-to-b from-[#5a5a5a] to-[#3a3a3a] rounded-t-lg relative shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-t-lg" />
          {/* Sword slot */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-16 bg-black/80 rounded" />
        </div>

        {/* Sword */}
        <div
          className="absolute left-1/2 -translate-x-1/2 transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-50%) translateY(-${swordOffset}px)` }}
        >
          {/* Blade */}
          <div className="w-2 h-48 bg-gradient-to-b from-[#e8e8e8] to-[#c0c0c0] mx-auto shadow-lg relative">
            <div className="absolute inset-y-0 left-1/2 w-px bg-white/50" />
            {/* Blade tip */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[12px] border-b-[#d4d4d4]" />
          </div>
          {/* Guard */}
          <div className="w-12 h-2 bg-gradient-to-r from-[#daa520] via-[#ffd700] to-[#daa520] mx-auto shadow-md" />
          {/* Grip */}
          <div className="w-2 h-12 bg-[#3d1f00] mx-auto" />
          {/* Pommel */}
          <div className="w-4 h-4 bg-[#daa520] rounded-full mx-auto shadow-md" />
        </div>

        {/* Glow effect */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full blur-3xl transition-opacity duration-500"
          style={{
            background: 'radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)',
            opacity: pullProgress,
          }}
        />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-amber-400/40 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
