import { createRemoteJWKSet, jwtVerify, decodeProtectedHeader } from 'jose'
import ApiError from '../utils/ApiError.js'

/*
  Checks the Supabase login token on every /api/admin request.

  Needed in .env / Render:
    SUPABASE_URL          https://<project-ref>.supabase.co
    ADMIN_EMAILS          owner@example.com   (comma separated, only these can use the admin API)
  Only for old projects that still use the legacy shared secret:
    SUPABASE_JWT_SECRET
*/

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '')
const SECRET = process.env.SUPABASE_JWT_SECRET ? new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET) : null
const ALLOWED = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)

const ISSUER = `${SUPABASE_URL}/auth/v1`
const JWKS = SUPABASE_URL ? createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`)) : null

if (!SUPABASE_URL) console.warn('SUPABASE_URL is missing. Every admin request will be refused.')
if (!ALLOWED.length) console.warn('ADMIN_EMAILS is missing. Every admin request will be refused.')

async function verify(token) {
  const { alg } = decodeProtectedHeader(token)
  const base = { issuer: ISSUER, audience: 'authenticated' }

  if (alg === 'HS256') {
    if (!SECRET) throw new Error('Token is HS256 but SUPABASE_JWT_SECRET is not set')
    return (await jwtVerify(token, SECRET, { ...base, algorithms: ['HS256'] })).payload
  }
  return (await jwtVerify(token, JWKS, { ...base, algorithms: ['ES256', 'RS256'] })).payload
}

export async function requireAuth(req, res, next) {
  try {
    // Fail closed: if the server is not configured, nobody gets in.
    if (!SUPABASE_URL || !ALLOWED.length) throw new ApiError(500, 'Authentication is not configured on the server.')

    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!token) throw new ApiError(401, 'Please log in.')

    let payload
    try {
      payload = await verify(token)
    } catch (err) {
      console.error('JWT verify failed:', err.code || err.message)
      throw new ApiError(401, 'Your session has expired. Please log in again.')
    }

    const email = String(payload.email || '').toLowerCase()
    if (!ALLOWED.includes(email)) throw new ApiError(403, 'This account is not allowed to use the admin panel.')

    req.user = { id: payload.sub, email }
    next()
  } catch (err) {
    next(err)
  }
}