import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.js'
import products from './products.js'
import devices from './devices.js'
import sales from './sales.js'
import loans from './loans.js'
import dashboard from './dashboard.js'
import messages from './messages.js'

// Every route below is for the shop owner only.
const router = Router()
router.use(requireAuth)
router.use('/products', products)
router.use('/devices', devices)
router.use('/sales', sales)
router.use('/loans', loans)
router.use('/dashboard', dashboard)
router.use('/messages', messages)
export default router