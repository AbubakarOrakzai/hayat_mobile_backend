import Message from '../models/Message.js'
import ApiError from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'

// Public: the website contact form.
export const create = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim()
  const phone = String(req.body.phone || '').trim()
  const message = String(req.body.message || '').trim()

  if (!name || !phone || !message) throw new ApiError(400, 'Name, phone and message are required.')
  if (name.length > 100 || phone.length > 30 || message.length > 2000) throw new ApiError(400, 'One of the fields is too long.')

  await Message.create({ name, phone, message })
  res.status(201).json({ ok: true })
})

// Admin: read and delete messages.
export const list = asyncHandler(async (req, res) => {
  const messages = await Message.find().sort({ createdAt: -1 }).lean()
  res.json(messages.map((m) => ({ _id: m._id, name: m.name, phone: m.phone, message: m.message, date: m.createdAt })))
})

export const remove = asyncHandler(async (req, res) => {
  const m = await Message.findByIdAndDelete(req.params.id)
  if (!m) throw new ApiError(404, 'Message not found.')
  res.json({ ok: true })
})