/**
 * Определяет страну, валюту и название локации по координатам.
 * Один запрос к Nominatim — возвращает всё сразу.
 */
export async function getLocationInfo(lat, lng) {
    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.searchParams.set('lat', lat);
      url.searchParams.set('lon', lng);
      url.searchParams.set('format', 'json');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('accept-language', 'ru');
      url.searchParams.set('email', 'your-email@example.com');
  
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`Nominatim ${response.status}`);
  
      const data = await response.json();
      const addr = data?.address || {};
  
      const countryCode = addr.country_code?.toUpperCase() || null;
      const currency = getCurrencyByCountry(countryCode);
  
      // Собираем читаемый адрес из доступных полей
      const locationName = buildLocationName(addr, data.display_name);
  
      return { countryCode, currency, locationName };
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return { countryCode: null, currency: null, locationName: '' };
    }
  }
  
  /**
   * Собирает читаемое название из ответа Nominatim.
   * Приоритет: улица + дом → район → город → страна.
   */
  function buildLocationName(addr, fallbackDisplayName) {
    const parts = [];
  
    // Улица + номер дома
    const street = addr.road || addr.pedestrian || addr.footway;
    const houseNumber = addr.house_number;
    if (street) {
      parts.push(houseNumber ? `${street}, ${houseNumber}` : street);
    }
  
    // Магазин (если точка в магазине — Nominatim иногда знает название)
    if (addr.shop) parts.push(addr.shop);
  
    // Район
    if (addr.suburb || addr.neighbourhood || addr.city_district) {
      parts.push(addr.suburb || addr.neighbourhood || addr.city_district);
    }
  
    // Город
    if (addr.city || addr.town || addr.village) {
      parts.push(addr.city || addr.town || addr.village);
    }
  
    // Страна
    if (addr.country) parts.push(addr.country);
  
    if (parts.length > 0) {
      return parts.join(', ');
    }
  
    // Фолбэк: первые 80 символов display_name
    return (fallbackDisplayName || '').slice(0, 80);
  }
  
  const COUNTRY_TO_CURRENCY = {
    UZ: 'UZS', KZ: 'KZT', RU: 'RUB', KG: 'KGS', TJ: 'TJS', TM: 'TMT',
    US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD', NZ: 'NZD',
    DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', PT: 'EUR',
    NL: 'EUR', BE: 'EUR', AT: 'EUR', IE: 'EUR', FI: 'EUR',
    PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN',
    TR: 'TRY', UA: 'UAH', BY: 'BYN', GE: 'GEL', AM: 'AMD', AZ: 'AZN',
    CN: 'CNY', JP: 'JPY', KR: 'KRW', IN: 'INR', ID: 'IDR',
    TH: 'THB', VN: 'VND', PH: 'PHP', MY: 'MYR', SG: 'SGD',
    AE: 'AED', SA: 'SAR', IL: 'ILS', EG: 'EGP', IR: 'IRR',
    BR: 'BRL', AR: 'ARS', MX: 'MXN', CL: 'CLP', CO: 'COP',
    ZA: 'ZAR', NG: 'NGN', KE: 'KES', ET: 'ETB', GH: 'GHS',
  };
  
  export function getCurrencyByCountry(countryCode) {
    if (!countryCode) return null;
    return COUNTRY_TO_CURRENCY[countryCode.toUpperCase()] || null;
  }
  
  // Оставляем старую функцию для совместимости
  export async function getCurrencyByCoordinates(lat, lng) {
    const { currency } = await getLocationInfo(lat, lng);
    return { currency };
  }