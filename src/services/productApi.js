export async function fetchProductByBarcode(barcode) {
    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands,categories,image_url,quantity`;
  
    try {
      const response = await fetch(url);
      const data = await response.json();
  
      if (data.status === 0 || !data.product) {
        return null;
      }
  
      return {
        barcode,
        name: data.product.product_name || 'Неизвестный товар',
        brand: data.product.brands || '',
        category: data.product.categories?.split(',')[0] || '',
        imageUrl: data.product.image_url || '',
        quantity: data.product.quantity || '',
      };
    } catch (error) {
      console.error('Не удалось получить товар:', error);
      return null;
    }
  }