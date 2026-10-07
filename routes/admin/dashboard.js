import { Router } from 'express'
import { getStats } from '../../controllers/dashboardController.js'

const router = Router()
router.get('/', getStats)
export default router