import cloudinary, { cloudinaryReady } from '../config/cloudinary.js'
import ApiError from './ApiError.js'

// Uploads an image buffer (from multer memory storage). Returns { url, publicId }.
export function uploadImage(buffer) {
  if (!cloudinaryReady) {
    console.error('Upload attempted but the Cloudinary keys are not set.')
    return Promise.reject(new ApiError(500, 'Image upload is not set up on the server.'))
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'mobile-shop/products',
        resource_type: 'image',
        // never store anything bigger than needed
        transformation: [{ width: 1200, height: 1200, crop: 'limit' }],
      },
      (err, result) => (err ? reject(err) : resolve({ url: result.secure_url, publicId: result.public_id }))
    )
    stream.end(buffer)
  })
}

// Safe to call with an empty id. A failed delete never breaks the request.
export async function deleteImage(publicId) {
  if (!publicId || !cloudinaryReady) return
  try {
    await cloudinary.uploader.destroy(publicId)
  } catch (err) {
    console.error('Cloudinary delete failed:', err.message)
  }
}