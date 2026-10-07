import Sale from '../models/Sale.js'
import Loan from '../models/Loan.js'
import Device from '../models/Device.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const sum = (list, key) => list.reduce((t, x) => t + x[key], 0)
const unpaid = { $expr: { $lt: ['$amountPaid', '$salePrice'] } }

// Day boundaries use the server's timezone. Set TZ=Asia/Karachi on the host if needed.
export const getStats = asyncHandler(async (req, res) => {
  const startToday = new Date()
  startToday.setHours(0, 0, 0, 0)
  const from = new Date(startToday)
  from.setDate(from.getDate() - 6)

  const [recent, pendingAgg, loanAgg, stockAgg, recentPending] = await Promise.all([
    Sale.find({ soldAt: { $gte: from } }).lean(),
    Sale.aggregate([
      { $match: unpaid },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: { $subtract: ['$salePrice', '$amountPaid'] } } } },
    ]),
    Loan.aggregate([
      { $match: { status: { $ne: 'paid' } } },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: { $subtract: ['$amount', '$amountReceived'] } } } },
    ]),
    Device.aggregate([
      { $match: { status: 'in_stock' } },
      { $group: { _id: null, count: { $sum: 1 }, value: { $sum: '$costPrice' } } },
    ]),
    Sale.find(unpaid).sort({ soldAt: -1 }).limit(5).lean(),
  ])

  const days = [...Array(7)].map((_, i) => {
    const s = new Date(startToday)
    s.setDate(s.getDate() - (6 - i))
    const e = new Date(s)
    e.setDate(e.getDate() + 1)
    const list = recent.filter((x) => x.soldAt >= s && x.soldAt < e)
    return {
      label: s.toLocaleDateString('en-GB', { weekday: 'short' }),
      revenue: sum(list, 'salePrice'),
      profit: sum(list, 'profit'),
      count: list.length,
    }
  })

  res.json({
    days,
    today: days[6],
    week: { count: sum(days, 'count'), revenue: sum(days, 'revenue'), profit: sum(days, 'profit') },
    pendingBills: { count: pendingAgg[0]?.count ?? 0, amount: pendingAgg[0]?.amount ?? 0 },
    loans: { count: loanAgg[0]?.count ?? 0, amount: loanAgg[0]?.amount ?? 0 },
    stock: { count: stockAgg[0]?.count ?? 0, value: stockAgg[0]?.value ?? 0 },
    recentPending,
  })
})