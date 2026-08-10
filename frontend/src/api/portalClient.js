import axios from "axios";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/api\/?$/, "");

// One shared axios factory for all four portals (admin / teacher / student /
// parent). Each portal differs only in its token storage keys and login
// redirect path, so the JWT attach + refresh + 401 handling live here once
// instead of being copy-pasted across four identical files.
export function createPortalClient({ accessKey, refreshKey, loginPath }) {
  const api = axios.create({ baseURL: BASE_URL });

  api.interceptors.request.use((config) => {
    if (config.url && config.url.startsWith('/') && !config.url.startsWith('/api/')) {
      config.url = '/api' + config.url;
    }
    const token = localStorage.getItem(accessKey);
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
        const refresh = localStorage.getItem(refreshKey);
        if (!refresh) {
          localStorage.clear();
          window.location.href = loginPath;
          return Promise.reject(error);
        }
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            queue.push({ resolve, reject, original });
          });
        }
        isRefreshing = true;
        try {
          const { data } = await axios.post(`${BASE_URL}/api/auth/refresh/`, { refresh });
          localStorage.setItem(accessKey, data.access);
          queue.forEach(({ resolve, original: o }) => {
            o.headers.Authorization = `Bearer ${data.access}`;
            resolve(api(o));
          });
          queue = [];
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch (e) {
          localStorage.clear();
          window.location.href = loginPath;
          return Promise.reject(e);
        } finally {
          isRefreshing = false;
        }
      }
      return Promise.reject(error);
    }
  );

  return api;
}
