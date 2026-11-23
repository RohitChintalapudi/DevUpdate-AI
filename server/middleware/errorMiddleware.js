import { AppError } from '../utils/errors.js'

function handleMongooseDuplicate(error) {
  if (error.code === 11000 && error.keyValue?.email) {
    return new AppError('An account with this email already exists.', 409)
  }
  if (error.code === 11000) {
    return new AppError('This record already exists. Refresh and try again.', 409)
  }
  return null
}

function handleValidation(error) {
  if (error.name === 'ValidationError') {
    const message = Object.values(error.errors).map((item) => item.message).join('. ')
    return new AppError(message, 400)
  }
  if (error.name === 'CastError') return new AppError('Invalid resource identifier.', 400)
  return null
}

export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` })
}

export function errorHandler(error, req, res, next) {
  // If headers were already written, pass error to Express default error handler to close socket safely
  if (res.headersSent) {
    return next(error)
  }

  const normalized = handleMongooseDuplicate(error) || handleValidation(error) || error
  const statusCode = normalized.statusCode || (normalized.name === 'JsonWebTokenError' ? 401 : 500)
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'Something went wrong on our end. Please try again later.'
    : normalized.message || 'Internal server error'

  if (statusCode === 500) {
    console.error('[error] Internal server error:', error)
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(error instanceof AppError ? {} : {}),
  })
}
