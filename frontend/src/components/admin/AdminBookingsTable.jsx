import { useState, useEffect, useCallback } from 'react';
import { adminService } from '../../services/adminService.js';
import { Badge } from '../common/Badge.jsx';
import { Spinner } from '../common/Spinner.jsx';
import { Alert } from '../common/Alert.jsx';
import { Filter, ChevronLeft, ChevronRight, RotateCw, CalendarCheck } from 'lucide-react';

const PAGE_SIZE = 25;

export const AdminBookingsTable = ({ stations = [] }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState('');
  const [stationFilter, setStationFilter] = useState('');
  const [offset, setOffset] = useState(0);

  const fetchAdminBookings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await adminService.getAllBookings({
        status: statusFilter || undefined,
        station_id: stationFilter || undefined,
        limit: PAGE_SIZE,
        offset,
      });

      if (res.success && Array.isArray(res.data)) {
        setBookings(res.data);
      } else {
        setError(res.message || 'Failed to retrieve system bookings.');
      }
    } catch (err) {
      console.error('[ADMIN_BOOKINGS_ERROR]', err);
      setError(err.message || 'Error fetching system bookings from backend.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, stationFilter, offset]);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        const res = await adminService.getAllBookings({
          status: statusFilter || undefined,
          station_id: stationFilter || undefined,
          limit: PAGE_SIZE,
          offset,
        });
        if (!ignore) {
          if (res.success && Array.isArray(res.data)) {
            setBookings(res.data);
            setError(null);
          } else {
            setError(res.message || 'Failed to retrieve system bookings.');
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error('[ADMIN_BOOKINGS_ERROR]', err);
          setError(err.message || 'Error fetching system bookings from backend.');
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
  }, [statusFilter, stationFilter, offset]);

  // Handle filter changes (resets pagination offset to 0)
  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setOffset(0);
  };

  const handleStationChange = (e) => {
    setStationFilter(e.target.value);
    setOffset(0);
  };

  const handlePrevPage = () => {
    setOffset((prev) => Math.max(0, prev - PAGE_SIZE));
  };

  const handleNextPage = () => {
    setOffset((prev) => prev + PAGE_SIZE);
  };

  const hasNextPage = bookings.length === PAGE_SIZE;
  const hasPrevPage = offset > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Table Filter Toolbar */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-navy-900)', fontWeight: 600, fontSize: '0.875rem' }}>
            <Filter size={16} />
            <span>Server Filters:</span>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={handleStatusChange}
            className="input-field"
            style={{ width: 'auto', padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>

          {/* Station Filter */}
          <select
            value={stationFilter}
            onChange={handleStationChange}
            className="input-field"
            style={{ width: 'auto', maxWidth: '240px', padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
          >
            <option value="">All Stations ({stations.length})</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Refresh & Pagination Summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            {bookings.length > 0 ? `Showing ${offset + 1}–${offset + bookings.length}` : '0 results'}
          </span>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchAdminBookings}
            disabled={loading}
            title="Refresh bookings from server"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
          >
            <RotateCw size={13} className={loading ? 'spinner-icon' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <Alert type="danger" title="Bookings Query Error">
          {error}
        </Alert>
      )}

      {/* Bookings Table Container */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Spinner size="md" label="Querying all system bookings with database ownership details..." />
          </div>
        ) : bookings.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <CalendarCheck size={28} color="var(--color-text-muted)" style={{ margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              No Reservations Found
            </h3>
            <p className="text-secondary" style={{ fontSize: '0.875rem', margin: 0 }}>
              No bookings matched the selected server filter criteria.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Booking Ref</th>
                  <th>Charging Station & Bay</th>
                  <th>Driver ID</th>
                  <th>Scheduled Window</th>
                  <th>Amount</th>
                  <th>Booking Status</th>
                  <th>Payment Status</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const payments = b.payments || [];
                  const latestPayment = payments[0] || null;
                  const startTime = new Date(b.start_time);
                  const endTime = new Date(b.end_time);

                  return (
                    <tr key={b.id}>
                      {/* Booking Reference */}
                      <td className="text-mono" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                        {b.id?.slice(0, 8)}...
                      </td>

                      {/* Station & Bay */}
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--color-navy-900)' }}>
                          {b.station?.name || 'Unknown Hub'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          Bay #{b.slot?.slot_number} • {b.slot?.connector_type}
                        </div>
                      </td>

                      {/* Driver ID */}
                      <td className="text-mono" style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        {b.user_id ? `${b.user_id.slice(0, 8)}...` : '—'}
                      </td>

                      {/* Scheduled Window */}
                      <td style={{ fontSize: '0.8125rem' }}>
                        <div>{b.booking_date}</div>
                        <div className="text-mono" style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                          {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' — '}
                          {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="text-mono" style={{ fontWeight: 700, color: 'var(--color-navy-900)' }}>
                        ₹{Number(b.amount).toFixed(2)}
                      </td>

                      {/* Status */}
                      <td>
                        <Badge status={b.status} label={b.status.toUpperCase()} />
                      </td>

                      {/* Payment */}
                      <td>
                        {latestPayment ? (
                          <div>
                            <Badge status={latestPayment.payment_status} label={latestPayment.payment_status} />
                            <div className="text-mono" style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                              {latestPayment.transaction_reference?.slice(0, 14)}...
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            No payment
                          </span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="text-mono" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {new Date(b.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderTop: '1px solid var(--color-border-subtle)',
            backgroundColor: 'var(--color-bg-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Page {Math.floor(offset / PAGE_SIZE) + 1}
          </span>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handlePrevPage}
              disabled={!hasPrevPage || loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleNextPage}
              disabled={!hasNextPage || loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
