import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Infinite scroll hook for pagination
 * Automatically loads more data when scrolling to bottom
 *
 * @param {Function} fetchMore - Function to fetch next page
 * @param {Object} options - Configuration options
 * @returns {Object} - Scroll state and ref
 *
 * @example
 * const { loadMoreRef, hasMore, loading } = useInfiniteScroll(
 *   async (page) => {
 *     const data = await api.get(`/api/patients?page=${page}`);
 *     setPatients(prev => [...prev, ...data]);
 *     return data.length > 0; // Return true if more data available
 *   },
 *   { threshold: 0.8 }
 * );
 *
 * // In component:
 * <div ref={loadMoreRef}>
 *   {patients.map(p => <PatientCard key={p.id} patient={p} />)}
 *   {loading && <Spinner />}
 * </div>
 */
export function useInfiniteScroll(fetchMore, options = {}) {
  const {
    threshold = 0.9, // Trigger when 90% scrolled
    initialPage = 1
  } = options;

  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const moreAvailable = await fetchMore(page);
      setHasMore(moreAvailable);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error('Error loading more:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchMore, loading, hasMore, page]);

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    // Create intersection observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold }
    );

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore, hasMore, loading, threshold]);

  const reset = useCallback(() => {
    setPage(initialPage);
    setHasMore(true);
  }, [initialPage]);

  return {
    loadMoreRef,
    hasMore,
    loading,
    page,
    reset
  };
}

export default useInfiniteScroll;
