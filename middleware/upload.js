import multer from 'multer'

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

// The file stays in memory and is sent straight to Cloudinary.
// Nothing is written to the server's disk.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) return cb(null, true)
    cb(Object.assign(new Error('Only JPG, PNG or WebP images are allowed.'), { status: 400 }))
  },
})