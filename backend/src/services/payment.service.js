import { supabaseAdmin, supabase } from '../config/supabase.js';

export const paymentService = {
  /**
   * Process a simulated payment for a booking
   */
  async simulatePayment({ bookingId, userId, status = 'success', paymentMethod = 'simulated_card' }) {
    const db = supabaseAdmin || supabase;

    // 1. Fetch booking to verify existence and user ownership
    const { data: booking, error: bookingError } = await db
      .from('bookings')
      .select('id, user_id, amount, status, station_id, slot_id, created_at')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      const err = new Error('Booking not found');
      err.statusCode = 404;
      throw err;
    }

    // Enforce ownership: users cannot pay for another user's booking
    if (booking.user_id !== userId) {
      const err = new Error('Unauthorized: You can only pay for your own bookings');
      err.statusCode = 403;
      throw err;
    }

    if (booking.status === 'cancelled') {
      const err = new Error('Cannot pay for a cancelled booking');
      err.statusCode = 400;
      throw err;
    }

    // Prevent duplicate successful payments
    const { data: existingSuccessPayment } = await db
      .from('payments')
      .select('id, transaction_reference, payment_status, created_at')
      .eq('booking_id', bookingId)
      .eq('payment_status', 'success')
      .maybeSingle();

    if (existingSuccessPayment || booking.status === 'confirmed') {
      const err = new Error('Duplicate payment prevented: This booking has already been paid and confirmed');
      err.statusCode = 400;
      throw err;
    }

    // 15-Minute Expiration Check for Unpaid Reservations
    const BOOKING_EXPIRATION_MS = 15 * 60 * 1000;
    const bookingAgeMs = Date.now() - new Date(booking.created_at).getTime();
    if (bookingAgeMs > BOOKING_EXPIRATION_MS && booking.status === 'pending') {
      await db.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
      const err = new Error(
        'Booking expired: Unpaid bookings are held for a maximum of 15 minutes. Reservation was cancelled and the slot released.'
      );
      err.statusCode = 400;
      throw err;
    }

    // 2. Generate unique simulated transaction reference
    const timestamp = Date.now();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const txnReference = `SIM-TXN-${timestamp}-${randomSuffix}`;

    const isSuccess = status.toLowerCase() === 'success';
    const paymentStatus = isSuccess ? 'success' : 'failed';
    const note = isSuccess
      ? 'SIMULATED PAYMENT: Academic testing only. No real financial transaction occurred.'
      : 'SIMULATED PAYMENT (FAILED): Academic testing simulation. Reservation automatically released.';

    // 3. Record payment in the database (persisting the payment attempt with its booking)
    const { data: paymentRecord, error: paymentError } = await db
      .from('payments')
      .insert({
        booking_id: bookingId,
        user_id: userId,
        amount: booking.amount,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        transaction_reference: txnReference,
        simulated_note: note
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // 4. Update booking status consistently:
    // - On success: transition from 'pending' to 'confirmed'
    // - On failure: transition from 'pending' to 'cancelled' so failed payment does not block slot indefinitely
    let updatedBooking = booking;
    if (isSuccess) {
      const { data: confirmedBooking, error: updateError } = await db
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId)
        .select()
        .single();

      if (updateError) throw updateError;
      updatedBooking = confirmedBooking;
    } else {
      const { data: cancelledBooking, error: updateError } = await db
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)
        .select()
        .single();

      if (updateError) throw updateError;
      updatedBooking = cancelledBooking;
    }

    return {
      payment: paymentRecord,
      booking: updatedBooking,
      is_simulated: true,
      disclaimer: 'SIMULATED TRANSACTION: For academic demonstration only. No real money was charged.'
    };
  }
};
