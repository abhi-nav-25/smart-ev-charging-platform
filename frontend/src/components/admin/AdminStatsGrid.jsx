import {
  Zap,
  MapPin,
  CalendarCheck,
  CheckCircle,
  Wrench,
  IndianRupee,
  Activity,
} from 'lucide-react';

export const AdminStatsGrid = ({ stats }) => {
  if (!stats) return null;

  const totalStations = stats.total_stations ?? 0;
  const totalBookings = stats.total_bookings ?? 0;
  const confirmedBookings = stats.confirmed_bookings ?? 0;
  const availableSlots = stats.available_slots ?? 0;

  const metrics = stats.metrics || {};
  const totalSlots = metrics.total_slots ?? 0;
  const slotsInMaintenance = metrics.slots_in_maintenance ?? 0;
  const slotsCurrentlyCharging = metrics.slots_currently_charging ?? 0;
  const simulatedRevenue = Number(metrics.simulated_revenue ?? 0);

  // Calculate percentages for slot capacity breakdown bar
  const availablePct = totalSlots > 0 ? (availableSlots / totalSlots) * 100 : 0;
  const chargingPct = totalSlots > 0 ? (slotsCurrentlyCharging / totalSlots) * 100 : 0;
  const maintenancePct = totalSlots > 0 ? (slotsInMaintenance / totalSlots) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Primary KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Card 1: Total Stations */}
        <div className="card admin-kpi-card">
          <div className="kpi-icon-wrapper" style={{ backgroundColor: 'var(--color-navy-900)', color: '#FFFFFF' }}>
            <MapPin size={20} />
          </div>
          <div>
            <span className="kpi-label">Charging Hubs</span>
            <div className="kpi-value">{totalStations}</div>
            <span className="kpi-subtext">Active network locations</span>
          </div>
        </div>

        {/* Card 2: Available Physical Bays */}
        <div className="card admin-kpi-card">
          <div className="kpi-icon-wrapper" style={{ backgroundColor: 'var(--color-electric-green-subtle)', color: 'var(--color-electric-green-active)' }}>
            <Zap size={20} />
          </div>
          <div>
            <span className="kpi-label">Available Bays</span>
            <div className="kpi-value text-mono" style={{ color: 'var(--color-electric-green-active)' }}>
              {availableSlots} <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>/ {totalSlots}</span>
            </div>
            <span className="kpi-subtext">Unoccupied & ready</span>
          </div>
        </div>

        {/* Card 3: Active Charging Sessions */}
        <div className="card admin-kpi-card">
          <div className="kpi-icon-wrapper" style={{ backgroundColor: 'var(--color-navy-800)', color: 'var(--color-electric-green)' }}>
            <Activity size={20} />
          </div>
          <div>
            <span className="kpi-label">Active Charging</span>
            <div className="kpi-value text-mono" style={{ color: 'var(--color-navy-900)' }}>
              {slotsCurrentlyCharging}
            </div>
            <span className="kpi-subtext">Time-window in progress</span>
          </div>
        </div>

        {/* Card 4: Slots in Maintenance */}
        <div className="card admin-kpi-card">
          <div className="kpi-icon-wrapper" style={{ backgroundColor: 'var(--color-amber-50)', color: 'var(--color-amber-600)' }}>
            <Wrench size={20} />
          </div>
          <div>
            <span className="kpi-label">Under Maintenance</span>
            <div className="kpi-value text-mono" style={{ color: 'var(--color-amber-600)' }}>
              {slotsInMaintenance}
            </div>
            <span className="kpi-subtext">Offline physical bays</span>
          </div>
        </div>

        {/* Card 5: Total Bookings */}
        <div className="card admin-kpi-card">
          <div className="kpi-icon-wrapper" style={{ backgroundColor: 'var(--color-bg-muted)', color: 'var(--color-navy-900)' }}>
            <CalendarCheck size={20} />
          </div>
          <div>
            <span className="kpi-label">All System Bookings</span>
            <div className="kpi-value text-mono">{totalBookings}</div>
            <span className="kpi-subtext">{confirmedBookings} confirmed</span>
          </div>
        </div>

        {/* Card 6: Confirmed Reservations */}
        <div className="card admin-kpi-card">
          <div className="kpi-icon-wrapper" style={{ backgroundColor: 'var(--color-electric-green-subtle)', color: 'var(--color-electric-green-active)' }}>
            <CheckCircle size={20} />
          </div>
          <div>
            <span className="kpi-label">Confirmed Rate</span>
            <div className="kpi-value text-mono">
              {totalBookings > 0 ? `${Math.round((confirmedBookings / totalBookings) * 100)}%` : '0%'}
            </div>
            <span className="kpi-subtext">Completed simulated payments</span>
          </div>
        </div>

        {/* Card 7: Simulated Revenue */}
        <div className="card admin-kpi-card" style={{ gridColumn: 'span 2' }}>
          <div className="kpi-icon-wrapper" style={{ backgroundColor: 'var(--color-navy-900)', color: 'var(--color-electric-green)' }}>
            <IndianRupee size={20} />
          </div>
          <div>
            <span className="kpi-label">Simulated Network Revenue (Academic Demo)</span>
            <div className="kpi-value text-mono" style={{ fontSize: '1.6rem', color: 'var(--color-navy-900)' }}>
              ₹{simulatedRevenue.toFixed(2)}
            </div>
            <span className="kpi-subtext">
              Aggregated from confirmed driver reservations in PostgreSQL
            </span>
          </div>
        </div>
      </div>

      {/* Network Capacity Segmented Utilization Strip */}
      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--color-navy-900)' }}>
            Real-Time Connector Bay Utilization ({totalSlots} Physical Bays)
          </h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Bangalore Regional Grid
          </span>
        </div>

        {/* Segmented Bar */}
        <div
          style={{
            height: '14px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-bg-muted)',
            overflow: 'hidden',
            display: 'flex',
            marginBottom: '0.75rem',
            border: '1px solid var(--color-border-subtle)',
          }}
          role="progressbar"
          aria-valuenow={Math.round(chargingPct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            style={{
              width: `${availablePct}%`,
              backgroundColor: 'var(--color-electric-green)',
              transition: 'width 300ms ease',
            }}
            title={`Available: ${availableSlots} slots (${Math.round(availablePct)}%)`}
          />
          <div
            style={{
              width: `${chargingPct}%`,
              backgroundColor: 'var(--color-navy-900)',
              transition: 'width 300ms ease',
            }}
            title={`Charging: ${slotsCurrentlyCharging} slots (${Math.round(chargingPct)}%)`}
          />
          <div
            style={{
              width: `${maintenancePct}%`,
              backgroundColor: 'var(--color-amber-500)',
              transition: 'width 300ms ease',
            }}
            title={`Maintenance: ${slotsInMaintenance} slots (${Math.round(maintenancePct)}%)`}
          />
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', fontSize: '0.8125rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-electric-green)' }} />
            <span>
              Available: <strong>{availableSlots}</strong> ({Math.round(availablePct)}%)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-navy-900)' }} />
            <span>
              Currently Charging: <strong>{slotsCurrentlyCharging}</strong> ({Math.round(chargingPct)}%)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-amber-500)' }} />
            <span>
              Maintenance: <strong>{slotsInMaintenance}</strong> ({Math.round(maintenancePct)}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
