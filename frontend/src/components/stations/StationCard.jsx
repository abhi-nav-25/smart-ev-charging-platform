import { Link } from 'react-router-dom';
import { Badge } from '../common/Badge.jsx';
import { MapPin, Zap, ArrowRight, Navigation } from 'lucide-react';

export const StationCard = ({
  station,
  isSelected = false,
  onSelect,
}) => {
  const {
    id,
    name,
    address,
    connector_type,
    price_per_kwh,
    total_slots,
    available_slots,
    status,
  } = station;

  const isMaintenance = status === 'maintenance';
  const hasAvailable = available_slots > 0 && !isMaintenance;

  return (
    <article
      className={`station-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect?.(station)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(station);
        }
      }}
      aria-label={`Station: ${name}, ${available_slots} of ${total_slots} slots available`}
    >
      {/* Header & Status Badge */}
      <div className="station-card-header">
        <div style={{ flex: 1 }}>
          <h3 className="station-card-title">{name}</h3>
          <p className="station-card-address">
            <MapPin size={14} className="icon-shrink" />
            <span>{address}</span>
          </p>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          {isMaintenance ? (
            <Badge status="maintenance" label="Maintenance" />
          ) : hasAvailable ? (
            <Badge
              status="available"
              label={`${available_slots}/${total_slots} Slots Free`}
            />
          ) : (
            <Badge status="occupied" label={`Full (0/${total_slots})`} />
          )}
        </div>
      </div>

      {/* Metadata & Specs */}
      <div className="station-card-specs">
        <div className="spec-item">
          <span className="spec-label">Connectors</span>
          <span className="spec-value">
            <Zap size={14} className="spec-icon" />
            {connector_type}
          </span>
        </div>

        <div className="spec-item">
          <span className="spec-label">Rate per kWh</span>
          <span className="spec-value text-mono">
            ₹{Number(price_per_kwh).toFixed(2)}
          </span>
        </div>

        <div className="spec-item">
          <span className="spec-label">Physical Slots</span>
          <span className="spec-value text-mono">
            {total_slots} connectors
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="station-card-footer">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(station);
          }}
          title="Highlight and center on map"
        >
          <Navigation size={14} />
          Locate on Map
        </button>

        <Link
          to={`/stations/${id}`}
          className={`btn ${hasAvailable ? 'btn-electric' : 'btn-outline'} btn-sm`}
          onClick={(e) => e.stopPropagation()}
        >
          <span>View Slots</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
};
