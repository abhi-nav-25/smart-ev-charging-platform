import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { Badge } from '../common/Badge.jsx';
import { ArrowRight, Zap, MapPin } from 'lucide-react';

/**
 * Helper component inside MapContainer to dynamically handle
 * map invalidation (resize) and smooth panning to selected station.
 */
const MapController = ({ selectedStation, stations }) => {
  const map = useMap();

  // Invalidate map size on mount and window resize
  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => map.invalidateSize(), 300);
    return () => clearTimeout(timer);
  }, [map]);

  // Smoothly center when selectedStation changes
  useEffect(() => {
    if (selectedStation?.latitude && selectedStation?.longitude) {
      map.flyTo([selectedStation.latitude, selectedStation.longitude], 13.5, {
        duration: 0.75,
      });
    }
  }, [selectedStation, map]);

  // Fit bounds to all stations if no station is selected initially
  useEffect(() => {
    if (!selectedStation && stations?.length > 0) {
      const validPoints = stations
        .filter((s) => s.latitude && s.longitude)
        .map((s) => [s.latitude, s.longitude]);

      if (validPoints.length > 0) {
        const bounds = L.latLngBounds(validPoints);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
      }
    }
  }, [stations, selectedStation, map]);

  return null;
};

/**
 * Creates custom SVG HTML divIcon for Leaflet markers
 * representing live available slot state without image asset dependencies.
 */
const createStationIcon = (station, isSelected) => {
  const isMaintenance = station.status === 'maintenance';
  const hasSlots = station.available_slots > 0 && !isMaintenance;

  const bgColor = isMaintenance
    ? 'var(--color-amber-500)'
    : hasSlots
    ? 'var(--color-electric-green)'
    : 'var(--color-navy-700)';

  const textColor = hasSlots ? '#070D1F' : '#FFFFFF';
  const borderRing = isSelected
    ? '0 0 0 4px rgba(16, 185, 129, 0.4), 0 4px 12px rgba(0, 0, 0, 0.25)'
    : '0 2px 6px rgba(0, 0, 0, 0.2)';

  const html = `
    <div style="
      width: ${isSelected ? '38px' : '32px'};
      height: ${isSelected ? '38px' : '32px'};
      background-color: ${bgColor};
      color: ${textColor};
      border-radius: 50%;
      border: 2px solid #FFFFFF;
      box-shadow: ${borderRing};
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: ${isSelected ? '13px' : '11px'};
      font-family: var(--font-sans);
      transition: all 150ms ease-out;
      transform: translate(-50%, -50%);
    ">
      ${isMaintenance ? '!' : station.available_slots}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'voltway-map-marker',
    iconSize: [0, 0],
    popupAnchor: [0, -18],
  });
};

export const StationMap = ({
  stations = [],
  selectedStation = null,
  onSelectStation,
}) => {
  // Default map center: Bangalore city center [12.9716, 77.5946]
  const defaultCenter = [12.9716, 77.5946];
  const defaultZoom = 11;

  // Memoize marker icons
  const markerIcons = useMemo(() => {
    const map = {};
    stations.forEach((s) => {
      map[s.id] = createStationIcon(s, selectedStation?.id === s.id);
    });
    return map;
  }, [stations, selectedStation]);

  return (
    <div className="station-map-container" tabIndex={-1}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', minHeight: '400px' }}
      >
        {/* OpenStreetMap Tile Layer with standard attribution */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={18}
        />

        <MapController selectedStation={selectedStation} stations={stations} />

        {/* Map Markers for Each Station */}
        {stations.map((station) => {
          if (!station.latitude || !station.longitude) return null;
          const isSelected = selectedStation?.id === station.id;

          return (
            <Marker
              key={station.id}
              position={[station.latitude, station.longitude]}
              icon={markerIcons[station.id] || createStationIcon(station, isSelected)}
              eventHandlers={{
                click: () => onSelectStation?.(station),
              }}
            >
              <Popup className="voltway-leaflet-popup">
                <div style={{ minWidth: '220px', padding: '0.25rem 0' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, color: 'var(--color-navy-900)' }}>
                      {station.name}
                    </h4>
                  </div>

                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin size={12} style={{ flexShrink: 0 }} />
                    {station.address}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    {station.status === 'maintenance' ? (
                      <Badge status="maintenance" label="Maintenance" />
                    ) : (
                      <Badge
                        status={station.available_slots > 0 ? 'available' : 'occupied'}
                        label={`${station.available_slots}/${station.total_slots} Free`}
                      />
                    )}
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      ₹{Number(station.price_per_kwh).toFixed(2)}/kWh
                    </span>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Zap size={12} color="var(--color-electric-green-active)" />
                    <span>{station.connector_type}</span>
                  </div>

                  <Link
                    to={`/stations/${station.id}`}
                    className="btn btn-primary btn-sm btn-block"
                    style={{ textDecoration: 'none', justifyContent: 'center' }}
                  >
                    <span>Inspect Station</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
