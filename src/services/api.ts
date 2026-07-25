import { create } from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DATE_RANGE_STORAGE_KEY } from '../context/DateRangeContext';

// Production builds set EXPO_PUBLIC_API_BASE_URL (must include the /api suffix,
// e.g. https://<your-app>.up.railway.app/api). Falls back to the local machine
// IP for on-device development.
// Strip any trailing slash(es) so endpoints like `/auth/identify` never join
// into a double slash (`https://host//auth/identify`), which fails to match
// the backend routes.
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://192.168.1.9:5001/api"
).replace(/\/+$/, "");
export const API_SERVER_ROOT = API_BASE_URL.replace(/\/api\/?$/, '');
  
const api = create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const method = String(config.method || 'get').toLowerCase();
  const url = String(config.url || '');

  if (
    method !== 'get' ||
    (!url.includes('/drivers/') && !url.includes('/godown/'))
  ) {
    return config;
  }

  const existingStartDate = (config.params as any)?.startDate;
  const existingEndDate = (config.params as any)?.endDate;

  if (existingStartDate && existingEndDate) {
    return config;
  }

  try {
    const raw = await AsyncStorage.getItem(DATE_RANGE_STORAGE_KEY);

    if (!raw) {
      return config;
    }

    const parsed = JSON.parse(raw || '{}');
    const startDate = String(parsed?.startDate || '');
    const endDate = String(parsed?.endDate || '');

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return config;
    }

    config.params = {
      ...(config.params || {}),
      startDate,
      endDate,
    };
  } catch {
    // keep request unchanged if storage read fails
  }

  return config;
});

export default api;
