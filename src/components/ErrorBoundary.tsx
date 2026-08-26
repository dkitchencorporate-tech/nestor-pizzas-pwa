import React, { Component, ErrorInfo, ReactNode } from 'react';

// Note: ErrorBoundary can't use zustand hooks directly, so we'll read from localStorage manually
// or fallback to Spanish
const getTranslation = (key: string) => {
  try {
    const store = localStorage.getItem('nestor-i18n');
    if (store) {
      const parsed = JSON.parse(store);
      const lang = parsed.state?.lang || 'es';
      if (lang === 'en') {
        if (key === 'error_title') return 'Oops! Something went wrong.';
        if (key === 'error_desc') return 'Our ovens had a small technical failure. Please, reload the page to return to normal.';
        if (key === 'reload_page') return 'Reload Page';
      }
    }
  } catch(e) {}
  if (key === 'error_title') return '¡Ups! Algo salió mal.';
  if (key === 'error_desc') return 'Nuestros hornos han tenido un pequeño fallo técnico. Por favor, recarga la página para volver a la normalidad.';
  if (key === 'reload_page') return 'Recargar Página';
  return key;
};

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    // Here you could also log the error to an error reporting service like Sentry
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0A0E] flex flex-col items-center justify-center p-4 text-white">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-3xl font-black mb-2">{getTranslation('error_title')}</h1>
          <p className="text-zinc-400 text-center max-w-md mb-8">
            {getTranslation('error_desc')}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl transition-all"
          >
            {getTranslation('reload_page')}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
