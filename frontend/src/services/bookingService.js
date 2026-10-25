import api from './api.js';

/**
 * Booking Service
 * Consumes the existing backend reservation endpoints.
 * All protected endpoints automatically inherit the user's Bearer JWT from api.js interceptor.
 */
export const bookingService = {
  /**
   * Create an atomic, concurrency-safe reservation
   * POST /api/bookings
   * @param {Object} payload
   * @param {string} payload.station_id - Station UUID
   * @param {string} payload.slot_id - Charging Slot UUID
   * @param {string} payload.booking_date - ISO date string (YYYY-MM-DD)
   * @param {string} payload.start_time - ISO-8601 timestamp string
   * @param {string} payload.end_time - ISO-8601 timestamp string
   * @param {number} [payload.amount] - Estimated amount (backend recalculates authoritatively)
   */
  async createBooking(payload) {
    const res = await api.post('/bookings', payload);
    return res;
  },

  /**
   * Get all reservations of currently authenticated driver
   * GET /api/bookings/my
   */
  async getMyBookings() {
    const res = await api.get('/bookings/my');
    return res;
  },

  /**
   * Get single reservation by ID
   * GET /api/bookings/:id
   * @param {string} id - Booking UUID
   */
  async getBookingById(id) {
    const res = await api.get(`/bookings/${id}`);
    return res;
  },

  /**
   * Cancel an active reservation and immediately release physical connector
   * PATCH /api/bookings/:id/cancel
   * @param {string} id - Booking UUID
   */
  async cancelBooking(id) {
    const res = await api.patch(`/bookings/${id}/cancel`);
    return res;
  },
};
