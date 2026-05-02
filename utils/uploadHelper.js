const sharp = require("sharp");
const fs = require("fs-extra");
const path = require("path");

/**
 * Memproses gambar: Rename, Resize, Compress, dan Simpan ke Folder Dinamis
 * @param {Object} file - File dari multer (memoryStorage)
 * @param {String} category - Kategori (barang/users/branding)
 * @param {String|Number} id - ID unik untuk folder
 * @returns {String} - Path file yang disimpan (relatif terhadap folder uploads)
 */
const processImage = async (file, category, id = "") => {
  if (!file || !file.buffer) return null;

  // 1. Tentukan folder tujuan
  // Jika ID ada: uploads/barang/12/
  // Jika ID tidak ada: uploads/branding/
  const targetDir = id 
    ? path.join("uploads", category, id.toString()) 
    : path.join("uploads", category);
    
  // Pastikan folder ada (fs-extra akan membuat rekursif jika belum ada)
  await fs.ensureDir(targetDir);

  // 2. Generate Nama File: YYYYMMDDHHMMSSms
  const now = new Date();
  const timestamp = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0') +
    now.getMilliseconds().toString().padStart(3, '0');
    
  const ext = path.extname(file.originalname) || ".jpg";
  const filename = `${timestamp}${ext}`; 
  const finalPath = path.join(targetDir, filename);

  // 3. Proses dengan Sharp (Resize & Compress)
  // Menjaga aspect ratio, lebar maks 1600px, tanpa membesarkan gambar kecil
  let sharpInstance = sharp(file.buffer)
    .resize(1600, 1600, { 
      fit: 'inside', 
      withoutEnlargement: true 
    });

  // Kompresi berdasarkan tipe file
  if (ext.toLowerCase() === '.png') {
    await sharpInstance.png({ quality: 80, compressionLevel: 8 }).toFile(finalPath);
  } else {
    await sharpInstance.jpeg({ quality: 80, progressive: true }).toFile(finalPath);
  }

  // Kembalikan path relatif untuk disimpan di database (misal: barang/42/20240428.jpg)
  // Replace backslash dengan forward slash untuk URL compatibility
  const dbPath = id 
    ? path.join(category, id.toString(), filename).replace(/\\/g, '/')
    : path.join(category, filename).replace(/\\/g, '/');

  return dbPath;
};

module.exports = { processImage };
