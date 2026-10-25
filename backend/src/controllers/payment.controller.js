import { paymentService } from '../services/payment.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { isValidUUID, validateRequired } from '../utils/validator.js';
import { isSupabaseConfigured } from '../config/supabase.js';

/**
 * Simulate payment for a booking
 * POST /api/payments/simulate
 */
export const simulatePayment = async (req, res, next) => {
  try {
    const { booking_id, status = 'success', payment_method = 'simulated_card' } = req.body;

    const missing = validateRequired(req.body, ['booking_id']);
    if (missing.length > 0) {
      return sendError(res, `Missing required payment field: ${missing.join(', ')}`, 400);
    }

    if (!isValidUUID(booking_id)) {
      return sendError(res, 'Invalid booking_id format. Must be a valid UUID.', 400);
    }

    const normalizedStatus = String(status).toLowerCase();
    if (!['success', 'failed'].includes(normalizedStatus)) {
      return sendError(res, "Payment status must be either 'success' or 'failed'.", 400);
    }

    if (!isSupabaseConfigured) {
      return sendError(res, 'Database service is not configured. Please check server environment.', 503);
    }

    const result = await paymentService.simulatePayment({
      bookingId: booking_id,
      userId: req.user.id,
      status: normalizedStatus,
      paymentMethod: payment_method
    });

    const isSuccess = normalizedStatus === 'success';
    const message = isSuccess
      ? 'Payment simulated successfully. Booking has been confirmed.'
      : 'Payment simulation resulted in failure. Booking remains pending.';

    return sendSuccess(res, result, message, isSuccess ? 200 : 402);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};
