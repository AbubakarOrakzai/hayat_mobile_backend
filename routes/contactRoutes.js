import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { create } from '../controllers/contactController.js'

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many messages. Please try again in a minute.' },
})

const router = Router()
router.post('/', limiter, create)
export default router