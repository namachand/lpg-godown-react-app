import axios from 'axios';
import api, { API_BASE_URL } from './api';
import type {
  PurchaseBootstrap,
  PurchaseDashboard,
  PurchaseExpense,
  PurchaseLoad,
  PurchaseTripOverview,
  PurchaseTripSummary,
} from '../types';

// Dedicated axios instance for file uploads — no timeout so large images don't abort.
const uploadApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 0,
});

// Upload an odometer image file to the backend and return the server-hosted URL.
// localUri is the device-local URI returned by expo-image-picker.
export const uploadOdometerImage = async (localUri: string): Promise<string> => {
  const filename = localUri.split('/').pop() ?? 'odometer.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const mimeType = match ? `image/${match[1]}` : 'image/jpeg';

  const formData = new FormData();
  // React Native FormData expects this shape for multipart file parts.
  formData.append('image', { uri: localUri, name: filename, type: mimeType } as unknown as Blob);

  const res = await uploadApi.post<{ url: string }>('/upload/odometer', formData, {
    // Setting multipart/form-data explicitly; React Native will append the boundary automatically.
    headers: { 'Content-Type': 'multipart/form-data' },
    transformRequest: (data) => data, // prevent axios from JSON-serialising FormData
  });
  return res.data.url;
};

export const getPurchaseBootstrap = async () => {
  const res = await api.get<{ success: boolean; data: PurchaseBootstrap }>(
    '/purchase/bootstrap'
  );
  return res.data.data;
};

export const getPurchaseDashboard = async (userId: number) => {
  const res = await api.get<{ success: boolean; data: PurchaseDashboard }>(
    '/purchase/dashboard',
    { params: { userId } }
  );
  return res.data.data;
};

export const startPurchaseTrip = async (payload: {
  userId: number;
  stockAreaId?: number | null;
  odometerReading: number;
  odometerImageUrl: string | null;
}) => {
  const res = await api.post<{ success: boolean; data: PurchaseTripOverview }>(
    '/purchase/trips/start',
    payload
  );
  return res.data.data;
};

export const getActivePurchaseTrip = async (userId: number) => {
  const res = await api.get<{ success: boolean; data: PurchaseTripOverview | null }>(
    '/purchase/trips/active',
    { params: { userId } }
  );
  return res.data.data;
};

export const getPurchaseTrips = async (userId: number) => {
  const res = await api.get<{ success: boolean; data: PurchaseTripSummary[] }>(
    '/purchase/trips',
    { params: { userId } }
  );
  return res.data.data;
};

export const getPurchaseLoads = async (userId: number) => {
  const res = await api.get<{ success: boolean; data: PurchaseLoad[] }>(
    '/purchase/loads',
    { params: { userId } }
  );
  return res.data.data;
};

export const getPurchaseLoadDetail = async (loadId: string | number) => {
  const res = await api.get<{ success: boolean; data: PurchaseLoad }>(
    `/purchase/loads/${loadId}`
  );
  return res.data.data;
};

export const createPurchaseLoad = async (payload: {
  tripId: number;
  createdBy: number;
  stockAreaId?: number | null;
  items: { productId: number; quantity: number }[];
}) => {
  const res = await api.post<{ success: boolean; data: PurchaseLoad }>(
    '/purchase/loads',
    payload
  );
  return res.data.data;
};

export const updatePurchaseLoad = async (
  loadId: string | number,
  payload: {
    stockAreaId?: number | null;
    items: { productId: number; quantity: number }[];
  }
) => {
  const res = await api.put<{ success: boolean; data: PurchaseLoad }>(
    `/purchase/loads/${loadId}`,
    payload
  );
  return res.data.data;
};

export const attachPurchaseLoadInvoice = async (
  loadId: string | number,
  payload: {
    invoiceUrl?: string | null;
    invoiceSource?: 'CAMERA' | 'GALLERY' | null;
  }
) => {
  const res = await api.put<{ success: boolean; data: PurchaseLoad }>(
    `/purchase/loads/${loadId}/invoice`,
    payload
  );
  return res.data.data;
};

export const cancelPurchaseLoad = async (loadId: string | number) => {
  const res = await api.put(`/purchase/loads/${loadId}/cancel`);
  return res.data;
};

export const submitPurchaseTrip = async (
  tripId: string | number,
  payload: {
    endOdometerImageUrl: string;
    endOdometerReading: number;
  }
) => {
  const res = await api.put<{ success: boolean; data: PurchaseTripOverview }>(
    `/purchase/trips/${tripId}/submit`,
    payload
  );
  return res.data.data;
};

export const getPurchaseExpenses = async (userId: number) => {
  const res = await api.get<{ success: boolean; data: PurchaseExpense[] }>(
    '/purchase/expenses',
    { params: { userId } }
  );
  return res.data.data;
};

export const createPurchaseExpense = async (payload: {
  category: string;
  description?: string | null;
  amount: number;
  createdBy: number;
  billUrl: string | null;
}) => {
  const res = await api.post<{ success: boolean; data: PurchaseExpense }>(
    '/expenses',
    payload
  );
  return res.data.data;
};