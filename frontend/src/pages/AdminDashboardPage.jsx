import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../services/adminService.js';
import { stationService } from '../services/stationService.js';
import { AdminStatsGrid } from '../components/admin/AdminStatsGrid.jsx';
import { AdminBookingsTable } from '../components/admin/AdminBookingsTable.jsx';
import { CreateStationModal } from '../components/admin/CreateStationModal.jsx';
import { EditStationModal } from '../components/admin/EditStationModal.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { Alert } from '../components/common/Alert.jsx';
import { Badge } from '../components/common/Badge.jsx';
import {
  Shield,
  Activity,
  MapPin,
  CalendarCheck,
  PlusCircle,
  Edit2,
  ExternalLink,
  RotateCw,
  Zap,
} from 'lucide-react';

export const AdminDashboardPage = () => {
  const [activeTab, setActiveTab] = useState('metrics'); // 'metrics' | 'stations' | 'bookings'

  // Data State
  const [stats, setStats] = useState(null);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [successBanner, setSuccessBanner] = useState(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState(null);

  // Fetch initial data (stats + stations)
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [statsRes, stationsRes] = await Promise.all([
        adminService.getStats(),
        stationService.getStations(),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      } else {
        throw new Error(statsRes.message || 'Failed to retrieve administrative statistics.');
      }

      if (stationsRes.success && Array.isArray(stationsRes.data)) {
        setStations(stationsRes.data);
      }
    } catch (err) {
      console.error('[ADMIN_FETCH_ERROR]', err);
      setError(err.message || 'Failed to connect to administrative endpoints. Ensure your database profile role is admin.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadInitial = async () => {
      try {
        const [statsRes, stationsRes] = await Promise.all([
          adminService.getStats(),
          stationService.getStations(),
        ]);

        if (!ignore) {
          if (statsRes.success && statsRes.data) {
            setStats(statsRes.data);
          } else {
            setError(statsRes.message || 'Failed to retrieve administrative statistics.');
          }

          if (stationsRes.success && Array.isArray(stationsRes.data)) {
            setStations(stationsRes.data);
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error('[ADMIN_FETCH_ERROR]', err);
          setError(
            err.message ||
              'Failed to connect to administrative endpoints. Ensure your database profile role is admin.'
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadInitial();

    return () => {
      ignore = true;
    };
  }, []);

  const handleStationCreated = (newStation) => {
    setSuccessBanner(`Charging Hub "${newStation.name}" was successfully registered with ${newStation.total_slots || 4} initialized physical bays.`);
    fetchData(true);
  };

  const handleStationUpdated = (updated) => {
    setSuccessBanner(`Charging Hub "${updated.name}" specifications were updated successfully.`);
    fetchData(true);
  };

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      {/* Admin Header */}
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
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-navy-900)',
                color: 'var(--color-electric-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield size={18} />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--color-navy-900)' }}>
              Operations Console
            </h1>
            <Badge status="admin" label="ADMIN PRIVILEGES" />
          </div>
          <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)', margin: 0 }}>
            Real-time grid management, slot allocation monitoring, and station infrastructure controls.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fetchData(true)}
            disabled={isRefreshing || loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <RotateCw size={14} className={isRefreshing ? 'spinner-icon' : ''} />
            <span>Refresh Metrics</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setIsCreateModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <PlusCircle size={15} />
            <span>Add Station Hub</span>
          </button>
        </div>
      </div>

      {successBanner && (
        <div style={{ marginBottom: '1.25rem' }}>
          <Alert type="success" title="Infrastructure Updated">
            {successBanner}
          </Alert>
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <div
        className="booking-tabs"
        role="tablist"
        aria-label="Admin console navigation"
        style={{
          display: 'flex',
          overflowX: 'auto',
          gap: '0.5rem',
          borderBottom: '1px solid var(--color-border-subtle)',
          paddingBottom: '0.75rem',
          marginBottom: '1.75rem',
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'metrics'}
          className={`booking-tab-btn ${activeTab === 'metrics' ? 'active' : ''}`}
          onClick={() => setActiveTab('metrics')}
        >
          <Activity size={16} />
          <span>Operational Metrics</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'stations'}
          className={`booking-tab-btn ${activeTab === 'stations' ? 'active' : ''}`}
          onClick={() => setActiveTab('stations')}
        >
          <MapPin size={16} />
          <span>Station Management</span>
          <span className="tab-badge">{stations.length}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'bookings'}
          className={`booking-tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          <CalendarCheck size={16} />
          <span>System Reservations</span>
          {stats && <span className="tab-badge">{stats.total_bookings}</span>}
        </button>
      </div>

      {/* Loading / Error States */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <Spinner size="lg" label="Loading database metrics and network stations..." />
        </div>
      ) : error ? (
        <Alert type="danger" title="Administrative Access Error">
          <p style={{ marginBottom: '1rem' }}>{error}</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fetchData(false)}
          >
            Retry Connection
          </button>
        </Alert>
      ) : (
        <>
          {/* TAB 1: OPERATIONAL METRICS */}
          {activeTab === 'metrics' && (
            <AdminStatsGrid stats={stats} />
          )}

          {/* TAB 2: STATION MANAGEMENT */}
          {activeTab === 'stations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--color-navy-900)' }}>
                  Registered Charging Hubs ({stations.length})
                </h2>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                  Manage capacities, pricing, and hardware maintenance
                </span>
              </div>

              {stations.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                  <MapPin size={32} color="var(--color-text-muted)" style={{ margin: '0 auto 0.75rem' }} />
                  <h3>No Stations Registered</h3>
                  <p className="text-secondary" style={{ marginBottom: '1.25rem' }}>
                    Click "Add Station Hub" to provision the first charging station.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    Add Station Hub
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {stations.map((s) => {
                    const isMaint = s.status === 'maintenance';

                    return (
                      <article
                        key={s.id}
                        className="card"
                        style={{
                          padding: '1.25rem 1.5rem',
                          borderLeft: `5px solid ${isMaint ? 'var(--color-amber-500)' : 'var(--color-navy-900)'}`,
                        }}
                      >
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                          <div style={{ flex: '1 1 340px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--color-navy-900)' }}>
                                {s.name}
                              </h3>
                              <Badge status={s.status} label={s.status.toUpperCase()} />
                            </div>

                            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                              {s.address}
                            </p>

                            {/* Specs Strip */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', fontSize: '0.8125rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                <Zap size={14} color="var(--color-electric-green-active)" />
                                <span>{s.connector_type}</span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                <span className="text-muted">Tariff:</span>
                                <span className="text-mono" style={{ fontWeight: 700 }}>
                                  ₹{Number(s.price_per_kwh).toFixed(2)} / kWh
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                <span className="text-muted">Slot Capacity:</span>
                                <span className="text-mono" style={{ fontWeight: 700 }}>
                                  {s.available_slots !== undefined ? `${s.available_slots} / ${s.total_slots} Free` : `${s.total_slots} Bays`}
                                </span>
                              </div>

                              <div className="text-mono" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                {Number(s.latitude).toFixed(4)}° N, {Number(s.longitude).toFixed(4)}° E
                              </div>
                            </div>
                          </div>

                          {/* Station Actions */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setEditingStation(s)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
                            >
                              <Edit2 size={13} />
                              <span>Edit Hub</span>
                            </button>

                            <Link
                              to={`/stations/${s.id}`}
                              className="btn btn-outline btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
                            >
                              <span>Public Page</span>
                              <ExternalLink size={13} />
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SYSTEM RESERVATIONS */}
          {activeTab === 'bookings' && (
            <AdminBookingsTable stations={stations} />
          )}
        </>
      )}

      {/* Add Station Modal */}
      {isCreateModalOpen && (
        <CreateStationModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onStationCreated={handleStationCreated}
        />
      )}

      {/* Edit Station Modal */}
      {editingStation && (
        <EditStationModal
          key={editingStation.id}
          isOpen={Boolean(editingStation)}
          onClose={() => setEditingStation(null)}
          station={editingStation}
          onStationUpdated={handleStationUpdated}
        />
      )}
    </div>
  );
};
