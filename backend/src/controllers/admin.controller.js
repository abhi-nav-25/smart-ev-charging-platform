import { supabaseAdmin, supabase } from '../config/supabase.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { isValidUUID, validateRequired } from '../utils/validator.js';
import { isSupabaseConfigured } from '../config/supabase.js';

/**
 * Create a new station with its physical charging slots
 * POST /api/admin/stations
 */
export const createStation = async (req, res, next) => {
  try {
    const {
      name,
      address,
      latitude,
      longitude,
      connector_type,
      price_per_kwh = 15.00,
      total_slots = 4,
      status = 'active',
      slots
    } = req.body;

    const missing = validateRequired(req.body, ['name', 'address', 'latitude', 'longitude', 'connector_type']);
    if (missing.length > 0) {
      return sendError(res, `Missing required station fields: ${missing.join(', ')}`, 400);
    }

    const numLat = Number(latitude);
    const numLng = Number(longitude);
    const numPrice = Number(price_per_kwh);
    const numSlots = parseInt(total_slots, 10) || 4;

    if (isNaN(numLat) || isNaN(numLng)) {
      return sendError(res, 'Latitude and longitude must be valid numbers.', 400);
    }

    if (!isSupabaseConfigured) {
      return sendError(res, 'Database service is not configured. Please check server environment.', 503);
    }

    const db = supabaseAdmin || supabase;

    // 1. Insert station
    const { data: newStation, error: stationError } = await db
      .from('stations')
      .insert({
        name,
        address,
        latitude: numLat,
        longitude: numLng,
        connector_type,
        price_per_kwh: numPrice,
        total_slots: numSlots,
        status
      })
      .select()
      .single();

    if (stationError) throw stationError;

    // 2. Insert slots (custom array or auto-generated based on total_slots)
    const slotRecords = [];
    if (Array.isArray(slots) && slots.length > 0) {
      slots.forEach((s, index) => {
        slotRecords.push({
          station_id: newStation.id,
          slot_number: index + 1,
          connector_type: s.connector_type || connector_type,
          power_output_kw: s.power_output_kw ? Number(s.power_output_kw) : 50.00,
          status: s.status || 'available'
        });
      });
    } else {
      for (let i = 1; i <= numSlots; i++) {
        slotRecords.push({
          station_id: newStation.id,
          slot_number: i,
          connector_type: connector_type.includes('/') ? connector_type.split('/')[0].trim() : connector_type,
          power_output_kw: 50.00,
          status: 'available'
        });
      }
    }

    const { data: createdSlots, error: slotsError } = await db
      .from('charging_slots')
      .insert(slotRecords)
      .select();

    if (slotsError) {
      console.warn('[ADMIN_CREATE_SLOTS_WARN]', slotsError);
    }

    return sendSuccess(
      res,
      {
        ...newStation,
        charging_slots: createdSlots || []
      },
      'Charging station and slots created successfully.',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update station details
 * PATCH /api/admin/stations/:id
 */
export const updateStation = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return sendError(res, 'Invalid station ID format. Must be a valid UUID.', 400);
    }

    const allowedFields = [
      'name',
      'address',
      'latitude',
      'longitude',
      'connector_type',
      'price_per_kwh',
      'total_slots',
      'status'
    ];

    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return sendError(res, 'No valid fields provided to update.', 400);
    }

    if (!isSupabaseConfigured) {
      return sendError(res, 'Database service is not configured. Please check server environment.', 503);
    }

    const db = supabaseAdmin || supabase;
    const { data: updatedStation, error } = await db
      .from('stations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return sendError(res, 'Station not found.', 404);
      }
      throw error;
    }

    return sendSuccess(res, updatedStation, 'Station updated successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * List all bookings across all users
 * GET /api/admin/bookings
 */
export const getAllBookings = async (req, res, next) => {
  try {
    if (!isSupabaseConfigured) {
      return sendError(res, 'Database service is not configured. Please check server environment.', 503);
    }

    const { status, station_id, limit = 50, offset = 0 } = req.query;

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
          address
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
          transaction_reference,
          created_at
        )
      `)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (station_id && isValidUUID(station_id)) {
      query = query.eq('station_id', station_id);
    }

    const { data: bookings, error } = await query;
    if (error) throw error;

    return sendSuccess(res, bookings || [], 'All system bookings retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Get system statistics and real-time operational metrics
 * GET /api/admin/stats
 */
export const getAdminStats = async (req, res, next) => {
  try {
    if (!isSupabaseConfigured) {
      return sendError(res, 'Database service is not configured. Please check server environment.', 503);
    }

    const db = supabaseAdmin || supabase;

    // Total stations count
    const { count: totalStations, error: stationsErr } = await db
      .from('stations')
      .select('*', { count: 'exact', head: true });

    if (stationsErr) throw stationsErr;

    // Total bookings count
    const { count: totalBookings, error: bookingsErr } = await db
      .from('bookings')
      .select('*', { count: 'exact', head: true });

    if (bookingsErr) throw bookingsErr;

    // Confirmed bookings count
    const { count: confirmedBookings, error: confirmedErr } = await db
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'confirmed');

    if (confirmedErr) throw confirmedErr;

    // Charging slots calculation
    const { data: allSlots, error: slotsErr } = await db
      .from('charging_slots')
      .select('id, status');

    if (slotsErr) throw slotsErr;

    const totalSlotsCount = (allSlots || []).length;
    const maintenanceSlots = (allSlots || []).filter((s) => s.status === 'maintenance').length;

    // Active bookings currently reserving a slot (confirmed or non-expired pending)
    const nowIso = new Date().toISOString();
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: activeBookings } = await db
      .from('bookings')
      .select('slot_id')
      .or(`status.eq.confirmed,and(status.eq.pending,created_at.gte.${fifteenMinutesAgo})`)
      .lte('start_time', nowIso)
      .gt('end_time', nowIso);

    const activeSlotSet = new Set((activeBookings || []).map((b) => b.slot_id));

    // Slots currently available
    const availableSlots = (allSlots || []).filter(
      (slot) => slot.status === 'available' && !activeSlotSet.has(slot.id)
    ).length;

    // Confirmed bookings revenue calculation
    const { data: confirmedAmounts } = await db
      .from('bookings')
      .select('amount')
      .eq('status', 'confirmed');

    const totalRevenue = (confirmedAmounts || []).reduce(
      (acc, curr) => acc + (Number(curr.amount) || 0),
      0
    );

    return sendSuccess(
      res,
      {
        total_stations: totalStations || 0,
        total_bookings: totalBookings || 0,
        confirmed_bookings: confirmedBookings || 0,
        available_slots: Math.max(0, availableSlots),
        metrics: {
          total_slots: totalSlotsCount,
          slots_in_maintenance: maintenanceSlots,
          slots_currently_charging: activeSlotSet.size,
          simulated_revenue: Number(totalRevenue.toFixed(2))
        }
      },
      'System operational statistics retrieved successfully.'
    );
  } catch (error) {
    next(error);
  }
};
