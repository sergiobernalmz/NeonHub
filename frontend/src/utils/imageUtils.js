// parsea el campo images que viene de la API de forma robusta
export function parseImagesField(imagesField) {
  if (!imagesField) return [];

  if (Array.isArray(imagesField)) return imagesField;

  if (typeof imagesField === 'object') return imagesField || [];

  if (typeof imagesField === 'string') {
    let str = imagesField.trim();

    // quitamos las comillas de alrededor si las tiene
    if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
      str = str.slice(1, -1);
    }

    // desescapamos el JSON si está doblemente serializado
    if (str.includes('\\"')) {
      try {
        const unescaped = str.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        return JSON.parse(unescaped);
      } catch (_e) {
        // fallthrough
      }
    }

    try {
      return JSON.parse(str);
    } catch (_e) {
      const match = str.match(/\[.*\]/s);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (_ee) {
          return [];
        }
      }
    }
  }

  return [];
}
