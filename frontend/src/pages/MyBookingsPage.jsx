import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { bookingService } from '../services/bookingService.js';
import { PaymentSimulationModal } from '../components/payments/PaymentSimulationModal.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { Alert } from '../components/common/Alert.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import {
  CalendarCheck,
  CreditCard,
  Receipt,
  RotateCcw,
  MapPin,
  Zap,
  Clock,
  ArrowRight,
  Filter,
} from 'lucide-react';

export const MyBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());

  // Cancellation State
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState(null);

  // Simulated Payment Modal State
  const [paymentBooking, setPaymentBooking] = useState(null);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await bookingService.getMyBookings();
      if (res.success && Array.isArray(res.data)) {
        setBookings(res.data);
        setCurrentTimestamp(Date.now());
        setError(null);
      } else {
        setError(res.message || 'Failed to retrieve your reservations.');
      }
    } catch (err) {
      console.error('[FETCH_MY_BOOKINGS_ERROR]', err);
      setError(
        err.message || 'Unable to connect to the backend server to fetch reservations.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load effect with cleanup guard
  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        const res = await bookingService.getMyBookings();
        if (!ignore) {
          if (res.success && Array.isArray(res.data)) {
            setBookings(res.data);
            setError(null);
          } else {
            setError(res.message || 'Failed to retrieve your reservations.');
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error('[FETCH_MY_BOOKINGS_ERROR]', err);
          setError(
            err.message || 'Unable to connect to the backend server to fetch reservations.'
          );
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
  }, []);

  // Filter bookings according to active tab
  const filteredBookings = useMemo(() => {
    if (activeTab === 'all') return bookings;
    return bookings.filter((b) => b.status === activeTab);
  }, [bookings, activeTab]);

  // Counts for tabs
  const counts = useMemo(() => {
    const map = { all: bookings.length, pending: 0, confirmed: 0, cancelled: 0, completed: 0 };
    bookings.forEach((b) => {
      if (map[b.status] !== undefined) {
        map[b.status]++;
      }
    });
    return map;
  }, [bookings]);

  // Handle Cancellation submission
  const handleConfirmCancel = async () => {
    if (!selectedBookingForCancel || isCancelling) return;

    setIsCancelling(true);
    setCancelError(null);

    try {
      const res = await bookingService.cancelBooking(selectedBookingForCancel.id);
      if (res.success) {
        setSelectedBookingForCancel(null);
        setCancelSuccessMsg(
          'Reservation was successfully cancelled and the charging bay released back to the public pool.'
        );
        // Refresh bookings to reflect new database state
        await fetchBookings();
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

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
            <CalendarCheck size={24} color="var(--color-navy-900)" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--color-navy-900)' }}>
              My Charging Reservations
            </h1>
          </div>
          <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)', margin: 0 }}>
            Manage your EV slot bookings, execute simulated payments, and inspect vouchers.
          </p>
        </div>

        <Link
          to="/stations"
          className="btn btn-primary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <span>Find Station</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {cancelSuccessMsg && (
        <div style={{ marginBottom: '1.25rem' }}>
          <Alert type="success" title="Booking Cancelled">
            {cancelSuccessMsg}
          </Alert>
        </div>
      )}

      {/* Filter Tabs matching authentic backend statuses */}
      <div
        className="booking-tabs"
        role="tablist"
        aria-label="Filter bookings by status"
        style={{
          display: 'flex',
          overflowX: 'auto',
          gap: '0.5rem',
          borderBottom: '1px solid var(--color-border-subtle)',
          paddingBottom: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'all'}
          className={`booking-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <span>All Reservations</span>
          <span className="tab-badge">{counts.all}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'pending'}
          className={`booking-tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <span>Pending Payment</span>
          {counts.pending > 0 && <span className="tab-badge-amber">{counts.pending}</span>}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'confirmed'}
          className={`booking-tab-btn ${activeTab === 'confirmed' ? 'active' : ''}`}
          onClick={() => setActiveTab('confirmed')}
        >
          <span>Confirmed</span>
          <span className="tab-badge">{counts.confirmed}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'cancelled'}
          className={`booking-tab-btn ${activeTab === 'cancelled' ? 'active' : ''}`}
          onClick={() => setActiveTab('cancelled')}
        >
          <span>Cancelled</span>
          <span className="tab-badge">{counts.cancelled}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'completed'}
          className={`booking-tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          <span>Completed</span>
          <span className="tab-badge">{counts.completed}</span>
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
          <Spinner size="lg" label="Loading your charging reservations from backend..." />
        </div>
      ) : error ? (
        <Alert type="danger" title="Unable to Load Bookings">
          <p style={{ marginBottom: '1rem' }}>{error}</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setLoading(true);
              fetchBookings();
            }}
          >
            Retry
          </button>
        </Alert>
      ) : filteredBookings.length === 0 ? (
        /* Empty State */
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', maxWidth: '580px', margin: '2rem auto' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-bg-muted)',
              color: 'var(--color-navy-900)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}
          >
            <Filter size={24} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            {activeTab === 'all'
              ? 'No Reservations Found'
              : `No ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Reservations`}
          </h2>
          <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            {activeTab === 'all'
              ? 'You have not booked any charging slots yet. Discover stations across Bangalore to reserve your first charging bay.'
              : `You have zero reservations currently with status '${activeTab}'.`}
          </p>
          <Link
            to="/stations"
            className="btn btn-electric btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <span>Explore Bangalore Stations</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        /* Bookings List */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredBookings.map((b) => {
            const isPending = b.status === 'pending';
            const isConfirmed = b.status === 'confirmed';
            const isCancelled = b.status === 'cancelled';
            const isCompleted = b.status === 'completed';

            const startTime = new Date(b.start_time);
            const endTime = new Date(b.end_time);
            const isElapsed = endTime.getTime() <= currentTimestamp;

            const payments = b.payments || [];
            const latestPayment = payments[0] || null;

            const canCancel = !isCancelled && !isCompleted && !isElapsed;

            return (
              <article
                key={b.id}
                className="card driver-booking-card"
                style={{
                  padding: '1.25rem 1.5rem',
                  borderLeft: `5px solid ${
                    isConfirmed
                      ? 'var(--color-electric-green-active)'
                      : isPending
                      ? 'var(--color-amber-500)'
                      : isCancelled
                      ? 'var(--color-crimson)'
                      : 'var(--color-navy-900)'
                  }`,
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                  {/* Left Column: Station, Bay & Timing */}
                  <div style={{ flex: '1 1 320px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                      <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--color-navy-900)' }}>
                        {b.station?.name || 'EV Charging Station'}
                      </h2>
                      <Badge status={b.status} label={b.status.toUpperCase()} />
                      {isElapsed && !isCancelled && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                          (Window Passed)
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.75rem' }}>
                      <MapPin size={14} style={{ flexShrink: 0, color: 'var(--color-text-muted)' }} />
                      <span>{b.station?.address}</span>
                    </p>

                    {/* Meta Specs Grid */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8125rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Zap size={14} color="var(--color-electric-green-active)" />
                        <span>
                          <strong>Bay #{b.slot?.slot_number}</strong> ({b.slot?.connector_type} • {b.slot?.power_output_kw}kW)
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Clock size={14} color="var(--color-text-muted)" />
                        <span>
                          {startTime.toLocaleDateString([], { month: 'short', day: 'numeric' })},{' '}
                          {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' — '}
                          {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Amount, Payment Status & Next Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', gap: '0.75rem', textAlign: 'right' }}>
                    <div>
                      <div className="text-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-navy-900)' }}>
                        ₹{Number(b.amount).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {latestPayment ? (
                          <span>
                            Payment: <strong>{latestPayment.payment_status}</strong> ({latestPayment.payment_method?.replace('_', ' ')})
                          </span>
                        ) : isPending ? (
                          <span style={{ color: 'var(--color-amber-700)', fontWeight: 600 }}>
                            Unpaid (15m expiry)
                          </span>
                        ) : (
                          <span>No payment recorded</span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {canCancel && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setCancelError(null);
                            setSelectedBookingForCancel(b);
                          }}
                          style={{ color: 'var(--color-crimson)' }}
                        >
                          Cancel
                        </button>
                      )}

                      {isPending && (
                        <button
                          type="button"
                          className="btn btn-electric btn-sm"
                          onClick={() => setPaymentBooking(b)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
                        >
                          <CreditCard size={14} />
                          <span>Pay Now (Simulate)</span>
                        </button>
                      )}

                      <Link
                        to={`/bookings/${b.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
                      >
                        <Receipt size={14} />
                        <span>Voucher / Details</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Cancellation Confirmation Dialog */}
      {selectedBookingForCancel && (
        <Modal
          isOpen={Boolean(selectedBookingForCancel)}
          onClose={() => !isCancelling && setSelectedBookingForCancel(null)}
          title="Cancel EV Reservation"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to cancel your reservation for{' '}
              <strong>{selectedBookingForCancel.station?.name}</strong> (Bay #{selectedBookingForCancel.slot?.slot_number})?
            </p>

            <div
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-bg-muted)',
                border: '1px solid var(--color-border-subtle)',
                fontSize: '0.8125rem',
                lineHeight: 1.4,
              }}
            >
              <strong>Database Concurrency Note:</strong>
              <p style={{ marginTop: '0.25rem', color: 'var(--color-text-secondary)' }}>
                Upon confirmation, VoltWay immediately releases the GiST reservation lock on this bay, allowing other drivers in Bangalore to book it.
                {selectedBookingForCancel.status === 'confirmed' && (
                  <span style={{ display: 'block', marginTop: '0.25rem', color: 'var(--color-electric-green-active)', fontWeight: 600 }}>
                    Any simulated payment will be updated to refunded.
                  </span>
                )}
              </p>
            </div>

            {cancelError && (
              <Alert type="danger" title="Cancellation Error">
                {cancelError}
              </Alert>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedBookingForCancel(null)}
                disabled={isCancelling}
              >
                Keep Booking
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
              >
                {isCancelling ? <Spinner size="sm" /> : <RotateCcw size={14} />}
                <span>{isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Payment Simulation Modal */}
      {paymentBooking && (
        <PaymentSimulationModal
          isOpen={Boolean(paymentBooking)}
          onClose={() => setPaymentBooking(null)}
          booking={paymentBooking}
          onPaymentComplete={() => {
            fetchBookings();
          }}
        />
      )}
    </div>
  );
};
