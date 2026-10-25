import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../common/Modal.jsx';
import { Alert } from '../common/Alert.jsx';
import { Spinner } from '../common/Spinner.jsx';
import { paymentService } from '../../services/paymentService.js';
import {
  CreditCard,
  Smartphone,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle,
  Receipt,
  RotateCcw,
} from 'lucide-react';

const EXPIRATION_WINDOW_SECONDS = 15 * 60; // 15 minutes

export const PaymentSimulationModal = ({
  isOpen,
  onClose,
  booking,
  onPaymentComplete,
}) => {
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState('simulated_card');
  const [outcome, setOutcome] = useState('success');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [simulationResult, setSimulationResult] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(EXPIRATION_WINDOW_SECONDS);

  // Parse pure timestamp from booking creation string
  const createdAtMs = booking?.created_at ? new Date(booking.created_at).getTime() : 0;

  useEffect(() => {
    if (!isOpen || !booking || simulationResult || !createdAtMs) return;

    const updateRemaining = () => {
      const elapsed = Math.floor((Date.now() - createdAtMs) / 1000);
      setSecondsRemaining(Math.max(0, EXPIRATION_WINDOW_SECONDS - elapsed));
    };

    updateRemaining();
    const timer = setInterval(updateRemaining, 1000);

    return () => clearInterval(timer);
  }, [isOpen, booking, createdAtMs, simulationResult]);

  if (!booking) return null;

  const isExpired = secondsRemaining <= 0;
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedCountdown = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const stationName = booking.station?.name || 'Charging Station';
  const slotNumber = booking.slot?.slot_number ?? '—';
  const amountNumber = Number(booking.amount || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || isExpired) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await paymentService.simulatePayment({
        booking_id: booking.id,
        status: outcome,
        payment_method: paymentMethod,
      });

      // Backend returns HTTP 200 on success or HTTP 402 on failed simulation
      const resultData = res?.data || res;
      setSimulationResult({
        isSuccess: outcome === 'success' && res.success !== false,
        message: res.message || 'Payment simulation processed.',
        data: resultData,
      });

      // Notify parent to refresh bookings or station state
      onPaymentComplete?.({
        isSuccess: outcome === 'success',
        data: resultData,
      });
    } catch (err) {
      console.error('[SIMULATE_PAYMENT_ERROR]', err);
      setError(
        err.message ||
          'Failed to process payment simulation. Please check connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title="Simulated Payment Gateway"
      maxWidth="560px"
    >
      <div className="payment-modal-content">
        {/* Academic Simulation Watermark Banner */}
        <div className="simulation-academic-banner">
          <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Educational Demonstration Only:</strong> VoltWay is a college
            project for Cloud Architecture & Design. No real money, payment
            gateways, cards, or bank accounts are debited.
          </div>
        </div>

        {/* If Simulation Result Available: Show Confirmed or Failed Outcome */}
        {simulationResult ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            {simulationResult.isSuccess ? (
              <div>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-electric-green-subtle)',
                    color: 'var(--color-electric-green-active)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                  }}
                >
                  <CheckCircle size={32} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                  Payment Confirmed (Simulated)
                </h3>
                <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                  {simulationResult.message}
                </p>

                {/* Receipt Preview Box */}
                <div
                  style={{
                    backgroundColor: 'var(--color-bg-canvas)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    textAlign: 'left',
                    fontSize: '0.875rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    marginBottom: '1.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-muted">Transaction Reference:</span>
                    <span className="text-mono" style={{ fontWeight: 600 }}>
                      {simulationResult.data?.payment?.transaction_reference || 'SIM-TXN-CONFIRMED'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-muted">Booking Reference:</span>
                    <span className="text-mono" style={{ fontWeight: 600 }}>
                      {booking.id?.slice(0, 8)}...
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-muted">Authoritative Amount:</span>
                    <span className="text-mono" style={{ fontWeight: 700, color: 'var(--color-navy-900)' }}>
                      ₹{amountNumber.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-muted">Stored Booking Status:</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-electric-green-active)' }}>
                      confirmed
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-block"
                    onClick={onClose}
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    className="btn btn-electric btn-block"
                    onClick={() => {
                      onClose();
                      navigate(`/bookings/${booking.id}`);
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}
                  >
                    <Receipt size={16} />
                    <span>View Receipt</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-crimson-subtle)',
                    color: 'var(--color-crimson)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                  }}
                >
                  <AlertTriangle size={32} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem', color: 'var(--color-crimson)' }}>
                  Simulation Failed
                </h3>
                <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                  {simulationResult.message} The backend has marked the booking as cancelled and released the charging bay.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-block"
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Booking Summary Strip */}
            <div
              style={{
                backgroundColor: 'var(--color-bg-canvas)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.875rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.375rem',
                fontSize: '0.875rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-navy-900)' }}>
                  {stationName}
                </span>
                <span className="text-mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-navy-900)' }}>
                  ₹{amountNumber.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
                <span>Bay #{slotNumber}</span>
                <span className="text-mono">Ref: {booking.id?.slice(0, 8)}...</span>
              </div>
            </div>

            {/* 15-Minute Countdown Indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isExpired ? 'var(--color-crimson-subtle)' : 'var(--color-amber-50)',
                border: `1px solid ${isExpired ? 'var(--color-crimson)' : 'var(--color-amber-border)'}`,
                color: isExpired ? 'var(--color-crimson)' : '#92400E',
                fontSize: '0.8125rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Clock size={16} />
                <span>
                  {isExpired ? 'Reservation holding window has expired' : 'Time remaining to complete payment:'}
                </span>
              </div>
              <span className="text-mono" style={{ fontWeight: 800, fontSize: '0.9375rem' }}>
                {formattedCountdown}
              </span>
            </div>

            {isExpired && (
              <Alert type="danger" title="Expired Reservation">
                This unpaid reservation exceeded the 15-minute window. The backend will cancel it and release the charging connector.
              </Alert>
            )}

            {error && (
              <Alert type="danger" title="Simulation Error">
                {error}
              </Alert>
            )}

            {/* Payment Method Selector (Simulation Options) */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--color-text-muted)',
                  marginBottom: '0.5rem',
                }}
              >
                Simulated Payment Method
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${paymentMethod === 'simulated_card' ? 'var(--color-navy-900)' : 'var(--color-border-subtle)'}`,
                    backgroundColor: paymentMethod === 'simulated_card' ? 'var(--color-bg-muted)' : 'var(--color-bg-surface)',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="simulated_card"
                    checked={paymentMethod === 'simulated_card'}
                    onChange={() => setPaymentMethod('simulated_card')}
                    style={{ accentColor: 'var(--color-navy-900)' }}
                  />
                  <CreditCard size={18} color="var(--color-navy-900)" />
                  <div style={{ fontSize: '0.8125rem' }}>
                    <div style={{ fontWeight: 700 }}>Card Simulation</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>•••• 4242</div>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${paymentMethod === 'simulated_upi' ? 'var(--color-navy-900)' : 'var(--color-border-subtle)'}`,
                    backgroundColor: paymentMethod === 'simulated_upi' ? 'var(--color-bg-muted)' : 'var(--color-bg-surface)',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="simulated_upi"
                    checked={paymentMethod === 'simulated_upi'}
                    onChange={() => setPaymentMethod('simulated_upi')}
                    style={{ accentColor: 'var(--color-navy-900)' }}
                  />
                  <Smartphone size={18} color="var(--color-navy-900)" />
                  <div style={{ fontSize: '0.8125rem' }}>
                    <div style={{ fontWeight: 700 }}>UPI Simulation</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>driver@okaxis</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Evaluation Scenario Selector (Success vs Failure) */}
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg-muted)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--color-text-muted)',
                  marginBottom: '0.375rem',
                }}
              >
                Project Evaluation Outcome
              </label>

              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8125rem' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="simulation_outcome"
                    value="success"
                    checked={outcome === 'success'}
                    onChange={() => setOutcome('success')}
                    style={{ accentColor: 'var(--color-electric-green-active)' }}
                  />
                  <span style={{ fontWeight: outcome === 'success' ? 700 : 400 }}>
                    Success (Confirm Booking)
                  </span>
                </label>

                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="simulation_outcome"
                    value="failed"
                    checked={outcome === 'failed'}
                    onChange={() => setOutcome('failed')}
                    style={{ accentColor: 'var(--color-crimson)' }}
                  />
                  <span style={{ fontWeight: outcome === 'failed' ? 700 : 400, color: 'var(--color-crimson)' }}>
                    Failure (Release Slot)
                  </span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>

              <button
                type="submit"
                className={`btn ${outcome === 'success' ? 'btn-electric' : 'btn-danger'} btn-block`}
                disabled={isSubmitting || isExpired}
                style={{ justifyContent: 'center' }}
              >
                {isSubmitting ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Spinner size="sm" />
                    <span>Processing Simulation...</span>
                  </span>
                ) : outcome === 'success' ? (
                  <span>Simulate Payment (₹{amountNumber.toFixed(2)})</span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                    <RotateCcw size={14} />
                    <span>Simulate Failed Payment</span>
                  </span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
