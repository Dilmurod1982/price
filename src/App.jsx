import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { usePriceStore } from "./store/usePriceStore";
import BarcodeScanner from "./components/BarcodeScanner";
import { fetchProductByBarcode } from "./services/productApi";
// ✅ Правильно
import { submitPrice } from "./services/priceService";
import { queryNearbyPrices } from "./services/geoService";

export default function App() {
  const { currentBarcode, currentProduct, setBarcode, setProduct, queuePrice } =
    usePriceStore();
  const [nearbyPrices, setNearbyPrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [priceInput, setPriceInput] = useState("");

  const handleScan = async (barcode) => {
    setBarcode(barcode);
    setLoading(true);
    const product = await fetchProductByBarcode(barcode);
    setProduct(
      product || { barcode, name: "Неизвестный товар", brand: "", imageUrl: "" }
    );
    setLoading(false);
  };

  const handleSignIn = () => signInWithPopup(auth, googleProvider);

  const handleSubmitPrice = async () => {
    if (!auth.currentUser) {
      alert("Сначала войдите");
      return;
    }

    // получаем геолокацию пользователя
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          await submitPrice({
            barcode: currentBarcode,
            productName: currentProduct.name,
            brand: currentProduct.brand,
            price: Number(priceInput),
            currency: "UZS", // или выбор пользователя
            storeName: "Метка пользователя",
            lat: latitude,
            lng: longitude,
          });
          alert("Цена отправлена!");

          // ищем цены поблизости
          const nearby = await queryNearbyPrices(
            currentBarcode,
            latitude,
            longitude
          );
          setNearbyPrices(nearby);
        } catch (err) {
          // при сбое сети сохраняем в локальную очередь
          queuePrice({
            tempId: Date.now(),
            barcode: currentBarcode,
            price: Number(priceInput),
            timestamp: Date.now(),
          });
          alert(
            "Сохранено в оффлайн-очередь, загрузится при восстановлении сети"
          );
        }
      },
      (err) => alert("Нужно разрешение на геолокацию для отправки цены")
    );
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <h1>Сканер цен</h1>

      {!auth.currentUser && (
        <button onClick={handleSignIn}>Войти через Google</button>
      )}

      <BarcodeScanner onScan={handleScan} />

      {loading && <p>Загружаем информацию о товаре...</p>}

      {currentProduct && (
        <div style={{ marginTop: 20, border: "1px solid #ccc", padding: 16 }}>
          {currentProduct.imageUrl && (
            <img src={currentProduct.imageUrl} alt="" style={{ width: 100 }} />
          )}
          <h2>{currentProduct.name}</h2>
          <p>{currentProduct.brand}</p>
          <p>Штрих-код: {currentBarcode}</p>

          <input
            type="number"
            placeholder="Введите цену"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
          />
          <button onClick={handleSubmitPrice}>Отправить цену</button>
        </div>
      )}

      {nearbyPrices.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3>Цены поблизости</h3>
          {nearbyPrices.map((p) => (
            <div
              key={p.id}
              style={{ borderBottom: "1px solid #eee", padding: 8 }}
            >
              <strong>
                {p.price} {p.currency}
              </strong>{" "}
              — {p.distance}м
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
