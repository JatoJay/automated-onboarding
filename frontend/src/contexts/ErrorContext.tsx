import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

type ErrorType = 'error' | 'success' | 'warning' | 'info';

interface ErrorState {
  type: ErrorType;
  title: string;
  message: string;
}

interface ConfirmState {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
}

interface ErrorContextValue {
  showError: (message: string, title?: string) => void;
  showSuccess: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  showConfirm: (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'default';
  }) => Promise<boolean>;
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

const confirmVariants = {
  danger: { button: 'bg-red-600 hover:bg-red-700', icon: 'text-red-600' },
  warning: { button: 'bg-amber-600 hover:bg-amber-700', icon: 'text-amber-600' },
  default: { button: 'bg-blue-600 hover:bg-blue-700', icon: 'text-blue-600' },
};

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<ErrorState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const show = useCallback((type: ErrorType, message: string, title?: string) => {
    setError({ type, title: title || defaultTitles[type], message });
  }, []);

  const showError = useCallback((message: string, title?: string) => show('error', message, title), [show]);
  const showSuccess = useCallback((message: string, title?: string) => show('success', message, title), [show]);
  const showWarning = useCallback((message: string, title?: string) => show('warning', message, title), [show]);
  const showInfo = useCallback((message: string, title?: string) => show('info', message, title), [show]);
  const clearError = useCallback(() => setError(null), []);

  const showConfirm = useCallback((options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'default';
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setConfirm(options);
    });
  }, []);

  const handleConfirm = useCallback((result: boolean) => {
    if (resolveRef.current) {
      resolveRef.current(result);
      resolveRef.current = null;
    }
    setConfirm(null);
  }, []);

  const variant = confirm?.variant || 'default';

  return (
    <ErrorContext.Provider value={{ showError, showSuccess, showWarning, showInfo, showConfirm, clearError }}>
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
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="relative w-full max-w-md mx-4 p-6 rounded-lg shadow-xl border bg-white border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <AlertTriangle className={`h-6 w-6 flex-shrink-0 ${confirmVariants[variant].icon}`} />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-gray-900">
                  {confirm.title}
                </h3>
                <p className="mt-2 text-gray-600">{confirm.message}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => handleConfirm(false)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                {confirm.cancelText || 'Cancel'}
              </button>
              <button
                onClick={() => handleConfirm(true)}
                className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors ${confirmVariants[variant].button}`}
              >
                {confirm.confirmText || 'Confirm'}
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
