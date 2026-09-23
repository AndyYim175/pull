import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  showError(event.error?.message || 'Unknown error');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  showError(event.reason?.message || 'Unknown error');
});

function showError(message: string) {
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

function hideLoading() {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.add('hidden');
    setTimeout(() => loading.remove(), 300);
  }
}

// Initialize the app
const rootElement = document.getElementById("root");

if (!rootElement) {
  showError('Root element not found');
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    
    root.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
    
    // Don't hide loading screen here - let the App component do it when ready
    console.log('React app initialized');
  } catch (error) {
    console.error('Failed to initialize React:', error);
    showError(error instanceof Error ? error.message : 'Failed to initialize app');
  }
}
