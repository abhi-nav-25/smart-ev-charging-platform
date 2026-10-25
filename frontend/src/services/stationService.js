import api from './api.js';

/**
 * Station Service
 * Consumes the existing backend station catalog and availability endpoints.
 */
export const stationService = {
  /**
   * Fetch all charging stations with live computed available_slots
   * GET /api/stations?search=<term>
   * @param {string} [search] - Optional search term matching station name or address
   */
  async getStations(search) {
    const params = {};
    if (search && search.trim() !== '') {
      params.search = search.trim();
    }
    const res = await api.get('/stations', { params });
    // api interceptor unwraps standard envelope: { success, message, data }
    return res;
  },

  /**
   * Fetch detailed station view with physical charging_slots array and real-time statuses
   * GET /api/stations/:id
   * @param {string} id - Station UUID
   */
  async getStationById(id) {
    const res = await api.get(`/stations/${id}`);
    return res;
  },
};
