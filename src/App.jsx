import { useState } from "react";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { usePriceStore } from "./store/usePriceStore";
import { useAuth } from "./hooks/useAuth";
import BarcodeScanner from "./components/BarcodeScanner";
import { Toast } from "./components/Toast";
import { fetchProductByBarcode } from "./services/productApi";
import { submitPrice } from "./services/priceService";
import { queryNearbyPrices } from "./services/geoService";

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { currentBarcode, currentProduct, setBarcode, setProduct, queuePrice } =
    usePriceStore();

  const [nearbyPrices, setNearbyPrices] = useState([]);
  const [productLoading, setProductLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const [toast, setToast] = useState({ message: "", type: "info" });

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
          await submitPrice({
            barcode: currentBarcode,
            productName: currentProduct.name,
            brand: currentProduct.brand,
            price,
            currency: "UZS",
            storeName: "Метка пользователя",
            lat: latitude,
            lng: longitude,
          });
          showToast("Цена отправлена!", "success");

          const nearby = await queryNearbyPrices(
            currentBarcode,
            latitude,
            longitude
          );
          setNearbyPrices(nearby);
          setPriceInput("");
        } catch (err) {
          console.error("submitPrice error:", err);
          queuePrice({
            tempId: Date.now(),
            barcode: currentBarcode,
            price,
            timestamp: Date.now(),
          });
          showToast("Сеть недоступна, сохранено локально", "warning");
        } finally {
          setSubmitting(false);
        }
      },
      (err) => {
        setSubmitting(false);
        console.error("geolocation error:", err);
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
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Сканер цен</h1>
          {user ? (
            <div className="flex items-center gap-3">
              <img
                src={user.photoURL}
                alt=""
                className="w-8 h-8 rounded-full"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Выйти
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
            >
              Войти через Google
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Scanner */}
        <section>
          <BarcodeScanner onScan={handleScan} />
        </section>

        {/* Product loading */}
        {productLoading && (
          <div className="text-center text-gray-500 py-4">
            Загружаем информацию о товаре...
          </div>
        )}

        {/* Product card */}
        {currentProduct && !productLoading && (
          <section className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            <div className="flex gap-4">
              {currentProduct.imageUrl && (
                <img
                  src={currentProduct.imageUrl}
                  alt=""
                  className="w-24 h-24 object-contain bg-gray-50 rounded-lg"
                />
              )}
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">
                  {currentProduct.name}
                </h2>
                {currentProduct.brand && (
                  <p className="text-sm text-gray-500">
                    {currentProduct.brand}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1 font-mono">
                  {currentBarcode}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                placeholder="Введите цену"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSubmitPrice}
                disabled={submitting || !priceInput}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                {submitting ? "Отправка..." : "Отправить"}
              </button>
            </div>
          </section>
        )}

        {/* Nearby prices */}
        {nearbyPrices.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Цены поблизости
            </h3>
            <div className="divide-y divide-gray-100">
              {nearbyPrices.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <div className="font-semibold text-gray-900">
                      {p.price.toLocaleString()} {p.currency}
                    </div>
                    <div className="text-xs text-gray-400">
                      {p.distance} м от вас
                    </div>
                  </div>
                  {p.verified && (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                      ✓ проверено
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!currentProduct && !productLoading && (
          <div className="text-center py-12 text-gray-400">
            <p>Наведите камеру на штрих-код товара</p>
          </div>
        )}
      </main>

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "info" })}
      />
    </div>
  );
}
