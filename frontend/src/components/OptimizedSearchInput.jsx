import { useState, useCallback } from 'react';
import { useDebounce } from '../hooks/useDebounce';

/**
 * Optimized search input with debouncing
 * Reduces API calls by waiting for user to stop typing
 *
 * @param {Object} props - Component props
 * @param {Function} props.onSearch - Callback when search is triggered
 * @param {string} props.placeholder - Input placeholder
 * @param {number} props.delay - Debounce delay in ms (default: 500)
 * @param {string} props.className - Additional CSS classes
 *
 * @example
 * <OptimizedSearchInput
 *   onSearch={(term) => fetchPatients(term)}
 *   placeholder="Search patients..."
 *   delay={500}
 * />
 */
export default function OptimizedSearchInput({
  onSearch,
  placeholder = 'Search...',
  delay = 500,
  className = ''
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, delay);

  // Trigger search when debounced value changes
  useState(() => {
    if (debouncedSearch !== undefined) {
      onSearch(debouncedSearch);
    }
  }, [debouncedSearch]);

  const handleChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleClear = useCallback(() => {
    setSearchTerm('');
    onSearch('');
  }, [onSearch]);

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg
          className="h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <input
        type="text"
        value={searchTerm}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {searchTerm && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
