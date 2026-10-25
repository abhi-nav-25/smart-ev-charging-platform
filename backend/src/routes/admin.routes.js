import { Router } from 'express';
import {
  createStation,
  updateStation,
  getAllBookings,
  getAdminStats
} from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();

// All admin routes strictly require authentication AND database admin role
router.use(authenticate, requireAdmin);

router.post('/stations', createStation);
router.patch('/stations/:id', updateStation);
router.get('/bookings', getAllBookings);
router.get('/stats', getAdminStats);

export default router;
