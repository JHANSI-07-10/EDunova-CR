/**
 * Helper to resolve backend media files and public assets correctly.
 * If the path is a database/backend media file (e.g. starting with `/media/` or `media/`),
 * it is prefixed with the dynamic backend API URL (http://localhost:8000).
 * Otherwise, it resolves to standard frontend assets.
 */
export function getMediaUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  if (path.startsWith('/media/') || path.startsWith('media/')) {
    const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/api\/?$/, '');
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return `${baseUrl}${cleanPath}`;
  }
  return path;
}
