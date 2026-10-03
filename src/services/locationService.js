/**
 * Определяет страну и валюту по координатам.
 * Использует Nominatim (OpenStreetMap) для обратного геокодирования.
 * 
 * ВАЖНО: политика Nominatim — не более 1 запроса в секунду.
 * Не вызывай эту функцию в цикле или на каждое движение.
 */
export async function getCurrencyByCoordinates(lat, lng) {
    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.searchParams.set('lat', lat);
      url.searchParams.set('lon', lng);
      url.searchParams.set('format', 'json');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('accept-language', 'ru');
      // Обязательно для политики Nominatim — идентификация запроса
      url.searchParams.set('email', 'your-email@example.com');
  
      const response = await fetch(url.toString(), {
        headers: {
          // Многие браузеры игнорируют этот заголовок, но email в query — работает всегда
          'Accept': 'application/json',
        },
      });
  
      if (!response.ok) {
        throw new Error(`Nominatim responded ${response.status}`);
      }
  
      const data = await response.json();
      const countryCode = data?.address?.country_code;
  
      if (!countryCode) {
        return { countryCode: null, currency: null };
      }
  
      return {
        countryCode: countryCode.toUpperCase(),
        currency: getCurrencyByCountry(countryCode),
      };
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return { countryCode: null, currency: null };
    }
  }
  
  // Маппинг страна → валюта
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