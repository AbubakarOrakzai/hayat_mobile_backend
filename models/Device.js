import mongoose from 'mongoose'
import { isValidImei } from '../utils/imei.js'

// One physical phone. It has its own IMEI and its own prices.
const deviceSchema = new mongoose.Schema(
  {
    imei: {
      type: String, required: true, unique: true, trim: true,
      validate: { validator: isValidImei, message: 'Invalid IMEI. It must be 15 digits and pass the checksum.' },
    },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    costPrice: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['in_stock', 'sold'], default: 'in_stock', index: true },
  },
  { timestamps: true, versionKey: false }
)

export default mongoose.model('Device', deviceSchema)