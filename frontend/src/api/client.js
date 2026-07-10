import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
})

client.interceptors.request.use((config) => {
  if (config.url && config.url.startsWith('/') && !config.url.startsWith('/api/')) {
    config.url = '/api' + config.url;
  }
  return config;
});

export default client
