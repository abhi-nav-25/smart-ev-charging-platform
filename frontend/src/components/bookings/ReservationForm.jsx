import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import { bookingService } from '../../services/bookingService.js';
import { Button } from '../common/Button.jsx';
import { Alert } from '../common/Alert.jsx';
import {
  Calendar,
  Clock,
  Zap,
  AlertTriangle,
  LogIn,
  Info,
  CalendarCheck
} from 'lucide-react';

export const ReservationForm = ({
  station,
  selectedSlot,
  onSuccessBooking,
  onConflictRefresh,
}) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Helper to get local YYYY-MM-DD
  const getLocalDateString = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to get next rounded 15-minute time string (HH:mm)
  const getNextQuarterHourString = () => {
    const d = new Date();
    const minutes = d.getMinutes();
    const remainder = 15 - (minutes % 15);
    d.setMinutes(minutes + remainder);
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  };

  const [bookingDate, setBookingDate] = useState(() => getLocalDateString());
  const [startTime, setStartTime] = useState(() => getNextQuarterHourString());
  const [durationMinutes, setDurationMinutes] = useState(60);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [conflictError, setConflictError] = useState(null);

  // Available duration presets (15 mins to 4 hours)
  const durationPresets = [
    { label: '15 min', minutes: 15 },
    { label: '30 min', minutes: 30 },
    { label: '45 min', minutes: 45 },
    { label: '1 hour', minutes: 60 },
    { label: '1.5 hrs', minutes: 90 },
    { label: '2 hours', minutes: 120 },
    { label: '3 hours', minutes: 180 },
    { label: '4 hours', minutes: 240 },
  ];

  // Calculate authoritative start and end timestamps
  const reservationTimestamps = useMemo(() => {
    if (!bookingDate || !startTime) return null;

    const [hours, minutes] = startTime.split(':').map(Number);
    const start = new Date(`${bookingDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);

    if (isNaN(start.getTime())) return null;

    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    return {
      startDate: start,
      endDate: end,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      durationHours: durationMinutes / 60,
    };
  }, [bookingDate, startTime, durationMinutes]);

  // Calculate estimated price based on backend formula: durationHours * 25 kWh * price_per_kwh
  const estimatedCost = useMemo(() => {
    if (!reservationTimestamps || !station?.price_per_kwh) return '0.00';
    const amount = reservationTimestamps.durationHours * 25 * Number(station.price_per_kwh);
    return amount.toFixed(2);
  }, [reservationTimestamps, station]);

  // Validate form
  const validate = () => {
    setFormError(null);
    setConflictError(null);

    if (!selectedSlot) {
      setFormError('Please click an available charging slot above.');
      return false;
    }

    if (selectedSlot.status === 'maintenance' || selectedSlot.real_time_status === 'maintenance') {
      setFormError('The selected slot is currently under maintenance. Please select another slot.');
      return false;
    }

    if (selectedSlot.is_currently_occupied || selectedSlot.real_time_status === 'occupied') {
      setFormError('The selected slot is currently occupied. Please select an available slot.');
      return false;
    }

    if (!reservationTimestamps) {
      setFormError('Please select a valid date and start time.');
      return false;
    }

    // Minimum reservation 15 minutes, maximum 24 hours
    if (durationMinutes < 15) {
      setFormError('Booking duration must be at least 15 minutes.');
      return false;
    }
    if (durationMinutes > 1440) {
      setFormError('Booking duration cannot exceed 24 hours.');
      return false;
    }

    // Do not allow booking in the past
    const now = new Date();
    if (reservationTimestamps.startDate < now) {
      setFormError('Reservation start time cannot be in the past.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    setFormError(null);
    setConflictError(null);

    try {
      const payload = {
        station_id: station.id,
        slot_id: selectedSlot.id,
        booking_date: bookingDate,
        start_time: reservationTimestamps.startIso,
        end_time: reservationTimestamps.endIso,
        amount: Number(estimatedCost),
      };

      const res = await bookingService.createBooking(payload);

      if (res.success && res.data) {
        onSuccessBooking(res.data);
      } else {
        setFormError(res.message || 'Unable to complete reservation.');
      }
    } catch (err) {
      console.error('[BOOKING_CREATE_ERROR]', err);

      if (err.statusCode === 409) {
        // Double-booking conflict (GiST exclusion or concurrency collision)
        setConflictError(
          'Slot Reservation Conflict: Another driver reserved this physical slot for the selected time window. Slot availability has been refreshed. Please choose another slot or time.'
        );
        // Refresh station slot state from server
        onConflictRefresh?.();
      } else if (err.statusCode === 401) {
        setFormError('Authentication required. Please sign in to reserve a slot.');
      } else {
        setFormError(err.message || 'Failed to create reservation. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card reservation-form-card">
      <div className="reservation-form-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CalendarCheck size={20} color="var(--color-navy-900)" />
          <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Reserve Charging Slot</h3>
        </div>
        {selectedSlot && (
          <span className="selected-slot-pill">
            Bay #{selectedSlot.slot_number} • {selectedSlot.connector_type}
          </span>
        )}
      </div>

      {conflictError && (
        <Alert type="warning" title="Reservation Conflict (HTTP 409)" onClose={() => setConflictError(null)}>
          {conflictError}
        </Alert>
      )}

      {formError && (
        <Alert type="danger" onClose={() => setFormError(null)}>
          {formError}
        </Alert>
      )}

      {!selectedSlot ? (
        <div className="no-slot-prompt">
          <Info size={24} color="var(--color-text-muted)" />
          <p>
            Please select an available connector bay above to configure your reservation time window and review pricing.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {/* Date & Start Time Pickers */}
          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="booking_date" className="form-label">
                <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Booking Date
              </label>
              <input
                id="booking_date"
                type="date"
                className="form-input"
                min={getLocalDateString()}
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="start_time" className="form-label">
                <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Start Time
              </label>
              <input
                id="start_time"
                type="time"
                className="form-input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Duration Presets */}
          <div className="form-group">
            <label className="form-label">Reservation Duration</label>
            <div className="duration-pills-grid">
              {durationPresets.map((preset) => (
                <button
                  key={preset.minutes}
                  type="button"
                  className={`duration-pill ${durationMinutes === preset.minutes ? 'active' : ''}`}
                  onClick={() => setDurationMinutes(preset.minutes)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Booking Summary Box */}
          {reservationTimestamps && (
            <div className="booking-summary-box">
              <div className="summary-row">
                <span className="summary-label">Time Window</span>
                <span className="summary-value">
                  {reservationTimestamps.startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' — '}
                  {reservationTimestamps.endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' '}({durationMinutes} mins)
                </span>
              </div>

              <div className="summary-row">
                <span className="summary-label">Station Rate</span>
                <span className="summary-value text-mono">
                  ₹{Number(station.price_per_kwh).toFixed(2)} / kWh
                </span>
              </div>

              <div className="summary-row">
                <span className="summary-label">Estimated Energy</span>
                <span className="summary-value text-mono">
                  ~{(reservationTimestamps.durationHours * 25).toFixed(1)} kWh (avg 25 kW load)
                </span>
              </div>

              <div className="summary-total-row">
                <span className="total-label">Estimated Total</span>
                <span className="total-amount text-mono">₹{estimatedCost}</span>
              </div>

              <p className="summary-disclaimer">
                Authoritative price computed server-side by backend formula upon booking.
              </p>
            </div>
          )}

          {/* Action Trigger */}
          {isAuthenticated ? (
            <Button
              type="submit"
              variant="electric"
              size="lg"
              block
              loading={isSubmitting}
              icon={Zap}
              style={{ marginTop: '1.25rem' }}
            >
              Confirm Reservation (Slot #{selectedSlot.slot_number})
            </Button>
          ) : (
            <div className="auth-gate-box">
              <AlertTriangle size={20} color="var(--color-amber-600)" />
              <div style={{ flex: 1 }}>
                <strong style={{ display: 'block', fontSize: '0.9375rem', marginBottom: '0.25rem' }}>
                  Sign in required to reserve
                </strong>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                  Please sign in with your driver account to hold this charging slot.
                </p>
                <Link
                  to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
                >
                  <LogIn size={14} />
                  Sign In to Continue
                </Link>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
};
