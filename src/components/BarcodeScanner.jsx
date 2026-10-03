import { Scanner } from "@yudiel/react-qr-scanner";
import { useState } from "react";

export default function BarcodeScanner({ onScan }) {
  const [error, setError] = useState(null);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200">
        <Scanner
          onScan={(detectedCodes) => {
            if (detectedCodes.length > 0) {
              onScan(detectedCodes[0].rawValue);
            }
          }}
          onError={(err) => setError(err.message)}
          formats={["ean_13", "ean_8", "upc_a", "upc_e", "code_128"]}
          paused={false}
        />
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-500 text-center">{error}</p>
      )}
    </div>
  );
}
