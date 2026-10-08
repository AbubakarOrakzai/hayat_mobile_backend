import Product from '../models/Product.js'
import Device from '../models/Device.js'
import ApiError from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { uploadImage, deleteImage } from '../utils/cloudinaryupload.js'

/* ---------- helpers ---------- */

// Cloudinary links get automatic format and quality, so photos load faster on phones.
const imageUrl = (image) => {
  if (!image) return ''
  if (image.includes('res.cloudinary.com') && image.includes('/upload/')) {
    return image.replace('/upload/', '/upload/f_auto,q_auto/')
  }
  return image
}

// Per product: how many devices exist, how many are in stock, lowest in-stock price.
async function stockMap() {
  const rows = await Device.aggregate([
    {
      $group: {
        _id: '$productId',
        total: { $sum: 1 },
        stock: { $sum: { $cond: [{ $eq: ['$status', 'in_stock'] }, 1, 0] } },
        price: { $min: { $cond: [{ $eq: ['$status', 'in_stock'] }, '$salePrice', null] } },
      },
    },
  ])
  return new Map(rows.map((r) => [String(r._id), r]))
}

const shape = (p, s, admin = false) => ({
  _id: p._id,
  brand: p.brand,
  model: p.model,
  condition: p.condition,
  category: p.category,
  specs: p.specs,
  description: p.description,
  image: imageUrl(p.image),
  price: s?.price ?? 0,
  stock: s?.stock ?? 0,
  ...(admin ? { total: s?.total ?? 0 } : {}),
})

function readBody(body) {
  let specs = body.specs
  if (typeof specs === 'string') { try { specs = JSON.parse(specs) } catch { specs = {} } }
  specs = specs || {}
  const data = {
    brand: body.brand,
    model: body.model,
    condition: body.condition,
    category: body.category,
    description: body.description,
    specs: { ram: specs.ram ?? '', storage: specs.storage ?? '', color: specs.color ?? '' },
  }
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
}

/* ---------- public (customer website) ---------- */
// Never returns IMEIs or cost prices. Products that never had a device are hidden.

export const listPublic = asyncHandler(async (req, res) => {
  const [products, stats] = await Promise.all([Product.find().sort({ brand: 1, model: 1 }).lean(), stockMap()])
  res.json(products.filter((p) => stats.get(String(p._id))?.total > 0).map((p) => shape(p, stats.get(String(p._id)))))
})

export const getPublic = asyncHandler(async (req, res) => {
  const p = await Product.findById(req.params.id).lean()
  const stats = await stockMap()
  const s = p && stats.get(String(p._id))
  if (!p || !s?.total) throw new ApiError(404, 'Product not found.')
  res.json(shape(p, s))
})

/* ---------- admin ---------- */

export const listAdmin = asyncHandler(async (req, res) => {
  const [products, stats] = await Promise.all([Product.find().sort({ brand: 1, model: 1 }).lean(), stockMap()])
  res.json(products.map((p) => shape(p, stats.get(String(p._id)), true)))
})

export const getAdmin = asyncHandler(async (req, res) => {
  const p = await Product.findById(req.params.id).lean()
  if (!p) throw new ApiError(404, 'Product not found.')
  const stats = await stockMap()
  res.json(shape(p, stats.get(String(p._id)), true))
})

export const create = asyncHandler(async (req, res) => {
  const p = new Product(readBody(req.body))
  await p.validate() // check the text fields before spending an upload

  if (req.file) {
    const up = await uploadImage(req.file.buffer)
    p.image = up.url
    p.imagePublicId = up.publicId
  }

  try {
    await p.save()
  } catch (err) {
    await deleteImage(p.imagePublicId) // do not leave an orphan image in Cloudinary
    throw err
  }
  res.status(201).json(shape(p.toObject(), null, true))
})

export const update = asyncHandler(async (req, res) => {
  const p = await Product.findById(req.params.id)
  if (!p) throw new ApiError(404, 'Product not found.')

  const oldPublicId = p.imagePublicId
  p.set(readBody(req.body))
  await p.validate()

  let uploaded = null
  if (req.file) {
    uploaded = await uploadImage(req.file.buffer)
    p.image = uploaded.url
    p.imagePublicId = uploaded.publicId
  } else if (req.body.removeImage === 'true') {
    p.image = ''
    p.imagePublicId = ''
  }

  try {
    await p.save()
  } catch (err) {
    if (uploaded) await deleteImage(uploaded.publicId)
    throw err
  }

  if (oldPublicId && oldPublicId !== p.imagePublicId) await deleteImage(oldPublicId)
  const stats = await stockMap()
  res.json(shape(p.toObject(), stats.get(String(p._id)), true))
})

export const remove = asyncHandler(async (req, res) => {
  const p = await Product.findById(req.params.id)
  if (!p) throw new ApiError(404, 'Product not found.')
  if (await Device.exists({ productId: p._id })) {
    throw new ApiError(409, 'This product has devices in the system, so it cannot be deleted.')
  }
  await p.deleteOne()
  await deleteImage(p.imagePublicId)
  res.json({ ok: true })
})