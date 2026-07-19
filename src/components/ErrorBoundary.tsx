import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertOctagon, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error inside React tree:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-xl text-center space-y-6">
            <div className="mx-auto w-14 h-14 bg-red-50 border border-red-100 rounded-full flex items-center justify-center text-red-500 shadow-xs">
              <AlertOctagon className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="font-extrabold text-slate-900 text-lg tracking-tight">Something Went Wrong</h2>
              <p className="text-slate-500 text-xs leading-relaxed">
                An unexpected interface rendering error occurred. The system has isolated this session log for safety.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left text-[11px] font-mono text-slate-600 max-h-36 overflow-auto">
                <span className="font-extrabold text-slate-800 block mb-1">Diagnostic Detail:</span>
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <RefreshCw className="w-4 h-4" /> Reload Portal Interface
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
