import fs from 'fs/promises'
import path from 'path'
import Product from '../models/Product.js'
import Device from '../models/Device.js'
import ApiError from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { UPLOAD_DIR } from '../middleware/upload.js'

/* ---------- helpers ---------- */

const imageUrl = (req, image) => {
  if (!image) return ''
  if (/^(https?:|data:)/.test(image)) return image
  const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`
  return base + image
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

const shape = (req, p, s, admin = false) => ({
  _id: p._id,
  brand: p.brand,
  model: p.model,
  condition: p.condition,
  category: p.category,
  specs: p.specs,
  description: p.description,
  image: imageUrl(req, p.image),
  price: s?.price ?? 0,
  stock: s?.stock ?? 0,
  ...(admin ? { total: s?.total ?? 0 } : {}),
})

const removeFile = async (image) => {
  if (!image || !image.startsWith('/uploads/')) return
  try { await fs.unlink(path.join(UPLOAD_DIR, path.basename(image))) } catch { /* already gone */ }
}

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
  res.json(products.filter((p) => stats.get(String(p._id))?.total > 0).map((p) => shape(req, p, stats.get(String(p._id)))))
})

export const getPublic = asyncHandler(async (req, res) => {
  const p = await Product.findById(req.params.id).lean()
  const stats = await stockMap()
  const s = p && stats.get(String(p._id))
  if (!p || !s?.total) throw new ApiError(404, 'Product not found.')
  res.json(shape(req, p, s))
})

/* ---------- admin ---------- */

export const listAdmin = asyncHandler(async (req, res) => {
  const [products, stats] = await Promise.all([Product.find().sort({ brand: 1, model: 1 }).lean(), stockMap()])
  res.json(products.map((p) => shape(req, p, stats.get(String(p._id)), true)))
})

export const getAdmin = asyncHandler(async (req, res) => {
  const p = await Product.findById(req.params.id).lean()
  if (!p) throw new ApiError(404, 'Product not found.')
  const stats = await stockMap()
  res.json(shape(req, p, stats.get(String(p._id)), true))
})

export const create = asyncHandler(async (req, res) => {
  const image = req.file ? `/uploads/${req.file.filename}` : ''
  try {
    const p = await Product.create({ ...readBody(req.body), image })
    res.status(201).json(shape(req, p.toObject(), null, true))
  } catch (err) {
    await removeFile(image) // do not keep an upload for a product that failed to save
    throw err
  }
})

export const update = asyncHandler(async (req, res) => {
  const p = await Product.findById(req.params.id)
  if (!p) {
    if (req.file) await removeFile(`/uploads/${req.file.filename}`)
    throw new ApiError(404, 'Product not found.')
  }
  const oldImage = p.image
  p.set(readBody(req.body))
  if (req.file) p.image = `/uploads/${req.file.filename}`
  else if (req.body.removeImage === 'true') p.image = ''

  try {
    await p.save()
  } catch (err) {
    if (req.file) await removeFile(`/uploads/${req.file.filename}`)
    throw err
  }
  if (p.image !== oldImage) await removeFile(oldImage)
  const stats = await stockMap()
  res.json(shape(req, p.toObject(), stats.get(String(p._id)), true))
})

export const remove = asyncHandler(async (req, res) => {
  const p = await Product.findById(req.params.id)
  if (!p) throw new ApiError(404, 'Product not found.')
  if (await Device.exists({ productId: p._id })) {
    throw new ApiError(409, 'This product has devices in the system, so it cannot be deleted.')
  }
  await p.deleteOne()
  await removeFile(p.image)
  res.json({ ok: true })
})