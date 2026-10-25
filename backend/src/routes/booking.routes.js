import { Router } from 'express';
import {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking
} from '../controllers/booking.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// All booking operations require valid authentication
router.use(authenticate);

router.post('/', createBooking);
router.get('/my', getMyBookings);
router.get('/:id', getBookingById);
router.patch('/:id/cancel', cancelBooking);

export default router;
