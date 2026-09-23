// Anti-cheat module
// Prevents console manipulation and state tampering

// Hide sensitive functions from global scope
const _internal = (() => {
  // Private state
  let gameValidated = true;
  let lastActionTime = Date.now();
  let actionCount = 0;
  
  // Rate limiting
  const MIN_ACTION_INTERVAL = 100; // ms
  
  return {
    validateAction: (): boolean => {
      const now = Date.now();
      const timeSinceLastAction = now - lastActionTime;
      
      // Rate limit check
      if (timeSinceLastAction < MIN_ACTION_INTERVAL) {
        console.warn('⚠️ Action too fast - possible automation');
        return false;
      }
      
      lastActionTime = now;
      actionCount++;
      
      // Suspicious activity detection
      if (actionCount > 100 && timeSinceLastAction < 1000) {
        console.warn('⚠️ Suspicious activity detected');
        return false;
      }
      
      return true;
    },
    
    validatePullResult: (pullIndex: number, pullsToWin: number): boolean => {
      // Validate pull index is within bounds
      if (pullIndex < 0 || pullIndex >= pullsToWin) {
        console.warn('⚠️ Invalid pull index');
        return false;
      }
      
      return true;
    },
    
    validateWinCondition: (pullsToWin: number, currentPull: number): boolean => {
      // Can only win if we've completed all pulls
      if (currentPull !== pullsToWin) {
        console.warn('⚠️ Invalid win condition');
        return false;
      }
      
      return true;
    },
    
    resetCounters: () => {
      actionCount = 0;
      lastActionTime = Date.now();
    }
  };
})();

// Freeze the internal object to prevent tampering
Object.freeze(_internal);

export const AntiCheat = {
  validateAction: _internal.validateAction,
  validatePullResult: _internal.validatePullResult,
  validateWinCondition: _internal.validateWinCondition,
  resetCounters: _internal.resetCounters
};

// Freeze the exported object
Object.freeze(AntiCheat);

// Remove access to sensitive globals
if (typeof window !== 'undefined') {
  // Prevent access to React internals
  const originalConsole = window.console;
  
  // Optional: Warn if someone tries to access game state
  Object.defineProperty(window, '__GAME_STATE__', {
    get: () => {
      console.warn('⚠️ Game state is protected');
      return null;
    },
    configurable: false
  });
}
