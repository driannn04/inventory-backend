const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '../uploads');

const deleteRecursive = (dirPath) => {
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // Rekursif untuk folder
        deleteRecursive(curPath);
        // Hapus folder kosong setelah isinya habis (kecuali folder utama barang/branding)
        if (file !== 'barang' && file !== 'branding') {
            fs.rmdirSync(curPath);
            console.log(`📂 Folder Dihapus: ${file}`);
        }
      } else {
        // Hapus file (kecuali .gitkeep)
        if (file !== '.gitkeep') {
          fs.unlinkSync(curPath);
          console.log(`🗑️ File Dihapus: ${file}`);
        }
      }
    });
  }
};

console.log("🌊 Memulai pembersihan total folder uploads (Deep Clean)...");
deleteRecursive(uploadsDir);
console.log("\n✨ SEMUA BERSIH! Folder barang & branding kini sudah kosong.");
console.log("Aplikasi Anda benar-benar suci sekarang.");
process.exit();
