import api from './api.js';

/**
 * VoltWay Administrator Service
 * Connects directly to existing Express admin routes:
 * - GET /api/admin/stats
 * - GET /api/admin/bookings
 * - POST /api/admin/stations
 * - PATCH /api/admin/stations/:id
 *
 * All requests inherit the driver/admin JWT Bearer token via api.js interceptor
 * and are validated at the database level against public.profiles.role = 'admin'.
 */
export const adminService = {
  /**
   * Retrieve platform-wide operational statistics
   * GET /api/admin/stats
   * @returns {Promise<Object>} { success, message, data: { total_stations, total_bookings, confirmed_bookings, available_slots, metrics } }
   */
  async getStats() {
    const res = await api.get('/admin/stats');
    return res;
  },

  /**
   * Retrieve all bookings across all users with server-side filters and pagination
   * GET /api/admin/bookings
   * @param {Object} [params]
   * @param {string} [params.status] - Filter by booking status ('pending', 'confirmed', 'cancelled', 'completed')
   * @param {string} [params.station_id] - Filter by station UUID
   * @param {number} [params.limit=50] - Result limit
   * @param {number} [params.offset=0] - Offset for pagination
   */
  async getAllBookings({ status, station_id, limit = 50, offset = 0 } = {}) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (station_id) params.append('station_id', station_id);
    if (limit) params.append('limit', String(limit));
    if (offset) params.append('offset', String(offset));

    const query = params.toString();
    const url = query ? `/admin/bookings?${query}` : '/admin/bookings';
    const res = await api.get(url);
    return res;
  },

  /**
   * Create a new EV charging hub and initialize physical connector slots
   * POST /api/admin/stations
   * @param {Object} payload
   * @param {string} payload.name - Station name
   * @param {string} payload.address - Physical street address
   * @param {number} payload.latitude - Geocoordinates latitude
   * @param {number} payload.longitude - Geocoordinates longitude
   * @param {string} payload.connector_type - Supported connectors (e.g. "CCS2 / Type 2")
   * @param {number} [payload.price_per_kwh=15.00] - Base tariff in INR
   * @param {number} [payload.total_slots=4] - Total physical slot capacity
   * @param {string} [payload.status='active'] - Operational status ('active', 'maintenance', 'inactive')
   * @param {Array} [payload.slots] - Optional custom slot configurations
   */
  async createStation(payload) {
    const res = await api.post('/admin/stations', payload);
    return res;
  },

  /**
   * Update existing station parameters
   * PATCH /api/admin/stations/:id
   * @param {string} id - Station UUID
   * @param {Object} updates - Allowed update fields
   */
  async updateStation(id, updates) {
    const res = await api.patch(`/admin/stations/${id}`, updates);
    return res;
  },
};
