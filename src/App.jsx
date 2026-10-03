import { useState } from "react";
import { useTranslation } from "react-i18next";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { usePriceStore } from "./store/usePriceStore";
import { useAuth } from "./hooks/useAuth";
import BarcodeScanner from "./components/BarcodeScanner";
import { Toast } from "./components/Toast";
import { MyPrices } from "./components/MyPrices";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { fetchProductByBarcode } from "./services/productApi";
import { submitPrice } from "./services/priceService";
import { queryNearbyPrices } from "./services/geoService";
import { getLocationInfo } from "./services/locationService";

// Радиус поиска цен поблизости
const SEARCH_RADIUS_KM = 0.1;
const SEARCH_RADIUS_M = SEARCH_RADIUS_KM * 1000;

export default function App() {
  const { t } = useTranslation();
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
      showToast(t("auth.signInSuccess"), "success");
    } catch (err) {
      showToast(`${t("auth.signInError")}: ${err.message}`, "error");
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    showToast(t("auth.signOutSuccess"), "info");
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
          name: t("product.unknown"),
          brand: "",
          imageUrl: "",
        }
      );

      if (navigator.geolocation) {
        showToast(t("scanner.searchingNearby"), "info");
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              const nearby = await queryNearbyPrices(
                barcode,
                latitude,
                longitude,
                SEARCH_RADIUS_M
              );
              setNearbyPrices(nearby);
            } catch (err) {
              console.error("Nearby query failed:", err);
              if (err.message?.includes("index")) {
                showToast(
                  "Нужен индекс Firestore — проверь консоль",
                  "warning"
                );
              }
            }
          },
          (err) => {
            console.warn("Geolocation unavailable:", err.code);
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        );
      }
    } catch (err) {
      showToast(t("scanner.productLoadError"), "error");
    } finally {
      setProductLoading(false);
    }
  };

  const handleSelectFromMyPrices = async (price) => {
    setShowMyPrices(false);

    setBarcode(price.barcode);
    setProduct({
      barcode: price.barcode,
      name: price.productName,
      brand: price.brand || "",
      imageUrl: "",
    });

    setPriceInput("");
    setNearbyPrices([]);

    try {
      showToast(t("scanner.searchingNearby"), "info");
      const nearby = await queryNearbyPrices(
        price.barcode,
        price.lat,
        price.lng,
        SEARCH_RADIUS_M
      );
      setNearbyPrices(nearby);
    } catch (err) {
      console.error("Nearby query from my prices failed:", err);
      showToast(t("scanner.productLoadError"), "error");
    }
  };

  const handleSubmitPrice = () => {
    if (!user) {
      showToast(t("errors.needAuth"), "warning");
      return;
    }

    const price = Number(priceInput);
    if (!price || price <= 0) {
      showToast(t("errors.invalidPrice"), "warning");
      return;
    }

    if (!navigator.geolocation) {
      showToast(t("errors.noGeolocation"), "error");
      return;
    }

    setSubmitting(true);
    showToast(t("errors.determiningLocation"), "info");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const { currency, locationName } = await getLocationInfo(
            latitude,
            longitude
          );

          await submitPrice({
            barcode: currentBarcode,
            productName: currentProduct.name,
            brand: currentProduct.brand,
            price,
            currency: currency || "UZS",
            storeName: "Метка пользователя",
            locationName,
            lat: latitude,
            lng: longitude,
          });

          showToast(t("errors.priceSubmitted"), "success");

          const nearby = await queryNearbyPrices(
            currentBarcode,
            latitude,
            longitude,
            SEARCH_RADIUS_M
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
          showToast(t("errors.networkError"), "warning");
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
          1: t("errors.geoDenied"),
          2: t("errors.geoUnavailable"),
          3: t("errors.geoTimeout"),
        };
        showToast(messages[err.code] || t("errors.geoError"), "error");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const minPrice = nearbyPrices.length
    ? Math.min(...nearbyPrices.map((p) => p.price))
    : 0;
  const maxPrice = nearbyPrices.length
    ? Math.max(...nearbyPrices.map((p) => p.price))
    : 0;
  const spread = maxPrice - minPrice;
  const spreadPercent =
    minPrice > 0 ? Math.round((spread / minPrice) * 100) : 0;
  const myPrice = nearbyPrices.find((p) => p.userId === user?.uid)?.price;
  const hasComparison = nearbyPrices.length > 1 && spread > 0;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">{t("myPrices.loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Шапка */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 shrink-0">
            {t("app.title")}
          </h1>

          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <LanguageSwitcher />

            {user ? (
              <>
                <button
                  onClick={() => setShowMyPrices(true)}
                  className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap"
                >
                  {t("nav.myPrices")}
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
                  {t("auth.signOut")}
                </button>
              </>
            ) : (
              <button
                onClick={handleSignIn}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-blue-700 transition shrink-0"
              >
                {t("auth.signIn")}
              </button>
            )}
          </div>
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
            {t("scanner.loadingProduct")}
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
                placeholder={t("product.pricePlaceholder")}
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />
              <button
                onClick={handleSubmitPrice}
                disabled={submitting || !priceInput}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition whitespace-nowrap"
              >
                {submitting ? t("product.submitting") : t("product.submit")}
              </button>
            </div>

            {nearbyPrices.length === 0 && !submitting && (
              <p className="text-xs text-gray-400 text-center">
                {t("product.noPrices")}
              </p>
            )}

            {nearbyPrices.length > 0 && !myPrice && (
              <p className="text-xs text-blue-600 text-center">
                {t("product.hasPrices", { count: nearbyPrices.length })}
              </p>
            )}
          </section>
        )}

        {/* Список цен с сравнением */}
        {nearbyPrices.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm p-4 sm:p-5">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
              {t("nearby.title")}
            </h3>

            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-400">
                {t("nearby.stores", { count: nearbyPrices.length })}{" "}
                {SEARCH_RADIUS_KM < 1
                  ? t("nearby.storesRadiusMeters", {
                      meters: Math.round(SEARCH_RADIUS_KM * 1000),
                    })
                  : t("nearby.storesRadiusKm", { km: SEARCH_RADIUS_KM })}
              </p>
              {nearbyPrices.length > 1 && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                    />
                  </svg>
                  {t("nearby.sortedLowToHigh")}
                </span>
              )}
            </div>

            {/* Сводка */}
            {hasComparison && (
              <div className="bg-blue-50 rounded-xl p-4 mb-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t("nearby.lowest")}</span>
                  <span className="font-semibold text-green-700">
                    {minPrice.toLocaleString()} {nearbyPrices[0].currency}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t("nearby.highest")}</span>
                  <span className="font-semibold text-red-700">
                    {maxPrice.toLocaleString()} {nearbyPrices[0].currency}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t("nearby.spread")}</span>
                  <span className="font-medium text-gray-900">
                    {spread.toLocaleString()} {nearbyPrices[0].currency} (
                    {spreadPercent}%)
                  </span>
                </div>

                {myPrice && myPrice !== minPrice && (
                  <div className="pt-2 border-t border-blue-200 flex justify-between text-sm">
                    <span className="text-gray-700">
                      {t("nearby.yourPrice")}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {myPrice.toLocaleString()} {nearbyPrices[0].currency}{" "}
                      <span className="text-red-600">
                        (+{(myPrice - minPrice).toLocaleString()})
                      </span>
                    </span>
                  </div>
                )}

                {myPrice && myPrice === minPrice && (
                  <div className="pt-2 border-t border-blue-200 text-sm text-green-700 font-medium text-center">
                    {t("nearby.youAreLowest")}
                  </div>
                )}
              </div>
            )}

            {/* Дисклеймер при одной цене */}
            {nearbyPrices.length === 1 && (
              <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded mb-3">
                {t("nearby.onlyOne")}
              </div>
            )}

            {/* Список с подсветкой */}
            <div className="divide-y divide-gray-100">
              {nearbyPrices.map((p) => {
                const isMin = hasComparison && p.price === minPrice;
                const isMax = hasComparison && p.price === maxPrice;
                const isMine = p.userId === user?.uid;

                return (
                  <div
                    key={p.id}
                    className={`py-3 px-2 -mx-2 rounded-lg ${
                      isMine
                        ? "bg-blue-50"
                        : isMin
                        ? "bg-green-50"
                        : isMax
                        ? "bg-red-50"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span
                            className={`text-base sm:text-lg font-semibold ${
                              isMin
                                ? "text-green-700"
                                : isMax
                                ? "text-red-700"
                                : "text-gray-900"
                            }`}
                          >
                            {p.price.toLocaleString()} {p.currency}
                          </span>

                          {isMin && (
                            <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">
                              {t("nearby.cheapest")}
                            </span>
                          )}
                          {isMax && (
                            <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded">
                              {t("nearby.mostExpensive")}
                            </span>
                          )}
                          {isMine && (
                            <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                              {t("nearby.yourBadge")}
                            </span>
                          )}
                        </div>

                        {p.locationName ? (
                          <div className="text-xs text-gray-500 mt-1 truncate">
                            {p.locationName}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 mt-1">
                            {t("nearby.metersAway", { distance: p.distance })}
                          </div>
                        )}
                      </div>

                      {hasComparison && !isMin && (
                        <div className="text-xs text-gray-500 whitespace-nowrap text-right">
                          +{(p.price - minPrice).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Пустое состояние */}
        {!currentProduct && !productLoading && nearbyPrices.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            <p>{t("scanner.hint")}</p>
          </div>
        )}
      </main>

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "info" })}
      />

      {showMyPrices && (
        <MyPrices
          onClose={() => setShowMyPrices(false)}
          onSelect={handleSelectFromMyPrices}
        />
      )}
    </div>
  );
}
