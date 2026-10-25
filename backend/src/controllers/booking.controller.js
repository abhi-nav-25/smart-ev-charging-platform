import { bookingService } from '../services/booking.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { isValidUUID, isValidISODate, validateRequired } from '../utils/validator.js';
import { isSupabaseConfigured } from '../config/supabase.js';

/**
 * Create a new EV slot booking
 * POST /api/bookings
 */
export const createBooking = async (req, res, next) => {
  try {
    const { station_id, slot_id, booking_date, start_time, end_time, amount } = req.body;

    const missing = validateRequired(req.body, [
      'station_id',
      'slot_id',
      'booking_date',
      'start_time',
      'end_time'
    ]);

    if (missing.length > 0) {
      return sendError(res, `Missing required booking fields: ${missing.join(', ')}`, 400);
    }

    if (!isValidUUID(station_id) || !isValidUUID(slot_id)) {
      return sendError(res, 'Invalid station_id or slot_id format. Must be UUIDs.', 400);
    }

    if (!isValidISODate(start_time) || !isValidISODate(end_time)) {
      return sendError(res, 'start_time and end_time must be valid ISO-8601 date strings.', 400);
    }

    const startTimestamp = new Date(start_time).getTime();
    const endTimestamp = new Date(end_time).getTime();

    if (endTimestamp <= startTimestamp) {
      return sendError(res, 'end_time must be strictly after start_time.', 400);
    }

    // Minimum reservation 15 minutes, maximum 24 hours
    const durationMinutes = (endTimestamp - startTimestamp) / (1000 * 60);
    if (durationMinutes < 15) {
      return sendError(res, 'Booking duration must be at least 15 minutes.', 400);
    }
    if (durationMinutes > 1440) {
      return sendError(res, 'Booking duration cannot exceed 24 hours.', 400);
    }

    if (!isSupabaseConfigured) {
      return sendError(res, 'Database service is not configured. Please check server environment.', 503);
    }

    const booking = await bookingService.createBooking({
      userId: req.user.id,
      stationId: station_id,
      slotId: slot_id,
      bookingDate: booking_date,
      startTime: new Date(start_time).toISOString(),
      endTime: new Date(end_time).toISOString(),
      amount: amount ? Number(amount) : null
    });

    return sendSuccess(
      res,
      booking,
      'Charging slot reserved successfully. Please proceed to payment simulation to confirm.',
      201
    );
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

/**
 * Get all bookings of authenticated user
 * GET /api/bookings/my
 */
export const getMyBookings = async (req, res, next) => {
  try {
    if (!isSupabaseConfigured) {
      return sendError(res, 'Database service is not configured. Please check server environment.', 503);
    }

    const bookings = await bookingService.getUserBookings(req.user.id);
    return sendSuccess(res, bookings, 'User bookings retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific booking by ID
 * GET /api/bookings/:id
 */
export const getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return sendError(res, 'Invalid booking ID format. Must be a valid UUID.', 400);
    }

    if (!isSupabaseConfigured) {
      return sendError(res, 'Database service is not configured. Please check server environment.', 503);
    }

    const isAdmin = req.user.role === 'admin';
    const booking = await bookingService.getBookingById(id, req.user.id, isAdmin);

    if (!booking) {
      return sendError(res, 'Booking not found or unauthorized to view.', 404);
    }

    return sendSuccess(res, booking, 'Booking details retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel an active booking
 * PATCH /api/bookings/:id/cancel
 */
export const cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return sendError(res, 'Invalid booking ID format. Must be a valid UUID.', 400);
    }

    if (!isSupabaseConfigured) {
      return sendError(res, 'Database service is not configured. Please check server environment.', 503);
    }

    const isAdmin = req.user.role === 'admin';
    const updatedBooking = await bookingService.cancelBooking(id, req.user.id, isAdmin);

    return sendSuccess(res, updatedBooking, 'Booking successfully cancelled and slot released.');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};
