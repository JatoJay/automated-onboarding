import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

type ErrorType = 'error' | 'success' | 'warning' | 'info';

interface ErrorState {
  type: ErrorType;
  title: string;
  message: string;
}

interface ErrorContextValue {
  showError: (message: string, title?: string) => void;
  showSuccess: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  clearError: () => void;
}

const ErrorContext = createContext<ErrorContextValue | null>(null);

const icons = {
  error: AlertCircle,
  success: CheckCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  error: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', title: 'text-red-800' },
  success: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', title: 'text-green-800' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', title: 'text-amber-800' },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', title: 'text-blue-800' },
};

const defaultTitles = {
  error: 'Error',
  success: 'Success',
  warning: 'Warning',
  info: 'Information',
};

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<ErrorState | null>(null);

  const show = useCallback((type: ErrorType, message: string, title?: string) => {
    setError({ type, title: title || defaultTitles[type], message });
  }, []);

  const showError = useCallback((message: string, title?: string) => show('error', message, title), [show]);
  const showSuccess = useCallback((message: string, title?: string) => show('success', message, title), [show]);
  const showWarning = useCallback((message: string, title?: string) => show('warning', message, title), [show]);
  const showInfo = useCallback((message: string, title?: string) => show('info', message, title), [show]);
  const clearError = useCallback(() => setError(null), []);

  return (
    <ErrorContext.Provider value={{ showError, showSuccess, showWarning, showInfo, clearError }}>
      {children}
      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={clearError}>
          <div
            className={`relative w-full max-w-md mx-4 p-6 rounded-lg shadow-xl border ${colors[error.type].bg} ${colors[error.type].border}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={clearError}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-black/10 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
            <div className="flex items-start gap-4">
              {(() => {
                const Icon = icons[error.type];
                return <Icon className={`h-6 w-6 flex-shrink-0 ${colors[error.type].icon}`} />;
              })()}
              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold text-lg ${colors[error.type].title}`}>
                  {error.title}
                </h3>
                <p className="mt-2 text-gray-700">{error.message}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={clearError}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </ErrorContext.Provider>
  );
}

export function useError() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}
