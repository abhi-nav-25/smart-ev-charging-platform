import { Router } from 'express';
import { getStations, getStationById } from '../controllers/station.controller.js';

const router = Router();

// Public routes for browsing stations and real-time slot availability
router.get('/', getStations);
router.get('/:id', getStationById);

export default router;
