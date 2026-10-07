import { Router } from 'express'
import { list, getByImei, create, updatePrices, remove } from '../../controllers/deviceController.js'

const router = Router()
router.get('/', list)
router.get('/imei/:imei', getByImei)
router.post('/', create)
router.put('/:id', updatePrices)
router.delete('/:id', remove)
export default router