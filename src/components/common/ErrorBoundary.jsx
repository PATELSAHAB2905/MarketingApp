import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Crash caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
          <div className="bg-slate-800 border border-slate-700 max-w-md w-full p-6 rounded-3xl text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 bg-red-900/50 border border-red-500/30 text-red-400 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-black text-amber-300">PATEL SAHAB SPICES</h2>
              <p className="text-sm font-bold text-slate-200 mt-1">Application Recovery</p>
              <p className="text-xs text-slate-400 mt-2">
                A rendering issue occurred. You can reload or reset your local storage cache.
              </p>
              {this.state.error && (
                <p className="text-[11px] font-mono text-red-300 bg-black/40 p-2 rounded-xl mt-3 text-left overflow-x-auto">
                  {this.state.error.toString()}
                </p>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 py-3 bg-red-700 hover:bg-red-600 text-white font-black text-xs rounded-xl transition-all"
              >
                Clear Cache & Reset
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
