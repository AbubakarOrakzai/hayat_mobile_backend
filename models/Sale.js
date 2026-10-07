import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema(
  { amount: { type: Number, required: true, min: 1 }, date: { type: Date, default: Date.now } },
  { _id: false }
)

// One bill. Prices are copied from the device at sale time (snapshot),
// so old profit figures stay correct if prices change later.
const saleSchema = new mongoose.Schema(
  {
    invoiceNo: { type: String, required: true, unique: true },
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
    imei: { type: String, required: true, index: true },
    productName: { type: String, required: true },
    customerName: { type: String, default: '', trim: true, maxlength: 100 },
    customerPhone: { type: String, default: '', trim: true, maxlength: 30 },
    salePrice: { type: Number, required: true, min: 1 },
    costPrice: { type: Number, required: true, min: 0 },
    profit: { type: Number, required: true },
    amountPaid: { type: Number, default: 0, min: 0 },
    paymentStatus: { type: String, enum: ['paid', 'pending', 'partial'], required: true, index: true },
    payments: { type: [paymentSchema], default: [] },
    soldAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
)

export default mongoose.model('Sale', saleSchema)