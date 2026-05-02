/**
 * Sanitizer Middleware
 * Berfungsi untuk membersihkan semua input (body, query, params) dari tag HTML
 * untuk mencegah XSS dan menjaga integritas data di database.
 */

const stripHtml = (text) => {
  if (typeof text !== 'string') return text;
  // Regex untuk menghapus semua tag HTML
  return text.replace(/<[^>]*>?/gm, '').trim();
};

const sanitizeObject = (obj) => {
  for (let key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = stripHtml(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      // Rekursif jika ada nested object/array
      sanitizeObject(obj[key]);
    }
  }
};

const sanitizer = (req, res, next) => {
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  next();
};

module.exports = sanitizer;
