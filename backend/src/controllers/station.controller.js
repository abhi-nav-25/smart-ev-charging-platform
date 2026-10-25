import { stationService } from '../services/station.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { isValidUUID } from '../utils/validator.js';
import { isSupabaseConfigured } from '../config/supabase.js';

/**
 * List all charging stations with optional ?search= filter
 * GET /api/stations
 */
export const getStations = async (req, res, next) => {
  try {
    if (!isSupabaseConfigured) {
      return sendError(res, 'Database service is not configured. Please check server environment.', 503);
    }

    const { search } = req.query;
    const stations = await stationService.getStations({ search });

    return sendSuccess(res, stations, 'Charging stations retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Get station details by ID
 * GET /api/stations/:id
 */
export const getStationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return sendError(res, 'Invalid station ID format. Must be a valid UUID.', 400);
    }

    if (!isSupabaseConfigured) {
      return sendError(res, 'Database service is not configured. Please check server environment.', 503);
    }

    const station = await stationService.getStationById(id);
    if (!station) {
      return sendError(res, 'Charging station not found.', 404);
    }

    return sendSuccess(res, station, 'Station details retrieved successfully.');
  } catch (error) {
    next(error);
  }
};
