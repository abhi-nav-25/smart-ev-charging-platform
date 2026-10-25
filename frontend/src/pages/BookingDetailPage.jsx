import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { bookingService } from '../services/bookingService.js';
import { PaymentSimulationModal } from '../components/payments/PaymentSimulationModal.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { Alert } from '../components/common/Alert.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import {
  ArrowLeft,
  Printer,
  CreditCard,
  MapPin,
  Zap,
  Clock,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const BookingDetailPage = () => {
  const { id } = useParams();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nowMs] = useState(() => Date.now());

  // Cancellation State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState(null);

  // Payment Simulation Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const isValidId = Boolean(id && UUID_REGEX.test(id));

  const fetchBooking = useCallback(async () => {
    if (!isValidId) return;

    try {
      const res = await bookingService.getBookingById(id);
      if (res.success && res.data) {
        setBooking(res.data);
        setError(null);
      } else {
        setError(res.message || 'Reservation not found.');
      }
    } catch (err) {
      console.error('[BOOKING_DETAIL_ERROR]', err);
      setError(err.message || 'Failed to load reservation details.');
    } finally {
      setLoading(false);
    }
  }, [id, isValidId]);

  useEffect(() => {
    if (!isValidId) return;

    let ignore = false;

    const load = async () => {
      try {
        const res = await bookingService.getBookingById(id);
        if (!ignore) {
          if (res.success && res.data) {
            setBooking(res.data);
            setError(null);
          } else {
            setError(res.message || 'Reservation not found.');
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error('[BOOKING_DETAIL_ERROR]', err);
          setError(err.message || 'Failed to load reservation details.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, [id, isValidId]);

  // Handle cancellation request
  const handleCancelBooking = async () => {
    if (isCancelling || !booking) return;

    setIsCancelling(true);
    setCancelError(null);

    try {
      const res = await bookingService.cancelBooking(booking.id);
      if (res.success && res.data) {
        setBooking(res.data);
        setIsCancelModalOpen(false);
        setCancelSuccessMsg(
          'Reservation was successfully cancelled and the physical charging slot released.'
        );
        // Re-fetch to synchronize nested payments state
        fetchBooking();
      } else {
        setCancelError(res.message || 'Failed to cancel reservation.');
      }
    } catch (err) {
      console.error('[CANCEL_BOOKING_ERROR]', err);
      setCancelError(err.message || 'Failed to cancel reservation.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isValidId) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', maxWidth: '640px' }}>
        <Alert type="danger" title="Invalid Booking Reference">
          <p style={{ marginBottom: '1rem' }}>
            The booking identifier provided in the URL is not a valid UUID format.
          </p>
          <Link to="/bookings/my" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
            <ArrowLeft size={14} />
            Back to My Reservations
          </Link>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spinner size="lg" label="Loading reservation voucher and payment details..." />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', maxWidth: '640px' }}>
        <Alert type="danger" title="Reservation Not Found">
          <p style={{ marginBottom: '1rem' }}>{error || 'Unable to load booking details.'}</p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setLoading(true);
                fetchBooking();
              }}
            >
              Retry
            </button>
            <Link to="/bookings/my" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
              <ArrowLeft size={14} />
              Return to Reservations
            </Link>
          </div>
        </Alert>
      </div>
    );
  }

  const isPending = booking.status === 'pending';
  const isConfirmed = booking.status === 'confirmed';
  const isCancelled = booking.status === 'cancelled';
  const isCompleted = booking.status === 'completed';

  const isWindowElapsed = new Date(booking.end_time).getTime() <= nowMs;
  const canCancel = !isCancelled && !isCompleted && !isWindowElapsed;

  const payments = booking.payments || [];
  const latestPayment = payments[0] || null;

  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '4rem', maxWidth: '840px' }}>
      {/* Non-Printable Top Navigation & Actions Bar */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <Link
          to="/bookings/my"
          className="btn btn-ghost btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', paddingLeft: 0 }}
        >
          <ArrowLeft size={16} />
          <span>Back to My Reservations</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {canCancel && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setIsCancelModalOpen(true)}
              style={{ color: 'var(--color-crimson)', borderColor: 'var(--color-crimson)' }}
            >
              Cancel Reservation
            </button>
          )}

          {isPending && (
            <button
              type="button"
              className="btn btn-electric btn-sm"
              onClick={() => setIsPaymentModalOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
            >
              <CreditCard size={14} />
              <span>Simulate Payment</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handlePrint}
            title="Print or save as PDF"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <Printer size={14} />
            <span>Print Voucher</span>
          </button>
        </div>
      </div>

      {cancelSuccessMsg && (
        <div className="no-print" style={{ marginBottom: '1.25rem' }}>
          <Alert type="success" title="Cancelled">
            {cancelSuccessMsg}
          </Alert>
        </div>
      )}

      {/* Printable Receipt Paper Container */}
      <div className="receipt-paper card" style={{ padding: '2.5rem', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-md)' }}>
        {/* Receipt Header */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '1rem',
            paddingBottom: '1.5rem',
            borderBottom: '2px solid var(--color-navy-900)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--color-navy-900)',
                  color: 'var(--color-electric-green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Zap size={18} />
              </div>
              <span style={{ fontSize: '1.35rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--color-navy-900)' }}>
                Volt<span style={{ color: 'var(--color-electric-green)' }}>Way</span>
              </span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
              Cloud-Based Smart EV Charging & Reservation Platform
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-navy-900)' }}>
              Simulated Payment Receipt
            </h1>
            <div className="text-mono" style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              Ref: {booking.id}
            </div>
            <div style={{ marginTop: '6px' }}>
              <Badge status={booking.status} label={booking.status.toUpperCase()} />
            </div>
          </div>
        </div>

        {/* Academic Simulation Watermark Banner */}
        <div
          style={{
            margin: '1.5rem 0',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-bg-muted)',
            border: '1px dashed var(--color-border-strong)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            fontSize: '0.8125rem',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.4,
          }}
        >
          <ShieldCheck size={16} color="var(--color-navy-900)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>SIMULATED ACADEMIC RECEIPT:</strong> This document represents an educational
            simulation for Cloud Architecture & Design. No real funds, debit cards, or bank
            accounts were charged.
          </div>
        </div>

        {/* 2-Column Receipt Details Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
            paddingBottom: '1.5rem',
            borderBottom: '1px solid var(--color-border-subtle)',
          }}
        >
          {/* Station & Bay Location Details */}
          <div>
            <h2 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
              Station & Physical Bay
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem' }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--color-navy-900)' }}>
                  {booking.station?.name || 'VoltWay Hub'}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '2px' }}>
                  <MapPin size={12} style={{ flexShrink: 0 }} />
                  <span>{booking.station?.address}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: 'var(--color-bg-canvas)', borderRadius: 'var(--radius-sm)' }}>
                <span className="text-muted">Connector Bay:</span>
                <span style={{ fontWeight: 700 }}>
                  Bay #{booking.slot?.slot_number} ({booking.slot?.connector_type})
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: 'var(--color-bg-canvas)', borderRadius: 'var(--radius-sm)' }}>
                <span className="text-muted">Power Rating:</span>
                <span style={{ fontWeight: 700 }}>
                  {booking.slot?.power_output_kw} kW
                </span>
              </div>
            </div>
          </div>

          {/* Time & Schedule Details */}
          <div>
            <h2 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
              Reservation Window
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: 'var(--color-bg-canvas)', borderRadius: 'var(--radius-sm)' }}>
                <span className="text-muted">Booking Date:</span>
                <span style={{ fontWeight: 600 }}>{booking.booking_date}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: 'var(--color-bg-canvas)', borderRadius: 'var(--radius-sm)' }}>
                <span className="text-muted">Start Time:</span>
                <span className="text-mono" style={{ fontWeight: 600 }}>
                  {new Date(booking.start_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: 'var(--color-bg-canvas)', borderRadius: 'var(--radius-sm)' }}>
                <span className="text-muted">End Time:</span>
                <span className="text-mono" style={{ fontWeight: 600 }}>
                  {new Date(booking.end_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>

              {isWindowElapsed && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>
                  (Reservation time window has elapsed)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Financial / Cost Breakdown Table */}
        <div style={{ padding: '1.5rem 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            Cost Breakdown
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
              <span>Base Energy Tariff</span>
              <span className="text-mono">₹{Number(booking.station?.price_per_kwh || 0).toFixed(2)} / kWh</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
              <span>Authoritative Pricing Formula</span>
              <span className="text-mono">durationHours × 25 kWh × tariff</span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                paddingTop: '0.75rem',
                marginTop: '0.5rem',
                borderTop: '2px solid var(--color-navy-900)',
              }}
            >
              <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-navy-900)' }}>
                Authoritative Amount Due
              </span>
              <span className="text-mono" style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-navy-900)' }}>
                ₹{Number(booking.amount).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Transaction Details Section */}
        <div style={{ paddingTop: '1.5rem' }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
            Simulated Payment Record
          </h2>

          {latestPayment ? (
            <div
              style={{
                backgroundColor: 'var(--color-bg-canvas)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontSize: '0.875rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted">Transaction Reference:</span>
                <span className="text-mono" style={{ fontWeight: 700 }}>
                  {latestPayment.transaction_reference}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted">Payment Status:</span>
                <Badge status={latestPayment.payment_status} label={latestPayment.payment_status.toUpperCase()} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted">Payment Method:</span>
                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                  {latestPayment.payment_method?.replace('_', ' ')}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted">Recorded Timestamp:</span>
                <span className="text-mono" style={{ fontSize: '0.8125rem' }}>
                  {new Date(latestPayment.created_at).toLocaleString()}
                </span>
              </div>

              {latestPayment.payment_status === 'refunded' && (
                <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: 'var(--color-amber-50)', border: '1px solid var(--color-amber-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', color: '#92400E' }}>
                  <strong>Simulated Refund Confirmed:</strong> Because this reservation was cancelled, the simulated payment was recorded as refunded.
                </div>
              )}
            </div>
          ) : isPending ? (
            <div
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-amber-50)',
                border: '1px solid var(--color-amber-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={18} color="var(--color-amber-600)" />
                <span style={{ fontSize: '0.875rem', color: '#92400E', fontWeight: 600 }}>
                  Payment Pending: Unpaid reservations auto-expire after 15 minutes.
                </span>
              </div>

              <button
                type="button"
                className="btn btn-electric btn-sm no-print"
                onClick={() => setIsPaymentModalOpen(true)}
              >
                Simulate Payment Now
              </button>
            </div>
          ) : (
            <p className="text-muted" style={{ fontSize: '0.875rem' }}>
              No simulated payment records found for this reservation.
            </p>
          )}
        </div>
      </div>

      {/* Cancellation Confirmation Dialog */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => !isCancelling && setIsCancelModalOpen(false)}
        title="Confirm Reservation Cancellation"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            Are you sure you want to cancel your reservation at{' '}
            <strong>{booking.station?.name}</strong> (Bay #{booking.slot?.slot_number})?
          </p>

          <div
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-bg-muted)',
              border: '1px solid var(--color-border-subtle)',
              fontSize: '0.8125rem',
            }}
          >
            <strong>PostgreSQL GiST Constraint Release:</strong>
            <p style={{ marginTop: '0.25rem', color: 'var(--color-text-secondary)' }}>
              Cancelling immediately frees the physical connector bay for other drivers in the Bangalore charging network.
              {isConfirmed && ' Your simulated payment will be marked as refunded in the database.'}
            </p>
          </div>

          {cancelError && (
            <Alert type="danger" title="Cancellation Failed">
              {cancelError}
            </Alert>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsCancelModalOpen(false)}
              disabled={isCancelling}
            >
              Keep Reservation
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleCancelBooking}
              disabled={isCancelling}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
            >
              {isCancelling ? <Spinner size="sm" /> : <RotateCcw size={14} />}
              <span>{isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Simulated Payment Modal */}
      {isPaymentModalOpen && (
        <PaymentSimulationModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          booking={booking}
          onPaymentComplete={() => {
            fetchBooking();
          }}
        />
      )}
    </div>
  );
};
