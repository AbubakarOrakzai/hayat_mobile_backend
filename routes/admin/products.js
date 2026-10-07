import { Router } from 'express'
import { upload } from '../../middleware/upload.js'
import { listAdmin, getAdmin, create, update, remove } from '../../controllers/productController.js'

const router = Router()
router.get('/', listAdmin)
router.get('/:id', getAdmin)
router.post('/', upload.single('image'), create)
router.put('/:id', upload.single('image'), update)
router.delete('/:id', remove)
export default router