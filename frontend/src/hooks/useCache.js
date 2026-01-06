import { useState, useCallback, useRef } from 'react';

/**
 * Simple in-memory cache hook
 * Caches API responses to reduce network calls
 *
 * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
 * @returns {Object} - Cache methods
 *
 * @example
 * const cache = useCache(300000); // 5 minutes
 *
 * const fetchPatients = async () => {
 *   const cached = cache.get('patients');
 *   if (cached) return cached;
 *
 *   const data = await api.get('/api/patients');
 *   cache.set('patients', data);
 *   return data;
 * };
 */
export function useCache(ttl = 300000) {
  const cacheRef = useRef(new Map());
  const timestampsRef = useRef(new Map());

  const get = useCallback((key) => {
    const timestamp = timestampsRef.current.get(key);

    // Check if cache exists and is not expired
    if (timestamp && Date.now() - timestamp < ttl) {
      return cacheRef.current.get(key);
    }

    // Cache expired or doesn't exist
    cacheRef.current.delete(key);
    timestampsRef.current.delete(key);
    return null;
  }, [ttl]);

  const set = useCallback((key, value) => {
    cacheRef.current.set(key, value);
    timestampsRef.current.set(key, Date.now());
  }, []);

  const clear = useCallback((key) => {
    if (key) {
      cacheRef.current.delete(key);
      timestampsRef.current.delete(key);
    } else {
      cacheRef.current.clear();
      timestampsRef.current.clear();
    }
  }, []);

  const has = useCallback((key) => {
    const timestamp = timestampsRef.current.get(key);
    return timestamp && Date.now() - timestamp < ttl;
  }, [ttl]);

  return { get, set, clear, has };
}

export default useCache;
