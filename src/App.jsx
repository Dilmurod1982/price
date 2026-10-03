import { useState } from "react";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { usePriceStore } from "./store/usePriceStore";
import { useAuth } from "./hooks/useAuth";
import BarcodeScanner from "./components/BarcodeScanner";
import { Toast } from "./components/Toast";
import { MyPrices } from "./components/MyPrices";
import { fetchProductByBarcode } from "./services/productApi";
import { submitPrice } from "./services/priceService";
import { queryNearbyPrices } from "./services/geoService";

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const {
    currentBarcode,
    currentProduct,
    setBarcode,
    setProduct,
    queuePrice,
    resetCurrent,
  } = usePriceStore();

  const [nearbyPrices, setNearbyPrices] = useState([]);
  const [productLoading, setProductLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const [toast, setToast] = useState({ message: "", type: "info" });
  const [showMyPrices, setShowMyPrices] = useState(false);

  const showToast = (message, type = "info") => setToast({ message, type });

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showToast("Вы вошли", "success");
    } catch (err) {
      showToast("Ошибка входа: " + err.message, "error");
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    showToast("Вы вышли", "info");
  };

  const handleScan = async (barcode) => {
    setBarcode(barcode);
    setProductLoading(true);
    setNearbyPrices([]);
    try {
      const product = await fetchProductByBarcode(barcode);
      setProduct(
        product || {
          barcode,
          name: "Неизвестный товар",
          brand: "",
          imageUrl: "",
        }
      );
    } catch (err) {
      showToast("Не удалось загрузить товар", "error");
    } finally {
      setProductLoading(false);
    }
  };

  const handleSubmitPrice = () => {
    if (!user) {
      showToast("Сначала войдите", "warning");
      return;
    }

    const price = Number(priceInput);
    if (!price || price <= 0) {
      showToast("Введите корректную цену", "warning");
      return;
    }

    if (!navigator.geolocation) {
      showToast("Геолокация не поддерживается", "error");
      return;
    }

    setSubmitting(true);
    showToast("Определяем местоположение...", "info");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // 1. Определяем валюту по координатам
          showToast("Определяем валюту...", "info");
          const { currency } = await getCurrencyByCoordinates(
            latitude,
            longitude
          );

          if (!currency) {
            showToast(
              "Не удалось определить валюту, используем UZS",
              "warning"
            );
          }

          // 2. Отправляем цену
          await submitPrice({
            barcode: currentBarcode,
            productName: currentProduct.name,
            brand: currentProduct.brand,
            price,
            currency: currency || "UZS", // фолбэк
            storeName: "Метка пользователя",
            lat: latitude,
            lng: longitude,
          });

          showToast("Цена отправлена!", "success");

          // 3. Ищем цены поблизости
          const nearby = await queryNearbyPrices(
            currentBarcode,
            latitude,
            longitude
          );
          setNearbyPrices(nearby);

          setPriceInput("");
          resetCurrent();
        } catch (err) {
          console.error("submitPrice error:", err);
          queuePrice({
            tempId: Date.now(),
            barcode: currentBarcode,
            price,
            timestamp: Date.now(),
          });
          showToast("Сеть недоступна, сохранено локально", "warning");
          setPriceInput("");
          resetCurrent();
        } finally {
          setSubmitting(false);
        }
      },
      (err) => {
        setSubmitting(false);
        console.error("geolocation error:", err.code, err.message);
        const messages = {
          1: "Вы отклонили доступ к геолокации",
          2: "Не удалось определить местоположение",
          3: "Превышено время ожидания геолокации",
        };
        showToast(messages[err.code] || "Ошибка геолокации", "error");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Шапка */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 shrink-0">
            Сканер цен
          </h1>

          {user ? (
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => setShowMyPrices(true)}
                className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap"
              >
                Мои отправки
              </button>
              <img
                src={user.photoURL}
                alt=""
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full shrink-0"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={handleSignOut}
                className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap"
              >
                Выйти
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-blue-700 transition shrink-0"
            >
              Войти
            </button>
          )}
        </div>
      </header>

      {/* Основной контент */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Сканер */}
        <section className="w-full flex justify-center">
          <div className="w-full max-w-sm sm:max-w-md">
            <BarcodeScanner onScan={handleScan} />
          </div>
        </section>

        {/* Загрузка товара */}
        {productLoading && (
          <div className="text-center text-gray-500 py-4 text-sm">
            Загружаем информацию о товаре...
          </div>
        )}

        {/* Карточка товара */}
        {currentProduct && !productLoading && (
          <section className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {currentProduct.imageUrl && (
                <img
                  src={currentProduct.imageUrl}
                  alt=""
                  className="w-full sm:w-24 h-40 sm:h-24 object-contain bg-gray-50 rounded-lg"
                />
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 break-words">
                  {currentProduct.name}
                </h2>
                {currentProduct.brand && (
                  <p className="text-sm text-gray-500 truncate">
                    {currentProduct.brand}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1 font-mono truncate">
                  {currentBarcode}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="number"
                inputMode="decimal"
                placeholder="Введите цену"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />
              <button
                onClick={handleSubmitPrice}
                disabled={submitting || !priceInput}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition whitespace-nowrap"
              >
                {submitting ? "Отправка..." : "Отправить"}
              </button>
            </div>
          </section>
        )}

        {/* Список цен поблизости */}
        {nearbyPrices.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm p-4 sm:p-5">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">
              Цены поблизости
            </h3>
            <div className="divide-y divide-gray-100">
              {nearbyPrices.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-3 gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-base sm:text-lg font-semibold text-gray-900">
                      {p.price.toLocaleString()} {p.currency}
                    </div>
                    <div className="text-xs text-gray-400">
                      {p.distance} м от вас
                    </div>
                  </div>
                  {p.verified && (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded shrink-0">
                      ✓ проверено
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Пустое состояние */}
        {!currentProduct && !productLoading && nearbyPrices.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            <p>Наведите камеру на штрих-код товара</p>
          </div>
        )}
      </main>

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "info" })}
      />

      {showMyPrices && <MyPrices onClose={() => setShowMyPrices(false)} />}
    </div>
  );
}
