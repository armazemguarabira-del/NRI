import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { PauBrasilLogo } from './PauBrasilLogo';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (Component as any)<Props, State> {
  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleClearCacheAndReset = () => {
    try {
      localStorage.removeItem('nri_active_user');
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
            <div className="flex justify-center mb-4">
              <PauBrasilLogo size="lg" variant="symbol" />
            </div>

            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-black text-white mb-2">
              Recuperação do Sistema NRI
            </h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Ocorreu uma instabilidade pontual ao renderizar a interface. Clique abaixo para reiniciar a plataforma de forma segura.
            </p>

            {this.state.error && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-left text-[11px] font-mono text-red-400 mb-6 overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="space-y-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wide rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reiniciar Plataforma</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearCacheAndReset}
                className="w-full py-2 px-3 text-slate-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Restaurar Sessão Padrão
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
