import { Scanner } from "@yudiel/react-qr-scanner";
import { useState } from "react";

export default function BarcodeScanner({ onScan }) {
  const [error, setError] = useState(null);

  return (
    <div style={{ maxWidth: 400, margin: "0 auto" }}>
      <Scanner
        onScan={(detectedCodes) => {
          if (detectedCodes.length > 0) {
            const code = detectedCodes[0].rawValue;
            onScan(code);
          }
        }}
        onError={(err) => setError(err.message)}
        formats={["ean_13", "ean_8", "upc_a", "upc_e", "code_128"]}
        paused={false}
        styles={{ container: { width: "100%" } }}
      />
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
