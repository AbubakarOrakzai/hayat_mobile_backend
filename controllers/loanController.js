import Loan from '../models/Loan.js'
import ApiError from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { payStatus } from '../utils/payStatus.js'
import { num } from '../utils/num.js'

export const list = asyncHandler(async (req, res) => {
  const filter = ['pending', 'partial', 'paid'].includes(req.query.status) ? { status: req.query.status } : {}
  res.json(await Loan.find(filter).sort({ createdAt: -1 }).lean())
})

export const create = asyncHandler(async (req, res) => {
  const { personName = '', phone = '', dueDate = '', notes = '' } = req.body
  const amount = num(req.body.amount)
  if (!String(personName).trim()) throw new ApiError(400, 'Enter the person\u2019s name.')
  if (!(amount > 0)) throw new ApiError(400, 'Enter the loan amount.')
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new ApiError(400, 'Due date must look like 2026-12-31.')

  const loan = await Loan.create({ personName, phone, amount, dueDate, notes })
  res.status(201).json(loan)
})

// There is no delete for loans. A repayment only changes the status.
export const recordRepayment = asyncHandler(async (req, res) => {
  const amount = num(req.body.amount)
  if (!(amount > 0)) throw new ApiError(400, 'Enter an amount greater than zero.')

  const loan = await Loan.findOneAndUpdate(
    { _id: req.params.id, $expr: { $lte: [{ $add: ['$amountReceived', amount] }, '$amount'] } },
    { $inc: { amountReceived: amount }, $push: { payments: { amount, date: new Date() } } },
    { new: true }
  )
  if (!loan) {
    const l = await Loan.findById(req.params.id).lean()
    if (!l) throw new ApiError(404, 'Loan not found.')
    throw new ApiError(400, `Enter an amount between 1 and ${l.amount - l.amountReceived}.`)
  }
  loan.status = payStatus(loan.amount, loan.amountReceived)
  await loan.save()
  res.json(loan)
})