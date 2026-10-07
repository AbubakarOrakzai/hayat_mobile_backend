import Device from '../models/Device.js'
import Product from '../models/Product.js'
import ApiError from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { isValidImei } from '../utils/imei.js'
import { num } from '../utils/num.js'

const POPULATE = 'brand model specs condition'

const shape = (d) => {
  const p = d.productId && d.productId._id ? d.productId : null
  return {
    _id: d._id,
    imei: d.imei,
    productId: p ? p._id : d.productId,
    productName: p ? `${p.brand} ${p.model}` : 'Unknown',
    specs: p?.specs,
    condition: p?.condition,
    costPrice: d.costPrice,
    salePrice: d.salePrice,
    status: d.status,
    addedAt: d.createdAt,
  }
}

export const list = asyncHandler(async (req, res) => {
  const devices = await Device.find().populate('productId', POPULATE).sort({ createdAt: -1 }).lean()
  res.json(devices.map(shape))
})

export const getByImei = asyncHandler(async (req, res) => {
  const d = await Device.findOne({ imei: req.params.imei }).populate('productId', POPULATE).lean()
  if (!d) throw new ApiError(404, 'This IMEI is not in the system.')
  res.json(shape(d))
})

export const create = asyncHandler(async (req, res) => {
  const { imei, productId } = req.body
  const costPrice = num(req.body.costPrice)
  const salePrice = num(req.body.salePrice)

  if (!isValidImei(imei)) throw new ApiError(400, 'Invalid IMEI. It must be 15 digits and pass the checksum.')
  if (!(costPrice >= 0) || !(salePrice > 0)) throw new ApiError(400, 'Enter the cost price and the sale price.')
  if (!productId || !(await Product.exists({ _id: productId }))) throw new ApiError(400, 'Choose a product first.')

  const d = await Device.create({ imei, productId, costPrice, salePrice }) // duplicate IMEI -> 409 in errorHandler
  const full = await Device.findById(d._id).populate('productId', POPULATE).lean()
  res.status(201).json(shape(full))
})

export const updatePrices = asyncHandler(async (req, res) => {
  const costPrice = num(req.body.costPrice)
  const salePrice = num(req.body.salePrice)
  if (!(costPrice >= 0) || !(salePrice > 0)) throw new ApiError(400, 'Enter the cost price and the sale price.')

  const d = await Device.findOneAndUpdate(
    { _id: req.params.id, status: 'in_stock' },
    { costPrice, salePrice },
    { new: true, runValidators: true }
  ).populate('productId', POPULATE).lean()

  if (!d) {
    const exists = await Device.exists({ _id: req.params.id })
    throw new ApiError(exists ? 409 : 404, exists ? 'A sold device cannot be edited.' : 'Device not found.')
  }
  res.json(shape(d))
})

export const remove = asyncHandler(async (req, res) => {
  const d = await Device.findOneAndDelete({ _id: req.params.id, status: 'in_stock' })
  if (!d) {
    const exists = await Device.exists({ _id: req.params.id })
    throw new ApiError(exists ? 409 : 404, exists ? 'A sold device is part of a bill and cannot be deleted.' : 'Device not found.')
  }
  res.json({ ok: true })
})