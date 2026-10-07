import mongoose from 'mongoose'

const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } }, { versionKey: false })
export default mongoose.model('Counter', counterSchema)