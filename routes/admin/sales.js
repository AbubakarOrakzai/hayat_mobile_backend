import { Router } from 'express'
import { list, create, recordPayment } from '../../controllers/saleController.js'

const router = Router()
router.get('/', list)
router.post('/', create)
router.patch('/:id/payment', recordPayment)
export default router