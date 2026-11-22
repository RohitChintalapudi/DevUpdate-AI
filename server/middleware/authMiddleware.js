import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { AppError, asyncHandler } from '../utils/errors.js'

export const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.token
  if (!token) throw new AppError('You are not signed in.', 401)

  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    throw new AppError('Your session is invalid or has expired. Please sign in again.', 401)
  }

  const user = await User.findById(decoded.id)
  if (!user) throw new AppError('This account no longer exists.', 401)

  req.user = user
  next()
})
