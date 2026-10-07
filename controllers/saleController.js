import Sale from '../models/Sale.js'
import Device from '../models/Device.js'
import ApiError from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { nextInvoiceNo } from '../utils/invoice.js'
import { payStatus } from '../utils/payStatus.js'
import { num } from '../utils/num.js'

export const list = asyncHandler(async (req, res) => {
  const filter = ['paid', 'pending', 'partial'].includes(req.query.status) ? { paymentStatus: req.query.status } : {}
  res.json(await Sale.find(filter).sort({ soldAt: -1 }).lean())
})

export const create = asyncHandler(async (req, res) => {
  const imei = String(req.body.imei || '')
  const price = num(req.body.salePrice)
  const paid = num(req.body.amountPaid ?? 0)
  const customerName = String(req.body.customerName || '').trim()
  const customerPhone = String(req.body.customerPhone || '').trim()

  if (!(price > 0)) throw new ApiError(400, 'Enter the sale price.')
  if (!(paid >= 0 && paid <= price)) throw new ApiError(400, 'Amount paid must be between 0 and the sale price.')
  if (paid < price && !customerPhone) throw new ApiError(400, 'Customer phone is required when the bill is not fully paid.')

  // Atomic: only one request can flip a device from in_stock to sold.
  const device = await Device.findOneAndUpdate({ imei, status: 'in_stock' }, { status: 'sold' }, { new: true })
    .populate('productId', 'brand model')
  if (!device) {
    const exists = await Device.exists({ imei })
    throw new ApiError(exists ? 409 : 404, exists ? 'This phone is already sold.' : 'This IMEI is not in the system.')
  }

  try {
    const now = new Date()
    const sale = await Sale.create({
      invoiceNo: await nextInvoiceNo(),
      deviceId: device._id,
      imei,
      productName: device.productId ? `${device.productId.brand} ${device.productId.model}` : 'Unknown',
      customerName,
      customerPhone,
      salePrice: price,
      costPrice: device.costPrice, // snapshot
      profit: price - device.costPrice,
      amountPaid: paid,
      paymentStatus: payStatus(price, paid),
      payments: paid > 0 ? [{ amount: paid, date: now }] : [],
      soldAt: now,
    })
    res.status(201).json(sale)
  } catch (err) {
    await Device.updateOne({ _id: device._id }, { status: 'in_stock' }) // put the phone back if the bill failed
    throw err
  }
})

export const recordPayment = asyncHandler(async (req, res) => {
  const amount = num(req.body.amount)
  if (!(amount > 0)) throw new ApiError(400, 'Enter an amount greater than zero.')

  // Only applies if it does not push the total above the bill.
  const sale = await Sale.findOneAndUpdate(
    { _id: req.params.id, $expr: { $lte: [{ $add: ['$amountPaid', amount] }, '$salePrice'] } },
    { $inc: { amountPaid: amount }, $push: { payments: { amount, date: new Date() } } },
    { new: true }
  )
  if (!sale) {
    const s = await Sale.findById(req.params.id).lean()
    if (!s) throw new ApiError(404, 'Bill not found.')
    throw new ApiError(400, `Enter an amount between 1 and ${s.salePrice - s.amountPaid}.`)
  }
  sale.paymentStatus = payStatus(sale.salePrice, sale.amountPaid)
  await sale.save()
  res.json(sale)
})