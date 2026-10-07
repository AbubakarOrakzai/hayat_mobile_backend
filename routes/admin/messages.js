import { Router } from 'express'
import { list, remove } from '../../controllers/contactController.js'

const router = Router()
router.get('/', list)
router.delete('/:id', remove)
export default router