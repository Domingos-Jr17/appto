// In-memory cache for AI responses (expires after 1 hour)
// In production, use Redis or similar

interface CacheEntry {
  response: string;
  timestamp: number;
  hits: number;
}

const aiCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_CACHE_SIZE = 1000; // Maximum number of cached entries

export function generateCacheKey(action: string, input: string): string {
  // Normalize input for better cache hits
  const normalizedInput = input.toLowerCase().trim().slice(0, 500);
  return `${action}:${hashString(normalizedInput)}`;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

export function getCachedResponse(key: string): string | null {
  const entry = aiCache.get(key);
  
  if (!entry) return null;
  
  // Check if expired
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    aiCache.delete(key);
    return null;
  }
  
  // Increment hit counter
  entry.hits++;
  
  return entry.response;
}

export function setCachedResponse(key: string, response: string): void {
  // Evict old entries if cache is full
  if (aiCache.size >= MAX_CACHE_SIZE) {
    evictOldEntries();
  }
  
  aiCache.set(key, {
    response,
    timestamp: Date.now(),
    hits: 0,
  });
}

function evictOldEntries(): void {
  // Remove 20% of least recently used entries
  const entries = Array.from(aiCache.entries())
    .sort((a, b) => a[1].hits - b[1].hits);
  
  const toRemove = Math.floor(MAX_CACHE_SIZE * 0.2);
  for (let i = 0; i < toRemove && i < entries.length; i++) {
    aiCache.delete(entries[i][0]);
  }
}

export function getCacheStats() {
  return {
    size: aiCache.size,
    maxSize: MAX_CACHE_SIZE,
    entries: Array.from(aiCache.entries()).map(([key, entry]) => ({
      key: key.slice(0, 20) + '...',
      hits: entry.hits,
      age: Math.round((Date.now() - entry.timestamp) / 1000 / 60), // minutes
    })),
  };
}

export function clearCache(): void {
  aiCache.clear();
}
