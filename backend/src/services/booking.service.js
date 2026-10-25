import { supabaseAdmin, supabase } from '../config/supabase.js';

export const bookingService = {
  /**
   * Create a new booking with database-level concurrency protection
   */
  async createBooking({
    userId,
    stationId,
    slotId,
    bookingDate,
    startTime,
    endTime,
    amount
  }) {
    const db = supabaseAdmin || supabase;

    // 1. Fetch station details to verify slot and price
    const { data: station, error: stationError } = await db
      .from('stations')
      .select('id, price_per_kwh, status')
      .eq('id', stationId)
      .single();

    if (stationError || !station) {
      const err = new Error('Charging station not found');
      err.statusCode = 404;
      throw err;
    }

    if (station.status !== 'active') {
      const err = new Error('Charging station is currently not active');
      err.statusCode = 400;
      throw err;
    }

    // 2. Fetch slot details
    const { data: slot, error: slotError } = await db
      .from('charging_slots')
      .select('id, station_id, status, power_output_kw')
      .eq('id', slotId)
      .eq('station_id', stationId)
      .single();

    if (slotError || !slot) {
      const err = new Error('Charging slot not found for this station');
      err.statusCode = 404;
      throw err;
    }

    if (slot.status === 'maintenance') {
      const err = new Error('Selected charging slot is currently under maintenance');
      err.statusCode = 400;
      throw err;
    }

    // 3. Compute authoritative amount server-side based on station rate and reservation duration
    // Prevents price parameter tampering (CWE-472)
    const durationHours = (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60);
    // Estimated consumption rate: 25 kWh average consumption * price_per_kwh
    const calculatedAmount = Number(
      (durationHours * 25 * Number(station.price_per_kwh)).toFixed(2)
    );

    // 4. Free stale pending bookings older than 15 minutes before reserving
    try {
      await db.rpc('cleanup_expired_pending_bookings');
    } catch {
      try {
        await db
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('status', 'pending')
          .lt('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString());
      } catch {
        // Non-critical background cleanup
      }
    }

    // 5. Atomic Booking via Supabase Stored Procedure (RPC)
    try {
      const { data: rpcResult, error: rpcError } = await db.rpc('create_booking_atomic', {
        p_user_id: userId,
        p_station_id: stationId,
        p_slot_id: slotId,
        p_booking_date: bookingDate,
        p_start_time: startTime,
        p_end_time: endTime,
        p_amount: calculatedAmount
      });

      if (!rpcError && rpcResult && rpcResult.length > 0) {
        const result = rpcResult[0];
        if (result.status === 'CONFLICT') {
          const err = new Error(result.message || 'Slot is already booked for this time window');
          err.statusCode = 409;
          throw err;
        }
        if (result.status === 'ERROR') {
          const err = new Error(result.message || 'Booking creation failed');
          err.statusCode = 400;
          throw err;
        }

        // Fetch full booking details
        return await this.getBookingById(result.booking_id, userId, true);
      }
    } catch (rpcEx) {
      // If RPC is missing or threw conflict, handle appropriately
      if (rpcEx.statusCode) throw rpcEx;
      console.warn('[RPC_FALLBACK] Falling back to direct query with constraint verification:', rpcEx.message);
    }

    // 6. Fallback Direct Query & Constraint Catch
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: conflicts, error: conflictErr } = await db
      .from('bookings')
      .select('id')
      .eq('slot_id', slotId)
      .or(`status.eq.confirmed,and(status.eq.pending,created_at.gte.${fifteenMinutesAgo})`)
      .lt('start_time', endTime)
      .gt('end_time', startTime);

    if (conflictErr) throw conflictErr;
    if (conflicts && conflicts.length > 0) {
      const err = new Error('The selected charging slot is already reserved for this time window');
      err.statusCode = 409;
      throw err;
    }

    // Insert booking
    const { data: newBooking, error: insertError } = await db
      .from('bookings')
      .insert({
        user_id: userId,
        station_id: stationId,
        slot_id: slotId,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        amount: calculatedAmount,
        status: 'pending'
      })
      .select(`
        id,
        user_id,
        station_id,
        slot_id,
        booking_date,
        start_time,
        end_time,
        amount,
        status,
        created_at
      `)
      .single();

    if (insertError) {
      // 23P01 is Postgres exclusion constraint violation
      if (insertError.code === '23P01' || insertError.message?.includes('exclusion')) {
        const err = new Error('Slot reservation conflict: Another user reserved this slot concurrently');
        err.statusCode = 409;
        throw err;
      }
      throw insertError;
    }

    return newBooking;
  },

  /**
   * Get all bookings for an authenticated user
   */
  async getUserBookings(userId) {
    const db = supabaseAdmin || supabase;
    const { data, error } = await db
      .from('bookings')
      .select(`
        id,
        booking_date,
        start_time,
        end_time,
        amount,
        status,
        created_at,
        station:stations (
          id,
          name,
          address,
          connector_type,
          price_per_kwh
        ),
        slot:charging_slots (
          id,
          slot_number,
          connector_type,
          power_output_kw
        ),
        payments (
          id,
          payment_status,
          transaction_reference,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get single booking by ID with ownership check
   */
  async getBookingById(bookingId, userId, bypassOwnership = false) {
    const db = supabaseAdmin || supabase;
    let query = db
      .from('bookings')
      .select(`
        id,
        user_id,
        booking_date,
        start_time,
        end_time,
        amount,
        status,
        created_at,
        station:stations (
          id,
          name,
          address,
          latitude,
          longitude,
          connector_type,
          price_per_kwh
        ),
        slot:charging_slots (
          id,
          slot_number,
          connector_type,
          power_output_kw
        ),
        payments (
          id,
          amount,
          payment_status,
          payment_method,
          transaction_reference,
          created_at
        )
      `)
      .eq('id', bookingId);

    if (!bypassOwnership) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  /**
   * Cancel an existing booking belonging to the user
   */
  async cancelBooking(bookingId, userId, isAdmin = false) {
    const db = supabaseAdmin || supabase;

    // First fetch booking to check ownership, state, and schedule
    let checkQuery = db
      .from('bookings')
      .select('id, user_id, status, start_time, end_time')
      .eq('id', bookingId);

    if (!isAdmin) {
      checkQuery = checkQuery.eq('user_id', userId);
    }

    const { data: booking, error: fetchError } = await checkQuery.single();

    if (fetchError || !booking) {
      const err = new Error('Booking not found or you do not have permission to cancel it');
      err.statusCode = 404;
      throw err;
    }

    if (booking.status === 'cancelled') {
      const err = new Error('Booking is already cancelled');
      err.statusCode = 400;
      throw err;
    }

    if (booking.status === 'completed') {
      const err = new Error('Cannot cancel a completed booking');
      err.statusCode = 400;
      throw err;
    }

    // Do not allow regular users to cancel historical bookings that have already elapsed
    if (!isAdmin && new Date(booking.end_time) <= new Date()) {
      const err = new Error('Cannot cancel a booking whose time window has already ended');
      err.statusCode = 400;
      throw err;
    }

    // Update status to 'cancelled' (releases slot constraint) with ownership check
    let updateQuery = db
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);

    if (!isAdmin) {
      updateQuery = updateQuery.eq('user_id', userId);
    }

    const { data: updated, error: updateError } = await updateQuery
      .select()
      .single();

    if (updateError) throw updateError;

    // If a confirmed booking with an active payment is cancelled, mark the payment as refunded
    if (booking.status === 'confirmed') {
      try {
        await db
          .from('payments')
          .update({ payment_status: 'refunded' })
          .eq('booking_id', bookingId)
          .eq('payment_status', 'success');
      } catch (refundErr) {
        console.warn('[CANCEL_REFUND_WARN]', refundErr.message);
      }
    }

    return updated;
  }
};
