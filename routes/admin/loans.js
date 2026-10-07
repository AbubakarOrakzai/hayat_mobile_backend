import { Router } from 'express'
import { list, create, recordRepayment } from '../../controllers/loanController.js'

const router = Router()
router.get('/', list)
router.post('/', create)
router.patch('/:id/payment', recordRepayment)
export default router