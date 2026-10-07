import { Router } from 'express'
import { listPublic, getPublic } from '../controllers/productController.js'

const router = Router()
router.get('/', listPublic)
router.get('/:id', getPublic)
export default router