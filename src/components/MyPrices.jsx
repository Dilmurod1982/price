import { useEffect, useState } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";

export function MyPrices({ onClose }) {
  const { user } = useAuth();
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        const q = query(
          collection(db, "prices"),
          where("userId", "==", user.uid),
          orderBy("timestamp", "desc")
        );
        const snapshot = await getDocs(q);
        setPrices(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Failed to load my prices:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  return (
    <div className="fixed inset-0 bg-white z-30 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-white py-3 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            Мои отправки {!loading && `(${prices.length})`}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 text-3xl leading-none w-8 h-8 flex items-center justify-center"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        {loading && (
          <p className="text-gray-400 text-center py-8">Загрузка...</p>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm">
            <p className="font-medium">Ошибка загрузки</p>
            <p className="mt-1">{error}</p>
            {error.includes("index") && (
              <p className="mt-2">
                Похоже, нужен индекс. Проверь консоль браузера и перейди по
                ссылке из ошибки Firestore.
              </p>
            )}
          </div>
        )}

        {!loading && !error && prices.length === 0 && (
          <p className="text-gray-400 text-center py-8">
            Вы ещё ничего не отправляли
          </p>
        )}

        <div className="space-y-3">
          {prices.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-gray-100 rounded-xl p-4"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-gray-900 truncate">
                    {p.productName || "Без названия"}
                  </h3>
                  <p className="text-xs text-gray-400 font-mono truncate">
                    {p.barcode}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-gray-900">
                    {p.price?.toLocaleString()} {p.currency}
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                {p.timestamp?.toDate?.().toLocaleString("ru-RU") || "—"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
