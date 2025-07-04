'use client';

import React, { useState, useEffect } from 'react';
import { cacheManager } from '@/lib/cacheManager';

interface CacheStatusProps {
  className?: string;
}

export default function CacheStatus({ className = '' }: CacheStatusProps) {
  const [cacheStats, setCacheStats] = useState({ size: 0, keys: [] as string[] });
  const [isExpanded, setIsExpanded] = useState(false);

  const updateCacheStats = () => {
    setCacheStats(cacheManager.getStats());
  };

  useEffect(() => {
    updateCacheStats();
    
    // 每 5 秒更新一次缓存状态
    const interval = setInterval(updateCacheStats, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const handleClearCache = () => {
    cacheManager.clear();
    updateCacheStats();
    alert('缓存已清空');
  };

  const handleCleanupCache = () => {
    cacheManager.cleanup();
    updateCacheStats();
    alert('过期缓存已清理');
  };

  return (
    <div className={`bg-gray-100 p-4 rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-800">缓存状态</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          {isExpanded ? '收起' : '展开'}
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">缓存项数量:</span>
          <span className="font-mono text-green-600">{cacheStats.size}</span>
        </div>
        
        {isExpanded && (
          <>
            <div className="border-t pt-2">
              <h4 className="text-sm font-medium text-gray-700 mb-2">缓存键列表:</h4>
              <div className="max-h-32 overflow-y-auto">
                {cacheStats.keys.length > 0 ? (
                  <ul className="text-xs text-gray-600 space-y-1">
                    {cacheStats.keys.map((key, index) => (
                      <li key={index} className="font-mono bg-gray-50 p-1 rounded">
                        {key}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-sm">暂无缓存数据</p>
                )}
              </div>
            </div>
            
            <div className="border-t pt-2 space-x-2">
              <button
                onClick={handleCleanupCache}
                className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 transition-colors"
              >
                清理过期缓存
              </button>
              <button
                onClick={handleClearCache}
                className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
              >
                清空所有缓存
              </button>
            </div>
          </>
        )}
      </div>
      
      <div className="mt-3 text-xs text-gray-500">
        <p>• 价格数据缓存: {process.env.NEXT_PUBLIC_CACHE_DURATION_MINUTES || 5} 分钟</p>
        <p>• 历史数据缓存: {process.env.NEXT_PUBLIC_HISTORICAL_CACHE_DURATION_MINUTES || 60} 分钟</p>
        <p>• API 调用限流: {process.env.NEXT_PUBLIC_API_RATE_LIMIT_MS || 1000} 毫秒</p>
      </div>
    </div>
  );
}