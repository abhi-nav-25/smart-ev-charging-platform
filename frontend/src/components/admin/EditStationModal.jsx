import { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { Input } from '../common/Input.jsx';
import { Alert } from '../common/Alert.jsx';
import { Spinner } from '../common/Spinner.jsx';
import { adminService } from '../../services/adminService.js';
import { Save, AlertTriangle } from 'lucide-react';

export const EditStationModal = ({ isOpen, onClose, station, onStationUpdated }) => {
  const [formData, setFormData] = useState(() => ({
    name: station?.name || '',
    address: station?.address || '',
    latitude: String(station?.latitude ?? ''),
    longitude: String(station?.longitude ?? ''),
    connector_type: station?.connector_type || 'CCS2 / Type 2',
    price_per_kwh: String(station?.price_per_kwh ?? ''),
    total_slots: String(station?.total_slots ?? ''),
    status: station?.status || 'active',
  }));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !station) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);

    const nameTrimmed = formData.name.trim();
    const addressTrimmed = formData.address.trim();
    const lat = Number(formData.latitude);
    const lng = Number(formData.longitude);
    const price = Number(formData.price_per_kwh);
    const slots = parseInt(formData.total_slots, 10);

    if (!nameTrimmed) {
      setError('Station name is required.');
      return;
    }
    if (!addressTrimmed) {
      setError('Street address is required.');
      return;
    }
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError('Latitude must be a valid number between -90 and 90.');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setError('Longitude must be a valid number between -180 and 180.');
      return;
    }
    if (isNaN(price) || price <= 0) {
      setError('Price per kWh must be a positive number.');
      return;
    }
    if (isNaN(slots) || slots < 1) {
      setError('Total slots capacity must be at least 1.');
      return;
    }

    setIsSubmitting(true);

    try {
      const updates = {
        name: nameTrimmed,
        address: addressTrimmed,
        latitude: lat,
        longitude: lng,
        connector_type: formData.connector_type,
        price_per_kwh: price,
        total_slots: slots,
        status: formData.status,
      };

      const res = await adminService.updateStation(station.id, updates);

      if (res.success && res.data) {
        onStationUpdated?.(res.data);
        onClose();
      } else {
        setError(res.message || 'Failed to update charging station.');
      }
    } catch (err) {
      console.error('[ADMIN_UPDATE_STATION_ERROR]', err);
      setError(err.message || 'Server error updating charging station.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isChangingStatusToMaintenance = formData.status === 'maintenance' && station.status !== 'maintenance';

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title={`Edit Charging Hub: ${station.name}`}
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {error && (
          <Alert type="danger" title="Update Error">
            {error}
          </Alert>
        )}

        {isChangingStatusToMaintenance && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--color-amber-50)',
              border: '1px solid var(--color-amber-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              color: '#92400E',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              lineHeight: 1.4,
            }}
          >
            <AlertTriangle size={16} color="var(--color-amber-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Maintenance Advisory:</strong> Changing this station to <code>maintenance</code> will
              prevent drivers from selecting it for new reservations on the map and discovery list.
            </div>
          </div>
        )}

        <Input
          label="Station Hub Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />

        <Input
          label="Street Address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          required
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Input
            label="Latitude"
            name="latitude"
            type="number"
            step="0.0001"
            value={formData.latitude}
            onChange={handleChange}
            required
          />

          <Input
            label="Longitude"
            name="longitude"
            type="number"
            step="0.0001"
            value={formData.longitude}
            onChange={handleChange}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label
              htmlFor="edit-connector-type"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-navy-900)',
                marginBottom: '0.375rem',
              }}
            >
              Connector Standard
            </label>
            <select
              id="edit-connector-type"
              name="connector_type"
              value={formData.connector_type}
              onChange={handleChange}
              className="input-field"
              style={{ width: '100%' }}
            >
              <option value="CCS2 / Type 2">CCS2 / Type 2 (Dual Standard)</option>
              <option value="CCS2 DC Fast">CCS2 DC Fast (60kW+)</option>
              <option value="Type 2 AC">Type 2 AC (22kW Slow/Medium)</option>
              <option value="CHAdeMO / CCS2">CHAdeMO / CCS2 (Universal Fast)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="edit-status"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-navy-900)',
                marginBottom: '0.375rem',
              }}
            >
              Operational Status
            </label>
            <select
              id="edit-status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="input-field"
              style={{ width: '100%' }}
            >
              <option value="active">Active (Available for drivers)</option>
              <option value="maintenance">Maintenance (Offline for service)</option>
              <option value="inactive">Inactive (Decommissioned)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Input
            label="Tariff Rate (₹ per kWh)"
            name="price_per_kwh"
            type="number"
            step="0.1"
            min="1"
            value={formData.price_per_kwh}
            onChange={handleChange}
            required
          />

          <Input
            label="Slot Capacity"
            name="total_slots"
            type="number"
            min="1"
            max="20"
            value={formData.total_slots}
            onChange={handleChange}
            required
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={isSubmitting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={15} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
