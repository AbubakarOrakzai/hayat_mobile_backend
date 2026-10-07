// Fills the database with sample data. Run: npm run seed
// WARNING: deletes products, devices, sales, loans and messages first.
import 'dotenv/config'
import mongoose from 'mongoose'
import connectDB from '../config/db.js'
import Product from '../models/Product.js'
import Device from '../models/Device.js'
import Sale from '../models/Sale.js'
import Loan from '../models/Loan.js'
import Message from '../models/Message.js'
import Counter from '../models/Counter.js'
import { withCheck } from '../utils/imei.js'
import { payStatus } from '../utils/payStatus.js'

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed in production.')
  process.exit(1)
}

const DAY = 86400000
const ago = (d) => new Date(Date.now() - d * DAY - (d === 0 ? 60000 : 0))
const inDays = (d) => new Date(Date.now() + d * DAY).toISOString().slice(0, 10)
const specs = (ram, storage, color) => ({ ram, storage, color })

await connectDB()
await Promise.all([Product, Device, Sale, Loan, Message, Counter].map((M) => M.deleteMany({})))

const products = await Product.insertMany([
  { brand: 'Samsung', model: 'Galaxy A15', condition: 'new', specs: specs('6 GB', '128 GB', 'Blue Black'), description: 'Super AMOLED display, 5000 mAh battery and a 50 MP main camera.' },
  { brand: 'Samsung', model: 'Galaxy S23', condition: 'used', specs: specs('8 GB', '256 GB', 'Phantom Black'), description: 'Flagship performance at a used price. Battery health above 90%.' },
  { brand: 'Apple', model: 'iPhone 13', condition: 'used', specs: specs('4 GB', '128 GB', 'Midnight'), description: 'PTA approved. Face ID, dual camera and A15 Bionic.' },
  { brand: 'Apple', model: 'iPhone 15', condition: 'new', specs: specs('6 GB', '128 GB', 'Pink'), description: 'Sealed box, PTA approved. USB-C and a 48 MP camera.' },
  { brand: 'Xiaomi', model: 'Redmi Note 13', condition: 'new', specs: specs('8 GB', '128 GB', 'Ice Blue'), description: '120 Hz AMOLED screen and a 108 MP camera.' },
  { brand: 'Infinix', model: 'Hot 40 Pro', condition: 'new', specs: specs('8 GB', '256 GB', 'Starlit Black'), description: 'Big storage on a small budget, with fast charging.' },
])
const [a15, s23, ip13, ip15, redmi, hot] = products

let n = 0
const imei = () => withCheck('3568' + String(++n).padStart(10, '0'))

const stock = [[a15, 3, 41000, 46500], [s23, 1, 115000, 128000], [ip13, 2, 128000, 142000], [ip15, 2, 265000, 285000], [redmi, 4, 47000, 52000], [hot, 3, 30000, 34500]]
for (const [p, count, cost, price] of stock) {
  for (let i = 0; i < count; i++) {
    await Device.create({ imei: imei(), productId: p._id, costPrice: cost, salePrice: price, status: 'in_stock', createdAt: ago(10 + i) })
  }
}

// oldest first so invoice numbers go up with the date
const sold = [
  [hot, 30000, 34500, 6, 34500, 'Zain Malik', '0300-5556667'],
  [ip15, 265000, 285000, 5, 285000, 'Farhan Iqbal', '0345-6667778'],
  [a15, 41000, 46500, 4, 46500, 'Imran Shah', '0302-7778889'],
  [redmi, 47000, 52000, 3, 52000, 'Asad Mehmood', '0322-8889990'],
  [ip13, 128000, 142000, 2, 0, 'Bilal Sheikh', '0333-4445556'],
  [hot, 30000, 34500, 1, 34500, 'Hamza Ahmed', '0321-3334445'],
  [redmi, 47000, 52000, 0, 30000, 'Usman Khan', '0311-2223334'],
  [a15, 41000, 46500, 0, 46500, 'Ali Raza', '0300-1112223'],
]
let invoice = 0
for (const [p, cost, price, days, paid, name, phone] of sold) {
  const code = imei()
  const dev = await Device.create({ imei: code, productId: p._id, costPrice: cost, salePrice: price, status: 'sold', createdAt: ago(days + 5) })
  const soldAt = ago(days)
  await Sale.create({
    invoiceNo: 'INV-' + String(++invoice).padStart(4, '0'), deviceId: dev._id, imei: code,
    productName: `${p.brand} ${p.model}`, customerName: name, customerPhone: phone,
    salePrice: price, costPrice: cost, profit: price - cost, amountPaid: paid,
    paymentStatus: payStatus(price, paid), payments: paid > 0 ? [{ amount: paid, date: soldAt }] : [], soldAt,
  })
}
await Counter.create({ _id: 'invoice', seq: invoice })

await Loan.create([
  { personName: 'Khalid Mehmood', phone: '0300-9998887', amount: 50000, amountReceived: 20000, status: 'partial', dueDate: inDays(10), notes: 'Shop rent help', payments: [{ amount: 20000, date: ago(8) }], createdAt: ago(20) },
  { personName: 'Tariq Hussain', phone: '0311-1110009', amount: 15000, amountReceived: 0, status: 'pending', dueDate: inDays(-5), createdAt: ago(15) },
  { personName: 'Saeed Anwar', phone: '0333-2221110', amount: 30000, amountReceived: 30000, status: 'paid', dueDate: inDays(-12), notes: 'Paid back in full', payments: [{ amount: 30000, date: ago(14) }], createdAt: ago(40) },
])

await Message.create([
  { name: 'Rehan Ali', phone: '0300-1239876', message: 'Do you have the iPhone 15 in black? Please tell me the price.', createdAt: ago(1) },
  { name: 'Sana Tariq', phone: '0321-5554443', message: 'Do you buy old phones? I want to exchange my Samsung A12.', createdAt: ago(3) },
])

console.log('Seed finished: 6 products, 28 devices, 8 sales, 3 loans, 2 messages.')
await mongoose.disconnect()