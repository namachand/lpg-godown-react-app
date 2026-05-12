import axios from "axios";

const api = axios.create({
  baseURL: "http://192.168.0.162:5000/api/",
  // baseURL: "https://lpg-backend-001-production.up.railway.app/api/", // ⚠️ IMPORTANT
  timeout: 10000,
});

export default api;

