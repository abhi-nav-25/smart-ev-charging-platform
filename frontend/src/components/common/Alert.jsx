import { Info, CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';

export const Alert = ({
  children,
  type = 'info', // 'info' | 'success' | 'warning' | 'danger'
  title,
  onClose,
  className = '',
}) => {
  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    danger: XCircle,
  };

  const IconComponent = icons[type] || Info;

  return (
    <div className={`alert alert-${type} ${className}`} role="alert">
      <span className="alert-icon">
        <IconComponent size={20} />
      </span>
      <div style={{ flex: 1 }}>
        {title && <strong style={{ display: 'block', marginBottom: '0.25rem' }}>{title}</strong>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            opacity: 0.7,
            padding: '2px',
          }}
          aria-label="Dismiss alert"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
