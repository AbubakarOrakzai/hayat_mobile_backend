// AUTH IS NOT BUILT YET.
// This is an empty placeholder so the admin routes already point at it.
// When we add Supabase, verify the token here and call next() only if it is valid.
// Until then, anyone who can reach /api/admin can change data.
// Do NOT deploy to the internet before this is done.
export function requireAuth(req, res, next) {
  next()
}