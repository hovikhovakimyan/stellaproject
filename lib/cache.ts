// Simple in-memory cache with timestamps for TTL
interface CacheEntry<T> {
  data: T
  timestamp: number
}

class ClientCache {
  private cache = new Map<string, CacheEntry<any>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes default

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  get<T>(key: string, ttl?: number): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const maxAge = ttl ?? this.defaultTTL
    const age = Date.now() - entry.timestamp

    if (age > maxAge) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  invalidate(key: string): void {
    this.cache.delete(key)
  }

  invalidatePattern(pattern: string): void {
    const keys = Array.from(this.cache.keys())
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    })
  }

  clear(): void {
    this.cache.clear()
  }
}

export const cache = new ClientCache()
