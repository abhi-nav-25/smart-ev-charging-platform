import { supabaseAdmin, supabase } from '../config/supabase.js';

/**
 * Service to handle Station queries and dynamic real-time slot availability
 */
export const stationService = {
  /**
   * Get all stations with optional search and live available slot calculation
   */
  async getStations({ search }) {
    const db = supabaseAdmin || supabase;
    let query = db
      .from('stations')
      .select(`
        id,
        name,
        address,
        latitude,
        longitude,
        connector_type,
        price_per_kwh,
        total_slots,
        status,
        created_at,
        charging_slots (
          id,
          slot_number,
          connector_type,
          power_output_kw,
          status
        )
      `)
      .order('name', { ascending: true });

    if (search && search.trim() !== '') {
      const term = search.trim();
      query = query.or(`name.ilike.%${term}%,address.ilike.%${term}%`);
    }

    const { data: stations, error } = await query;
    if (error) throw error;

    // Fetch active reservations right now:
    // Confirmed bookings OR pending bookings created within the last 15 minutes
    const nowIso = new Date().toISOString();
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: activeBookings } = await db
      .from('bookings')
      .select('slot_id, status, created_at')
      .or(`status.eq.confirmed,and(status.eq.pending,created_at.gte.${fifteenMinutesAgo})`)
      .lte('start_time', nowIso)
      .gt('end_time', nowIso);

    const busySlotIds = new Set((activeBookings || []).map((b) => b.slot_id));

    // Calculate available slots dynamically
    const formattedStations = (stations || []).map((station) => {
      const slots = station.charging_slots || [];
      const availableCount = slots.filter(
        (slot) => slot.status === 'available' && !busySlotIds.has(slot.id)
      ).length;

      return {
        id: station.id,
        name: station.name,
        address: station.address,
        latitude: station.latitude,
        longitude: station.longitude,
        connector_type: station.connector_type,
        price_per_kwh: Number(station.price_per_kwh),
        total_slots: station.total_slots || slots.length,
        available_slots: Math.max(0, availableCount),
        status: station.status,
        created_at: station.created_at
      };
    });

    return formattedStations;
  },

  /**
   * Get a single station with full slot breakdown
   */
  async getStationById(id) {
    const db = supabaseAdmin || supabase;
    const { data: station, error } = await db
      .from('stations')
      .select(`
        id,
        name,
        address,
        latitude,
        longitude,
        connector_type,
        price_per_kwh,
        total_slots,
        status,
        created_at,
        charging_slots (
          id,
          slot_number,
          connector_type,
          power_output_kw,
          status
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    const nowIso = new Date().toISOString();
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: activeBookings } = await db
      .from('bookings')
      .select('slot_id, status, created_at')
      .eq('station_id', id)
      .or(`status.eq.confirmed,and(status.eq.pending,created_at.gte.${fifteenMinutesAgo})`)
      .lte('start_time', nowIso)
      .gt('end_time', nowIso);

    const busySlotIds = new Set((activeBookings || []).map((b) => b.slot_id));

    const enrichedSlots = (station.charging_slots || [])
      .map((slot) => ({
        ...slot,
        power_output_kw: Number(slot.power_output_kw),
        is_currently_occupied: busySlotIds.has(slot.id) || slot.status === 'occupied',
        real_time_status: busySlotIds.has(slot.id) ? 'occupied' : slot.status
      }))
      .sort((a, b) => a.slot_number - b.slot_number);

    const availableCount = enrichedSlots.filter(
      (s) => s.real_time_status === 'available'
    ).length;

    return {
      id: station.id,
      name: station.name,
      address: station.address,
      latitude: station.latitude,
      longitude: station.longitude,
      connector_type: station.connector_type,
      price_per_kwh: Number(station.price_per_kwh),
      total_slots: station.total_slots || enrichedSlots.length,
      available_slots: availableCount,
      status: station.status,
      charging_slots: enrichedSlots,
      created_at: station.created_at
    };
  }
};
