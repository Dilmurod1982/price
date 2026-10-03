import { useTranslation } from "react-i18next";
import { useState } from "react";
import { SUPPORTED_LANGUAGES } from "../i18n";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const current =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ||
    SUPPORTED_LANGUAGES[0];

  const filtered = SUPPORTED_LANGUAGES.filter((lang) => {
    const q = query.toLowerCase();
    return (
      lang.code.toLowerCase().includes(q) ||
      lang.label.toLowerCase().includes(q) ||
      lang.native.toLowerCase().includes(q)
    );
  });

  const handleSelect = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 px-2 py-1 text-xs sm:text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
        aria-label={t("language.label")}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
          />
        </svg>
        <span className="hidden sm:inline">{current.code.toUpperCase()}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Заголовок */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                {t("language.label")}
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-900 text-2xl leading-none w-8 h-8 flex items-center justify-center"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Поиск */}
            <div className="p-3 border-b border-gray-100">
              <input
                type="text"
                placeholder="Поиск / Search / بحث..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            {/* Список языков */}
            <div className="overflow-y-auto p-2">
              {filtered.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-6">
                  Ничего не найдено
                </p>
              )}
              {filtered.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang.code)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between gap-3 hover:bg-gray-50 transition ${
                    i18n.language === lang.code ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div
                      className={`text-sm ${
                        i18n.language === lang.code
                          ? "text-blue-700 font-medium"
                          : "text-gray-900"
                      }`}
                    >
                      {lang.native}
                    </div>
                    <div className="text-xs text-gray-400">{lang.label}</div>
                  </div>
                  <span className="text-xs text-gray-400 font-mono shrink-0">
                    {lang.code.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
