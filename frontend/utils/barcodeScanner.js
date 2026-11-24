/**
 NOTES:

 - Detects and decodes a barcode from an image element or image source URL.
 - Uses the browser's native BarcodeDetector API if available, 
 - and falls back to the @zxing/library UMD global if loaded.
 */
export async function scanBarcodeFromImage(imageSrc) {
  // 1. Try Native BarcodeDetector (Chrome/Edge/Android)
  if ('BarcodeDetector' in window) {
    try {
      const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'codabar', 'itf'];
      const detector = new window.BarcodeDetector({ formats });
      
      const img = new Image();
      img.src = imageSrc;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      
      const results = await detector.detect(img);
      if (results && results.length > 0) {
        console.log("Native BarcodeDetector decoded:", results[0].rawValue);
        return results[0].rawValue;
      }
    } catch (err) {
      console.warn("Native BarcodeDetector failed, falling back:", err);
    }
  }

  // 2. Try ZXing library UMD fallback
  if (window.ZXing) {
    try {
      const codeReader = new window.ZXing.BrowserMultiFormatReader();
      const img = new Image();
      img.src = imageSrc;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      const result = await codeReader.decodeFromImageElement(img);
      if (result && result.text) {
        console.log("ZXing decoded:", result.text);
        return result.text;
      }
    } catch (err) {
      console.warn("ZXing decoding failed:", err);
    }
  } else {
    console.warn("ZXing library is not loaded on window.");
  }

  return null;
}

/**
 - Fetches product information and nutrition values from the Open Food Facts API
 - using the barcode digits.
 */
export async function getNutritionByBarcode(barcode) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 1 && data.product) {
      const p = data.product;
      const nut = p.nutriments || {};
      
      // Extract serving size in grams if possible, fallback to 1 serving
      const rawServing = p.serving_size || "1 serving";
      const ingredientsText = p.ingredients_text || "";
      const ingredients = ingredientsText
        ? ingredientsText.split(',').map(s => s.trim().replace(/_|\*|\[|\]/g, '')).filter(name => name.length > 1 && !name.includes(':'))
        : [];

      // Open Food Facts returns energy in kcal and macros in grams.
      return {
        name: p.product_name || p.generic_name || "Unknown Product",
        brand: p.brands || "Unknown Brand",
        serving_size: rawServing,
        calories: Math.round(nut['energy-kcal_serving'] ?? nut['energy-kcal_100g'] ?? nut['energy-kcal'] ?? 0),
        carbs: Number((nut['carbohydrates_serving'] ?? nut['carbohydrates_100g'] ?? 0).toFixed(1)),
        fat: Number((nut['fat_serving'] ?? nut['fat_100g'] ?? 0).toFixed(1)),
        protein: Number((nut['proteins_serving'] ?? nut['proteins_100g'] ?? 0).toFixed(1)),
        sodium: Math.round(nut['sodium_serving'] ?? nut['sodium_100g'] ?? 0),
        sugar: Number((nut['sugars_serving'] ?? nut['sugars_100g'] ?? 0).toFixed(1)),
        ingredients
      };
    }
  } catch (err) {
    console.error("Open Food Facts lookup failed:", err);
  }
  return null;
}
