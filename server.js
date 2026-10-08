import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import connectDB from './config/db.js'
import productRoutes from './routes/productRoutes.js'
import contactRoutes from './routes/contactRoutes.js'
import adminRoutes from './routes/admin/index.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'

const app = express()
app.set('trust proxy', 1) // Render sits behind a proxy

const origins = (process.env.CLIENT_ORIGINS || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((s) => s.trim().replace(/\/$/, ''))

app.use(helmet())
app.use(cors({ origin: origins }))
app.use(express.json({ limit: '100kb' }))

app.get('/api/health', (req, res) => res.json({ ok: true }))
app.use('/api/products', productRoutes)   // public
app.use('/api/contact', contactRoutes)    // public
app.use('/api/admin', adminRoutes)        // owner only (auth comes later)

app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 5000
connectDB().then(() => {
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`))
})