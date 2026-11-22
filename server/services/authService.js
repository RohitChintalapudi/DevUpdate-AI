import jwt from 'jsonwebtoken'

function getSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined. Add it to server/.env')
  }
  return process.env.JWT_SECRET
}

export function signToken(userId) {
  return jwt.sign({ id: userId }, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

export function cookieOptions(remember = false) {
  const maxAge = (remember ? 30 : 7) * 24 * 60 * 60 * 1000
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: process.env.COOKIE_SAME_SITE || 'strict',
    maxAge,
    path: '/',
  }
}

export function csrfCookieOptions() {
  return {
    httpOnly: false,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: process.env.COOKIE_SAME_SITE || 'strict',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  }
}

export function setAuthCookie(res, userId, remember = false) {
  res.cookie('token', signToken(userId), cookieOptions(remember))
}
