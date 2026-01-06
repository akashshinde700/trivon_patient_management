import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { useMemo } from 'react';

const baseURL = (import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:5000';

export function useApiClient() {
  const { token } = useAuth();

  const instance = useMemo(() => {
    return axios.create({
      baseURL,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }, [token]);

  return instance;
}

