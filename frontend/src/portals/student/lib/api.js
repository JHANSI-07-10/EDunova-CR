import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const api = axios.create({ baseURL: BASE_URL.replace(/\/api\/?$/, "") });

api.interceptors.request.use((config) => {
  if (config.url && config.url.startsWith('/') && !config.url.startsWith('/api/')) {
    config.url = '/api' + config.url;
  }
  const token = localStorage.getItem("edunova_student_access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let queue = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("edunova_student_refresh");
      if (!refresh) {
        localStorage.clear();
        window.location.href = "/student/login";
        return Promise.reject(error);
      }
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject, original });
        });
      }
      isRefreshing = true;
      try {
        const targetUrl = `${BASE_URL.replace(/\/api\/?$/, "")}/api/auth/refresh/`;
        const { data } = await axios.post(targetUrl, { refresh });
        localStorage.setItem("edunova_student_access", data.access);
        queue.forEach(({ resolve, original: o }) => {
          o.headers.Authorization = `Bearer ${data.access}`;
          resolve(api(o));
        });
        queue = [];
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch (e) {
        localStorage.clear();
        window.location.href = "/student/login";
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
