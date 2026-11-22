import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import GitHubConnection from '../models/GitHubConnection.js'
import { AppError, asyncHandler } from '../utils/errors.js'
import {
  validateLogin,
  validateProfileUpdate,
  validateSignup,
} from '../utils/validation.js'
import { setAuthCookie, csrfCookieOptions } from '../services/authService.js'

const clearAuthCookie = (res) =>
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: process.env.COOKIE_SAME_SITE || 'strict',
    path: '/',
  })

async function userWithGithub(user) {
  const json = user.toJSON()
  try {
    const connection = await GitHubConnection.findOne({ userId: user._id }).select(
      'githubUsername avatarUrl connectedAt status',
    )
    json.github = {
      connected: Boolean(connection && connection.status === 'CONNECTED'),
      status: connection?.status || 'NOT_CONNECTED',
      username: connection?.githubUsername || '',
      avatarUrl: connection?.avatarUrl || '',
      connectedAt: connection?.connectedAt || null,
    }
  } catch {
    json.github = { connected: false, status: 'NOT_CONNECTED' }
  }
  return json
}

export const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = validateSignup(req.body)

  const existing = await User.findOne({ email })
  if (existing) throw new AppError('An account with this email already exists.', 409)

  const user = await User.create({ name, email, password })
  setAuthCookie(res, user._id, false)

  res.status(201).json({
    success: true,
    message: 'Account created successfully.',
    user: await userWithGithub(user),
  })
})

export const login = asyncHandler(async (req, res) => {
  const { email, password, remember } = validateLogin(req.body)

  // select('+password') is required because the field is select:false by default.
  const user = await User.findOne({ email }).select('+password')
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password.', 401)
  }

  setAuthCookie(res, user._id, remember)

  res.status(200).json({
    success: true,
    message: 'Signed in successfully.',
    user: await userWithGithub(user),
  })
})

export const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res)
  res.clearCookie('csrfToken', csrfCookieOptions())
  res.status(200).json({ success: true, message: 'Signed out successfully.' })
})

export const me = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, user: await userWithGithub(req.user) })
})

// Public bootstrap endpoint: returns 200 even when signed out so the client
// doesn't generate a console error on public pages. /me remains protected.
export const session = asyncHandler(async (req, res) => {
  const token = req.cookies?.token
  if (!token) return res.json({ success: true, authenticated: false, user: null })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id)
    if (!user) return res.json({ success: true, authenticated: false, user: null })
    return res.json({ success: true, authenticated: true, user: await userWithGithub(user) })
  } catch {
    return res.json({ success: true, authenticated: false, user: null })
  }
})

export const updateProfile = asyncHandler(async (req, res) => {
  const { name } = validateProfileUpdate(req.body)
  req.user.name = name
  await req.user.save()

  res.status(200).json({
    success: true,
    message: 'Profile updated.',
    user: await userWithGithub(req.user),
  })
})
