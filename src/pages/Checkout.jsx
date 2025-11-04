import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { reservationId } = location.state || {};

  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!reservationId) {
      setError("No se proporcionó ID de reserva");
      setLoading(false);
      return;
    }

    // Simulamos obtener info de la reserva desde API
    // Algunos backends permiten GET /reservations/:id, si no, usar estado
    // Aquí asumimos que la API createReservation devuelve la info completa
    // Como ejemplo simple:
    setReservation({ reservation_id: reservationId, items: [], total_price: 0, status: "PENDING" });
    setLoading(false);
  }, [reservationId]);

  const handleConfirmPurchase = async () => {
    if (!reservationId) return;
    try {
      setConfirming(true);
      const payload = { reservation_id: reservationId };
      const result = await api.checkout(payload);
      alert(`Compra confirmada ✅\nTotal: $${result.total_price}`);
      navigate("/purchases"); // Redirige al historial de compras
    } catch (err) {
      alert("Error al confirmar compra: " + err.message);
    } finally {
      setConfirming(false);
    }
  };

  if (loading) return <p className="p-4">Cargando reserva...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Checkout 🛒</h1>
      <p>Reservation ID: {reservation.reservation_id}</p>
      <p>Status: {reservation.status}</p>

      <h2 className="text-xl font-semibold mt-4 mb-2">Tickets</h2>
      {reservation.items.length > 0 ? (
        <ul className="list-disc pl-6">
          {reservation.items.map((item, index) => (
            <li key={index}>
              {item.type}: {item.quantity}
            </li>
          ))}
        </ul>
      ) : (
        <p>No se proporcionaron detalles de tickets.</p>
      )}

      <p className="mt-2 font-semibold">Total: ${reservation.total_price}</p>

      <button
        onClick={handleConfirmPurchase}
        disabled={confirming}
        className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
      >
        {confirming ? "Confirmando..." : "Confirmar compra"}
      </button>
    </div>
  );
}
