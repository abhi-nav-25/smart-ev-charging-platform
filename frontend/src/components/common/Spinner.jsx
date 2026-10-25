export const Spinner = ({
  size = 'md', // 'sm' | 'md' | 'lg'
  variant = 'electric', // 'light' | 'dark' | 'electric'
  label,
  className = '',
}) => {
  const sizeMap = {
    sm: { width: '16px', height: '16px' },
    md: { width: '24px', height: '24px' },
    lg: { width: '36px', height: '36px' },
  };

  const spinnerStyle = sizeMap[size] || sizeMap.md;

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
      }}
      className={className}
    >
      <span
        className={`spinner ${variant === 'dark' ? 'spinner-dark' : variant === 'electric' ? 'spinner-electric' : ''}`}
        style={spinnerStyle}
        aria-hidden="true"
      />
      {label && <span className="text-secondary" style={{ fontSize: '0.875rem' }}>{label}</span>}
      <span className="sr-only">Loading...</span>
    </div>
  );
};
