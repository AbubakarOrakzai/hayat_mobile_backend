import mongoose from 'mongoose'

const productSchema = new mongoose.Schema(
  {
    brand: { type: String, required: [true, 'Brand is required.'], trim: true, maxlength: 60 },
    model: { type: String, required: [true, 'Model is required.'], trim: true, maxlength: 80 },
    condition: { type: String, enum: ['new', 'used'], default: 'new' },
    category: { type: String, enum: ['phone', 'tablet', 'watch'], default: 'phone' },
    specs: {
      ram: { type: String, default: '', trim: true },
      storage: { type: String, default: '', trim: true },
      color: { type: String, default: '', trim: true },
    },
    description: { type: String, default: '', trim: true, maxlength: 1000 },
    image: { type: String, default: '' }, // Cloudinary https link
    imagePublicId: { type: String, default: '' }, // needed to delete the image later
  },
  { timestamps: true, versionKey: false }
)

export default mongoose.model('Product', productSchema)