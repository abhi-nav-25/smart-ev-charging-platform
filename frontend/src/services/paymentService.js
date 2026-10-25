import api from './api.js';

/**
 * VoltWay Simulated Payment Service
 * Integrates directly with the backend's simulated payment endpoint:
 * POST /api/payments/simulate
 *
 * NOTE: This is strictly an academic simulation for the Cloud Architecture
 * & Design college project. No real funds, cards, or bank accounts are debited.
 */
export const paymentService = {
  /**
   * Simulate a card or UPI payment for an existing pending reservation.
   *
   * @param {Object} payload
   * @param {string} payload.booking_id - Booking UUID
   * @param {'success'|'failed'} [payload.status='success'] - Simulation outcome
   * @param {'simulated_card'|'simulated_upi'} [payload.payment_method='simulated_card'] - Payment method
   * @returns {Promise<Object>} Backend response envelope { success, message, data }
   */
  async simulatePayment({
    booking_id,
    status = 'success',
    payment_method = 'simulated_card',
  }) {
    // The backend returns HTTP 200 for 'success' simulations and HTTP 402 for 'failed' simulations.
    // We allow HTTP 402 in validateStatus so the failure simulation payload is returned
    // to the UI for authoritative display, while true network/auth/expiry errors reject.
    const res = await api.post(
      '/payments/simulate',
      {
        booking_id,
        status,
        payment_method,
      },
      {
        validateStatus: (httpStatus) =>
          (httpStatus >= 200 && httpStatus < 300) || httpStatus === 402,
      }
    );
    return res;
  },
};
