type RateLimitState = {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitState>()

type RateLimitInput = {
  key: string
  limit: number
  windowMs: number
}

export function getRequestIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

export function checkRateLimit({ key, limit, windowMs }: RateLimitInput) {
  const now = Date.now()
  const current = store.get(key)

  if (!current || now >= current.resetAt) {
    const nextState: RateLimitState = { count: 1, resetAt: now + windowMs }
    store.set(key, nextState)
    return { allowed: true, remaining: limit - 1, resetAt: nextState.resetAt }
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt }
  }

  current.count += 1
  store.set(key, current)
  return { allowed: true, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt }
}

