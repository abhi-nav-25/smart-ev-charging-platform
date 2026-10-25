export const Badge = ({
  status = 'neutral',
  label,
  showDot = true,
  className = '',
}) => {
  const normalized = String(status).toLowerCase();

  // Map database status to badge styling variant
  const variantMap = {
    available: 'available',
    occupied: 'occupied',
    maintenance: 'maintenance',
    inactive: 'occupied',
    active: 'available',
    pending: 'pending',
    confirmed: 'success',
    success: 'success',
    failed: 'danger',
    cancelled: 'cancelled',
    refunded: 'warning',
    completed: 'neutral',
    admin: 'admin',
    user: 'neutral',
  };

  const variant = variantMap[normalized] || 'neutral';
  const displayLabel = label || normalized.replace('_', ' ');

  return (
    <span className={`badge badge-${variant} ${className}`}>
      {showDot && <span className="badge-dot" />}
      <span>{displayLabel}</span>
    </span>
  );
};
