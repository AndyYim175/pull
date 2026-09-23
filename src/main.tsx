import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

// Hide loading screen
function hideLoading() {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.add('hidden');
    setTimeout(() => loading.remove(), 300);
  }
}

// Try to render the app
try {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error('Root element not found');
  }
  
  ReactDOM.createRoot(root).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
  
  // Hide loading screen after React mounts
  setTimeout(hideLoading, 100);
} catch (error) {
  console.error('Failed to initialize app:', error);
  hideLoading();
  
  // Show error message
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0f0a;color:#ffd700;font-family:'Fira Code',monospace;text-align:center;padding:2rem;">
        <div>
          <div style="font-size:3rem;margin-bottom:1rem;">⚠️</div>
          <h2 style="margin:0 0 1rem 0;">Failed to load</h2>
          <p style="color:rgba(255,255,255,0.5);font-size:0.875rem;margin:0 0 1rem 0;">${error instanceof Error ? error.message : 'Unknown error'}</p>
          <button onclick="window.location.reload()" style="padding:0.5rem 1.5rem;background:rgba(255,215,0,0.2);border:1px solid rgba(255,215,0,0.5);border-radius:0.5rem;color:#ffd700;cursor:pointer;font-family:inherit;">Reload</button>
        </div>
      </div>
    `;
  }
}
