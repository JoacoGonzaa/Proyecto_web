import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getPurchases()
      .then((res) => {
        console.log("API Purchases Response:", res);
        setPurchases(res.data || []); // usamos res.data si viene en ese formato
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-4">Cargando historial de compras...</p>;
  if (error) return <p className="p-4 text-red-500">Error: {error}</p>;

  if (purchases.length === 0)
    return <p className="p-4">No has realizado compras todavía.</p>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Historial de compras 🧾</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {purchases.map((purchase) => (
          <div
            key={purchase.purchase_id}
            className="border p-4 rounded shadow"
          >
            <p className="text-sm text-gray-600">
              Fecha: {new Date(purchase.date).toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">
              Estado: {purchase.status}
            </p>
            <p className="font-semibold mt-2">Total: ${purchase.total_price}</p>

            <h3 className="mt-2 font-semibold">Tickets:</h3>
            {purchase.items?.length > 0 ? (
              <ul className="list-disc pl-6">
                {purchase.items.map((item, index) => (
                  <li key={index}>
                    {item.type}: {item.quantity}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No hay detalles de tickets.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
