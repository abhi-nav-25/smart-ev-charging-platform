import { Badge } from '../common/Badge.jsx';
import { Zap, AlertCircle, CheckCircle } from 'lucide-react';

export const SlotSelector = ({
  slots = [],
  selectedSlot = null,
  onSelectSlot,
  disabled = false,
}) => {
  return (
    <div className="slot-selector-container">
      <div className="slot-grid" role="radiogroup" aria-label="Select a charging slot">
        {slots.map((slot) => {
          const isSelected = selectedSlot?.id === slot.id;
          const isMaintenance = slot.status === 'maintenance' || slot.real_time_status === 'maintenance';
          const isOccupied = slot.is_currently_occupied || slot.status === 'occupied' || slot.real_time_status === 'occupied';
          const isAvailable = !isMaintenance && !isOccupied;

          return (
            <div
              key={slot.id}
              className={`slot-card ${isSelected ? 'selected' : ''} ${!isAvailable ? 'unavailable' : ''}`}
              onClick={() => {
                if (isAvailable && !disabled) {
                  onSelectSlot(slot);
                }
              }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && isAvailable && !disabled) {
                  e.preventDefault();
                  onSelectSlot(slot);
                }
              }}
              tabIndex={isAvailable && !disabled ? 0 : -1}
              role="radio"
              aria-checked={isSelected}
              aria-disabled={!isAvailable || disabled}
              aria-label={`Slot ${slot.slot_number}, ${slot.connector_type}, ${slot.power_output_kw} kW, ${isAvailable ? 'Available' : isMaintenance ? 'Maintenance' : 'Occupied'}`}
            >
              {/* Card Header: Slot Bay Number & Status */}
              <div className="slot-card-header">
                <span className="slot-number">
                  Bay #{slot.slot_number}
                </span>

                {isMaintenance ? (
                  <Badge status="maintenance" label="Maintenance" />
                ) : isAvailable ? (
                  <Badge status="available" label="Available" />
                ) : (
                  <Badge status="occupied" label="In Use" />
                )}
              </div>

              {/* Slot Details */}
              <div className="slot-details">
                <div className="slot-detail-row">
                  <span className="detail-label">Standard</span>
                  <span className="detail-value">{slot.connector_type}</span>
                </div>

                <div className="slot-detail-row">
                  <span className="detail-label">Power Output</span>
                  <span className="detail-value text-mono">
                    <Zap size={14} className="bolt-icon" />
                    {Number(slot.power_output_kw).toFixed(0)} kW
                  </span>
                </div>
              </div>

              {/* Selection Status Footer */}
              <div className="slot-card-action">
                {isSelected ? (
                  <span className="selected-indicator">
                    <CheckCircle size={15} />
                    <span>Selected for Reservation</span>
                  </span>
                ) : isAvailable ? (
                  <span className="available-prompt">Click to Select</span>
                ) : isMaintenance ? (
                  <span className="unavailable-note">
                    <AlertCircle size={13} />
                    <span>Under Maintenance</span>
                  </span>
                ) : (
                  <span className="unavailable-note">
                    <AlertCircle size={13} />
                    <span>Currently Occupied</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
