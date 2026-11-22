import { AppError } from './errors.js'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function validateSignup(body = {}) {
  const name = cleanString(body.name)
  const email = cleanString(body.email).toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''

  if (!name || name.length < 2) throw new AppError('Please provide your full name.', 400)
  if (name.length > 80) throw new AppError('Name is too long.', 400)
  if (!emailPattern.test(email)) throw new AppError('Please provide a valid email address.', 400)
  if (password.length < 8) throw new AppError('Password must be at least 8 characters.', 400)
  if (password.length > 128) throw new AppError('Password is too long.', 400)

  return { name, email, password }
}

export function validateLogin(body = {}) {
  const email = cleanString(body.email).toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''

  if (!emailPattern.test(email)) throw new AppError('Please provide a valid email address.', 400)
  if (!password) throw new AppError('Please provide your password.', 400)

  return { email, password, remember: Boolean(body.remember) }
}

export function validateProfileUpdate(body = {}) {
  const name = cleanString(body.name)
  if (!name || name.length < 2) throw new AppError('Please provide a valid name.', 400)
  if (name.length > 80) throw new AppError('Name is too long.', 400)
  return { name }
}
