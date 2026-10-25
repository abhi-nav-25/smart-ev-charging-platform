import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { stationService } from '../services/stationService.js';
import { SlotSelector } from '../components/stations/SlotSelector.jsx';
import { ReservationForm } from '../components/bookings/ReservationForm.jsx';
import { PaymentSimulationModal } from '../components/payments/PaymentSimulationModal.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { Alert } from '../components/common/Alert.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import {
  ArrowLeft,
  MapPin,
  Zap,
  RotateCw,
  CheckCircle,
  Clock,
  CalendarCheck,
  CreditCard,
  AlertCircle
} from 'lucide-react';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const StationDetailPage = () => {
  const { id } = useParams();

  const [station, setStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshingSlots, setIsRefreshingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Success State Modal
  const [createdBooking, setCreatedBooking] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Validate ID format upfront
  const isValidId = Boolean(id && UUID_REGEX.test(id));

  // User-invoked or event-driven station refresh (retry, refresh button, booking completion)
  const refreshStation = useCallback(async (isRefresh = false) => {
    if (!isValidId) return;

    if (isRefresh) {
      setIsRefreshingSlots(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await stationService.getStationById(id);
      if (res.success && res.data) {
        setStation(res.data);

        // Keep selected slot in sync or reset if it is no longer available
        setSelectedSlot((prevSelected) => {
          if (!prevSelected) return null;
          const freshSlot = res.data.charging_slots?.find((s) => s.id === prevSelected.id);
          if (!freshSlot || freshSlot.is_currently_occupied || freshSlot.status !== 'available') {
            return null; // Slot became occupied or unavailable
          }
          return freshSlot;
        });
      } else {
        setError(res.message || 'Station not found.');
      }
    } catch (err) {
      console.error('[STATION_DETAIL_ERROR]', err);
      setError(err.message || 'Failed to load charging station details.');
    } finally {
      setLoading(false);
      setIsRefreshingSlots(false);
    }
  }, [id, isValidId]);

  // Initial load effect with cleanup flag (no synchronous setState in effect body)
  useEffect(() => {
    if (!isValidId) return;

    let ignore = false;

    const loadInitialStation = async () => {
      try {
        const res = await stationService.getStationById(id);
        if (!ignore) {
          if (res.success && res.data) {
            setStation(res.data);
            setError(null);
          } else {
            setError(res.message || 'Station not found.');
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error('[STATION_DETAIL_ERROR]', err);
          setError(err.message || 'Failed to load charging station details.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadInitialStation();

    return () => {
      ignore = true;
    };
  }, [id, isValidId]);

  // Handle successful reservation creation
  const handleBookingSuccess = (bookingData) => {
    setCreatedBooking(bookingData);
    // Refresh station slots to reflect the new reservation state
    refreshStation(true);
  };

  // Invalid ID format state
  if (!isValidId) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', maxWidth: '640px' }}>
        <Alert type="danger" title="Invalid Station ID">
          <p style={{ marginBottom: '1rem' }}>
            The requested station identifier is not a valid UUID format.
          </p>
          <Link to="/stations" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
            <ArrowLeft size={14} />
            Back to Station Discovery
          </Link>
        </Alert>
      </div>
    );
  }

  // Loading State
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spinner size="lg" label="Loading station specifications and real-time slots..." />
      </div>
    );
  }

  // Error State / Not Found
  if (error || !station) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', maxWidth: '640px' }}>
        <Alert type="danger" title="Station Unavailable">
          <p style={{ marginBottom: '1rem' }}>{error || 'Unable to load charging station.'}</p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => refreshStation(false)}
            >
              Retry
            </button>
            <Link to="/stations" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
              <ArrowLeft size={14} />
              Return to Stations
            </Link>
          </div>
        </Alert>
      </div>
    );
  }

  const isMaintenance = station.status === 'maintenance';
  const slots = station.charging_slots || [];
  const availableCount = station.available_slots;

  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '4rem' }}>
      {/* Navigation Breadcrumb */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link
          to="/stations"
          className="btn btn-ghost btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', paddingLeft: 0 }}
        >
          <ArrowLeft size={16} />
          <span>Back to Bangalore Hubs</span>
        </Link>
      </div>

      {/* Station Overview Banner */}
      <div
        className="card"
        style={{
          borderLeft: '5px solid var(--color-navy-900)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--color-navy-900)' }}>
                {station.name}
              </h1>
              {isMaintenance ? (
                <Badge status="maintenance" label="Maintenance" />
              ) : (
                <Badge status="available" label="Active Hub" />
              )}
            </div>

            <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <MapPin size={16} style={{ flexShrink: 0, color: 'var(--color-text-muted)' }} />
              <span>{station.address}</span>
            </p>
          </div>

          {/* Quick Refresh Button */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => refreshStation(true)}
            disabled={isRefreshingSlots}
            title="Refresh live slot availability"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <RotateCw size={14} className={isRefreshingSlots ? 'spinner-icon' : ''} />
            <span>Refresh Slots</span>
          </button>
        </div>

        {/* Specs Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--color-border-subtle)',
          }}
        >
          <div>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
              Connector Standards
            </span>
            <div style={{ fontSize: '0.9375rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '2px' }}>
              <Zap size={14} color="var(--color-electric-green-active)" />
              {station.connector_type}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
              Energy Rate
            </span>
            <div className="text-mono" style={{ fontSize: '1rem', fontWeight: 700, marginTop: '2px', color: 'var(--color-navy-900)' }}>
              ₹{Number(station.price_per_kwh).toFixed(2)} / kWh
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
              Slot Occupancy
            </span>
            <div style={{ marginTop: '4px' }}>
              {isMaintenance ? (
                <Badge status="maintenance" label="Hub Under Maintenance" />
              ) : availableCount > 0 ? (
                <Badge status="available" label={`${availableCount} of ${station.total_slots} Slots Available`} />
              ) : (
                <Badge status="occupied" label={`All ${station.total_slots} Slots Busy`} />
              )}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
              Geographic Coordinates
            </span>
            <div className="text-mono" style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              {station.latitude?.toFixed(4)}° N, {station.longitude?.toFixed(4)}° E
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Detail Layout: Slots on Left, Reservation Form on Right */}
      <div className="station-detail-layout">
        {/* Left Column: Physical Slots Breakdown */}
        <section aria-labelledby="slots-heading">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 id="slots-heading" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              Physical Charging Bays ({slots.length})
            </h2>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
              Select an available bay to reserve
            </span>
          </div>

          {slots.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <AlertCircle size={24} color="var(--color-text-muted)" style={{ margin: '0 auto 0.5rem' }} />
              <p className="text-secondary">No physical charging slots configured for this station.</p>
            </div>
          ) : (
            <SlotSelector
              slots={slots}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
              disabled={isMaintenance}
            />
          )}

          {/* Operational Advisory */}
          <div
            style={{
              marginTop: '1.5rem',
              padding: '1rem',
              backgroundColor: 'var(--color-bg-muted)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-subtle)',
              fontSize: '0.8125rem',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.5,
            }}
          >
            <strong>PostgreSQL Concurrency Notice:</strong>
            <p style={{ marginTop: '0.25rem' }}>
              When you reserve a slot, VoltWay executes an atomic advisory lock and GiST exclusion constraint on the database. Concurrent reservation attempts for the exact same physical connector are serialized and prevented from overlapping.
            </p>
          </div>
        </section>

        {/* Right Column: Reservation Form */}
        <section aria-label="Slot reservation configuration">
          <ReservationForm
            station={station}
            selectedSlot={selectedSlot}
            onSuccessBooking={handleBookingSuccess}
            onConflictRefresh={() => refreshStation(true)}
          />
        </section>
      </div>

      {/* Booking Created Confirmation Modal */}
      {createdBooking && (
        <Modal
          isOpen={Boolean(createdBooking)}
          onClose={() => setCreatedBooking(null)}
          title="Slot Reserved Successfully"
        >
          <div className="booking-success-card">
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
              }}
            >
              <CheckCircle size={32} />
            </div>

            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                Reservation Pending Confirmation
              </h3>
              <p className="text-secondary" style={{ fontSize: '0.875rem' }}>
                Your charging bay has been held in the database.
              </p>
            </div>

            {/* 15-Minute Expiry Warning Banner */}
            <div
              style={{
                backgroundColor: 'var(--color-amber-50)',
                border: '1px solid var(--color-amber-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <Clock size={18} color="var(--color-amber-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.8125rem', color: '#92400E', lineHeight: 1.4 }}>
                <strong>15-Minute Payment Window:</strong> Unpaid reservations are automatically cancelled after 15 minutes, and the physical connector is released back to the public pool.
              </div>
            </div>

            {/* Reservation Summary Details */}
            <div
              style={{
                backgroundColor: 'var(--color-bg-canvas)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontSize: '0.875rem',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Booking Reference</span>
                <span className="text-mono" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                  {createdBooking.id?.slice(0, 8)}...
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Charging Station</span>
                <span style={{ fontWeight: 600 }}>{station.name}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Connector Bay</span>
                <span style={{ fontWeight: 600 }}>
                  Bay #{createdBooking.slot?.slot_number || selectedSlot?.slot_number}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Scheduled Window</span>
                <span style={{ fontWeight: 600 }}>
                  {new Date(createdBooking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' — '}
                  {new Date(createdBooking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border-subtle)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                <span style={{ fontWeight: 700 }}>Authoritative Amount</span>
                <span className="text-mono" style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-navy-900)' }}>
                  ₹{Number(createdBooking.amount).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-electric btn-block"
                onClick={() => setIsPaymentModalOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}
              >
                <CreditCard size={16} />
                <span>Simulate Payment Now (₹{Number(createdBooking.amount).toFixed(2)})</span>
              </button>

              <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-block"
                  onClick={() => {
                    setCreatedBooking(null);
                    setSelectedSlot(null);
                  }}
                >
                  Book Another Slot
                </button>

                <Link
                  to="/bookings/my"
                  className="btn btn-outline btn-block"
                  style={{ textDecoration: 'none', justifyContent: 'center' }}
                >
                  <CalendarCheck size={16} />
                  <span>My Reservations</span>
                </Link>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Simulated Payment Modal */}
      {isPaymentModalOpen && createdBooking && (
        <PaymentSimulationModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setCreatedBooking(null);
            setSelectedSlot(null);
          }}
          booking={createdBooking}
          onPaymentComplete={() => {
            refreshStation(true);
          }}
        />
      )}
    </div>
  );
};
