const fs = require('fs').promises;
const path = require('path');

const createDirectories = async () => {
  const directories = [
    path.join(__dirname, '../../uploads'),
    path.join(__dirname, '../../uploads/products'),
    path.join(__dirname, '../../uploads/users'),
    path.join(__dirname, '../../uploads/temp'),
    path.join(__dirname, '../../logs'),
    path.join(__dirname, '../../docs'),
    path.join(__dirname, '../../backups')
  ];

  for (const dir of directories) {
    try {
      await fs.access(dir);
      console.log(`✅ Directorio ya existe: ${dir}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        try {
          await fs.mkdir(dir, { recursive: true });
          console.log(`📁 Directorio creado: ${dir}`);
        } catch (createError) {
          console.error(`❌ Error al crear directorio ${dir}:`, createError.message);
        }
      } else {
        console.error(`❌ Error al verificar directorio ${dir}:`, error.message);
      }
    }
  }
};

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
};

const createFileIfNotExists = async (filePath, content = '') => {
  try {
    const exists = await fileExists(filePath);
    if (!exists) {
      
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      
      await fs.writeFile(filePath, content, 'utf8');
      console.log(`📄 Archivo creado: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error al crear archivo ${filePath}:`, error.message);
    throw error;
  }
};

const deleteFileIfExists = async (filePath) => {
  try {
    const exists = await fileExists(filePath);
    if (exists) {
      await fs.unlink(filePath);
      console.log(`🗑️ Archivo eliminado: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error al eliminar archivo ${filePath}:`, error.message);
    throw error;
  }
};

const getFileSize = async (filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch (error) {
    console.error(`❌ Error al obtener tamaño del archivo ${filePath}:`, error.message);
    throw error;
  }
};

const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase().slice(1);
};

const generateUniqueFilename = (originalName, prefix = '') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = getFileExtension(originalName);
  const baseName = path.basename(originalName, path.extname(originalName));
  
  return `${prefix}${prefix ? '_' : ''}${baseName}_${timestamp}_${random}.${extension}`;
};

const cleanFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') 
    .replace(/_{2,}/g, '_') 
    .replace(/^_+|_+$/g, ''); 
};

const copyFile = async (source, destination) => {
  try {
    
    const destDir = path.dirname(destination);
    await fs.mkdir(destDir, { recursive: true });
    
    
    await fs.copyFile(source, destination);
    console.log(`📋 Archivo copiado: ${source} -> ${destination}`);
  } catch (error) {
    console.error(`❌ Error al copiar archivo ${source} -> ${destination}:`, error.message);
    throw error;
  }
};

const moveFile = async (source, destination) => {
  try {
    
    const destDir = path.dirname(destination);
    await fs.mkdir(destDir, { recursive: true });
    
    
    await fs.rename(source, destination);
    console.log(`📦 Archivo movido: ${source} -> ${destination}`);
  } catch (error) {
    console.error(`❌ Error al mover archivo ${source} -> ${destination}:`, error.message);
    throw error;
  }
};

const readJSONFile = async (filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Error al leer archivo JSON ${filePath}:`, error.message);
    throw error;
  }
};

const writeJSONFile = async (filePath, data, pretty = true) => {
  try {
    
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    await fs.writeFile(filePath, content, 'utf8');
    console.log(`💾 Archivo JSON guardado: ${filePath}`);
  } catch (error) {
    console.error(`❌ Error al escribir archivo JSON ${filePath}:`, error.message);
    throw error;
  }
};

const getDirectorySize = async (dirPath) => {
  try {
    let totalSize = 0;
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        totalSize += await getDirectorySize(itemPath);
      } else {
        const stats = await fs.stat(itemPath);
        totalSize += stats.size;
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error(`❌ Error al calcular tamaño del directorio ${dirPath}:`, error.message);
    throw error;
  }
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

module.exports = {
  createDirectories,
  fileExists,
  createFileIfNotExists,
  deleteFileIfExists,
  getFileSize,
  getFileExtension,
  generateUniqueFilename,
  cleanFilename,
  copyFile,
  moveFile,
  readJSONFile,
  writeJSONFile,
  getDirectorySize,
  formatFileSize
};