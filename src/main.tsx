import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Global error handlers
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

function hideLoading() {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.add('hidden');
    setTimeout(() => {
      if (loading.parentNode) {
        loading.parentNode.removeChild(loading);
      }
    }, 300);
  }
}

function showError(message: string) {
  console.error('App error:', message);
  const loading = document.getElementById('loading');
  if (loading) {
    loading.innerHTML = `
      <div style="text-align:center;padding:2rem;">
        <div style="font-size:3rem;margin-bottom:1rem;">⚠️</div>
        <div style="color:#ffd700;font-size:1.2rem;margin-bottom:1rem;">Error</div>
        <div style="color:rgba(255,255,255,0.5);font-size:0.875rem;margin-bottom:1.5rem;">${message}</div>
        <button onclick="window.location.reload()" style="padding:0.75rem 2rem;background:rgba(255,215,0,0.2);border:1px solid rgba(255,215,0,0.5);border-radius:0.5rem;color:#ffd700;cursor:pointer;font-family:inherit;font-size:0.875rem;">Reload</button>
      </div>
    `;
  }
}

// Initialize the app
try {
  const rootElement = document.getElementById("root");
  
  if (!rootElement) {
    showError('Root element not found');
  } else {
    const root = ReactDOM.createRoot(rootElement);
    
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    console.log('React app initialized successfully');
  }
} catch (error) {
  console.error('Failed to initialize React:', error);
  showError(error instanceof Error ? error.message : 'Failed to initialize app');
}
