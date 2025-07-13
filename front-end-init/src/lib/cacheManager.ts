/**
 * 数据缓存管理器
 * 提供内存缓存功能，避免频繁 API 调用
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class CacheManager {
  private cache = new Map<string, CacheItem<any>>();
  private defaultTTL: number;
  private historicalTTL: number;

  constructor() {
    // 从环境变量获取缓存时长，默认值为 5 分钟和 60 分钟
    this.defaultTTL = (parseInt(process.env.NEXT_PUBLIC_CACHE_DURATION_MINUTES || '5') * 60 * 1000);
    this.historicalTTL = (parseInt(process.env.NEXT_PUBLIC_HISTORICAL_CACHE_DURATION_MINUTES || '60') * 60 * 1000);
  }

  /**
   * 生成缓存键
   */
  private generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${sortedParams}`;
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, data: T, customTTL?: number): void {
    const ttl = customTTL || this.defaultTTL;
    const now = Date.now();
    
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl
    });
  }

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * 缓存当前价格数据
   */
  setCachedPrices(coinIds: string[], data: Record<string, number>): void {
    const key = this.generateKey('prices', { coinIds: coinIds.sort().join(',') });
    this.set(key, data);
  }

  /**
   * 获取缓存的当前价格数据
   */
  getCachedPrices(coinIds: string[]): Record<string, number> | null {
    const key = this.generateKey('prices', { coinIds: coinIds.sort().join(',') });
    return this.get<Record<string, number>>(key);
  }

  /**
   * 缓存历史价格数据
   */
  setCachedHistoricalPrices(
    coinId: string, 
    days: number, 
    data: [number, number][]
  ): void {
    const key = this.generateKey('historical', { coinId, days });
    this.set(key, data, this.historicalTTL);
  }

  /**
   * 获取缓存的历史价格数据
   */
  getCachedHistoricalPrices(
    coinId: string, 
    days: number
  ): [number, number][] | null {
    const key = this.generateKey('historical', { coinId, days });
    return this.get<[number, number][]>(key);
  }

  /**
   * 缓存批量历史价格数据
   */
  setCachedBatchHistoricalPrices(
    coinIds: string[], 
    days: number, 
    data: Record<string, [number, number][]>
  ): void {
    const key = this.generateKey('batch_historical', { 
      coinIds: coinIds.sort().join(','), 
      days 
    });
    this.set(key, data, this.historicalTTL);
  }

  /**
   * 获取缓存的批量历史价格数据
   */
  getCachedBatchHistoricalPrices(
    coinIds: string[], 
    days: number
  ): Record<string, [number, number][]> | null {
    const key = this.generateKey('batch_historical', { 
      coinIds: coinIds.sort().join(','), 
      days 
    });
    return this.get<Record<string, [number, number][]>>(key);
  }
}

// 创建全局缓存管理器实例
export const cacheManager = new CacheManager();

// 定期清理过期缓存（每 10 分钟）
if (typeof window !== 'undefined') {
  setInterval(() => {
    cacheManager.cleanup();
  }, 10 * 60 * 1000);
}