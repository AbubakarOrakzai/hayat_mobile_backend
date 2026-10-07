import mongoose from 'mongoose'

export default async function connectDB() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is missing. Add it to backend/.env')
    process.exit(1)
  }
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`)
  } catch (err) {
    console.error('MongoDB connection failed:', err.message)
    process.exit(1)
  }
}