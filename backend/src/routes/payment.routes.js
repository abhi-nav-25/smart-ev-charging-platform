import { Router } from 'express';
import { simulatePayment } from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// Simulated payment requires user authentication
router.post('/simulate', authenticate, simulatePayment);

export default router;
