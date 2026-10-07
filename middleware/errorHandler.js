import ApiError from '../utils/ApiError.js'

export function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`))
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.status || 500
  let message = err.message

  if (err.name === 'ValidationError') {
    status = 400
    message = Object.values(err.errors).map((e) => e.message).join(' ')
  } else if (err.name === 'CastError') {
    status = 400
    message = 'Invalid id.'
  } else if (err.code === 11000) {
    status = 409
    message = err.keyPattern?.imei ? 'This IMEI is already in the system.' : 'This value already exists.'
  } else if (err.name === 'MulterError') {
    status = 400
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large (max 3 MB).' : err.message
  } else if (err.type === 'entity.parse.failed') {
    status = 400
    message = 'Invalid JSON in request body.'
  }

  if (status >= 500) console.error(err)
  res.status(status).json({ message: status >= 500 ? 'Something went wrong on the server.' : message })
}