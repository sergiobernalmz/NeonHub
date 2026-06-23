const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

async function generateAllMissingThumbnails() {
  const uploadsDir = path.join(__dirname, 'uploads/products');
  const thumbsDir = path.join(uploadsDir, 'thumbnails');
  
  try {
    // Crear directorio de thumbnails si no existe
    await fs.mkdir(thumbsDir, { recursive: true });
    
    // Leer todos los archivos en el directorio de productos
    const files = await fs.readdir(uploadsDir);
    const imageFiles = files.filter(file => 
      file.match(/\.(jpg|jpeg|png|gif|webp)$/i) && 
      !file.startsWith('thumb_')
    );
    
    console.log(`Found ${imageFiles.length} image files to process`);
    
    for (const imageFile of imageFiles) {
      const imagePath = path.join(uploadsDir, imageFile);
      const imageId = path.parse(imageFile).name;
      const thumbPath = path.join(thumbsDir, `thumb_${imageId}.webp`);
      
      try {
        // Verificar si ya existe el thumbnail
        await fs.access(thumbPath);
        console.log(`✅ Thumbnail already exists: ${imageFile}`);
        continue;
      } catch (e) {
        // El thumbnail no existe, generarlo
      }
      
      try {
        // Generar thumbnail
        await sharp(imagePath)
          .resize(300, 300, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({ quality: 80 })
          .toFile(thumbPath);
          
        console.log(`🎨 Generated thumbnail for: ${imageFile}`);
      } catch (error) {
        console.error(`❌ Error generating thumbnail for ${imageFile}:`, error.message);
      }
    }
    
    console.log('\n✅ Thumbnail generation process completed!');
    
  } catch (error) {
    console.error('Error in thumbnail generation process:', error);
  }
}

generateAllMissingThumbnails().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});