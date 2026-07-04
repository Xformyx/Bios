import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, type, message, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 space-y-2" role="region" aria-label="알림">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastItem; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const icons = { success: CheckCircle, error: XCircle, info: Info };
  const styles = { success: 'toast-success', error: 'toast-error', info: 'toast-info' };
  const Icon = icons[toast.type];

  return (
    <div className={`toast ${styles[toast.type]} animate-slideUp`} role="alert" aria-live="polite">
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm font-medium flex-1">{toast.message}</span>
      <button onClick={() => onRemove(toast.id)} className="p-0.5 hover:opacity-70 transition-opacity" aria-label="닫기">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
