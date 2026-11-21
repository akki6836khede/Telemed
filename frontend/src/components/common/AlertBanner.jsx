import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export const AlertBanner = ({ type = 'error', message, onClose }) => {
  if (!message) return null;

  const styles = {
    error: 'bg-red-50 border-red-200 text-red-800 icon-red-500',
    success: 'bg-green-50 border-green-200 text-green-800 icon-green-500',
    warning: 'bg-amber-50 border-amber-200 text-amber-800 icon-amber-500',
    info: 'bg-blue-50 border-blue-200 text-blue-800 icon-blue-500'
  };

  const icons = {
    error: <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />,
    success: <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
  };

  return (
    <div className={`flex items-start gap-3 p-4 border rounded-lg text-sm mb-4 ${styles[type]}`}>
      {icons[type]}
      <div className="flex-1 font-medium">{message}</div>
      {onClose && (
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
