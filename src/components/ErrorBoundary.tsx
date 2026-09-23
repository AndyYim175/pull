import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Hide loading screen on error
      const loading = document.getElementById('loading');
      if (loading) {
        loading.innerHTML = `
          <div style="text-align:center;padding:2rem;">
            <div style="font-size:3rem;margin-bottom:1rem;">⚠️</div>
            <div style="color:#ffd700;font-size:1.2rem;margin-bottom:1rem;">Error</div>
            <div style="color:rgba(255,255,255,0.5);font-size:0.875rem;margin-bottom:1.5rem;">${this.state.error?.message || 'Something went wrong'}</div>
            <button onclick="window.location.reload()" style="padding:0.75rem 2rem;background:rgba(255,215,0,0.2);border:1px solid rgba(255,215,0,0.5);border-radius:0.5rem;color:#ffd700;cursor:pointer;font-family:inherit;font-size:0.875rem;">Reload</button>
          </div>
        `;
        loading.classList.remove('hidden');
      }
      
      return this.props.fallback || null;
    }

    return this.props.children;
  }
}
