import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();

  // reservationId inicial (puede venir por state)
  const initialReservationId = location.state?.reservationId;

  const [reservation, setReservation] = useState(null); // { reservation_id, items, total_price, status, event_id }
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);

  // Carga info de reserva desde state o sessionStorage
  useEffect(() => {
    const rid = initialReservationId;
    if (!rid) {
      setError("No se proporcionó ID de reserva");
      setLoading(false);
      return;
    }
    // 1) state
    if (location.state?.items || location.state?.total_price !== undefined) {
      setReservation({
        reservation_id: rid,
        items: location.state.items || [],
        total_price: location.state.total_price ?? 0,
        status: "PENDING",
        event_id: location.state?.event_id, // por si lo mandas en navigate
      });
      setLoading(false);
      return;
    }
    // 2) sessionStorage
    const cached = sessionStorage.getItem(`reservation:${rid}`);
    if (cached) {
      setReservation(JSON.parse(cached));
      setLoading(false);
      return;
    }
    // 3) fallback
    setReservation({ reservation_id: rid, items: [], total_price: 0, status: "PENDING" });
    setLoading(false);
  }, [initialReservationId, location.state]);

  // Error formatter (FastAPI)
  function formatFastapiError(e) {
    try {
      const details = Array.isArray(e?.body?.detail) ? e.body.detail : null;
      if (details && details.length) {
        return details
          .map((d) => {
            const where = Array.isArray(d.loc) ? d.loc.join(" > ") : String(d.loc ?? "");
            return `${where}: ${d.msg}`;
          })
          .join(" | ");
      }
      return e?.message || JSON.stringify(e);
    } catch {
      return e?.message || String(e);
    }
  }

  // Re-crea una reserva si la actual está inactiva
  async function recreateReservationIfNeeded(err) {
    const msg = (err?.message || "").toLowerCase();
    const inactive = msg.includes("not active") || msg.includes("inactive") || msg.includes("expired");
    if (!inactive) return null;

    // Necesitamos event_id e items para re-crear
    const event_id =
      reservation?.event_id ||
      location.state?.event_id ||
      JSON.parse(sessionStorage.getItem(`reservation:${reservation?.reservation_id}`) || "{}")?.event_id;

    const items = reservation?.items || [];

    if (!event_id || !items?.length) {
      throw new Error("La reserva está inactiva y no hay datos para recrearla (event_id/items faltan). Vuelve al detalle del evento y reserva de nuevo.");
    }

    const newRes = await api.createReservation({ event_id, items });
    const newId = newRes.reservation_id || newRes.id || newRes._id;
    const total = newRes.total_price ?? newRes.total ?? reservation?.total_price ?? 0;
    const itemsFromApi = newRes.items ?? items;

    // Actualiza estado y cache
    const newObj = {
      reservation_id: newId,
      items: itemsFromApi,
      total_price: total,
      status: newRes.status || "PENDING",
      event_id,
    };
    setReservation(newObj);
    sessionStorage.setItem(`reservation:${newId}`, JSON.stringify(newObj));

    // Borra cache anterior
    if (reservation?.reservation_id) {
      sessionStorage.removeItem(`reservation:${reservation.reservation_id}`);
    }

    return newId;
  }

  // Campos del comprador
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");

  const handleConfirmPurchase = async () => {
    if (!reservation?.reservation_id) return;

    setConfirming(true);
    setError(null);

    const tryCheckout = async (rid) => {
      const payload = {
        reservation_id: rid,
        buyer: {
          name: buyerName.trim(),
          email: buyerEmail.trim(),
        },
        payment_method: "card_simulated",
      };
      console.log("Checkout → payload:", payload);
      const result = await api.checkout(payload);
      console.log("Checkout → result:", result);
      return result;
    };

    try {
      // Validación rápida de comprador
      if (!buyerName.trim() || !buyerEmail.trim()) {
        throw new Error("Completa nombre y correo para continuar.");
      }

      // 1) intento con la reserva actual
      let result;
      try {
        result = await tryCheckout(reservation.reservation_id);
      } catch (e1) {
        const msg1 = formatFastapiError(e1);
        console.warn("Checkout intento 1 falló:", msg1);

        // 2) si está inactiva, re-crear y reintentar
        const newId = await recreateReservationIfNeeded(e1);
        if (!newId) throw e1; // no era inactiva, propaga el error original

        result = await tryCheckout(newId);
      }

      // OK
      sessionStorage.removeItem(`reservation:${reservation.reservation_id}`);

      // ✅ Guardar la compra local para que aparezca en "Mis Compras"
      try {
        const purchaseObj = result?.purchase ?? result ?? {};
        const list = JSON.parse(localStorage.getItem("purchases:local") || "[]");
        const pid = purchaseObj.purchase_id || purchaseObj.id || purchaseObj._id || `${Date.now()}`;
        const dedup = list.filter(p => (p.purchase_id || p.id || p._id) !== pid);
        localStorage.setItem("purchases:local", JSON.stringify([...dedup, { ...purchaseObj, _id: pid }]));
      } catch {}

      alert(`Compra confirmada ✅\nTotal: $${result?.total_price ?? reservation?.total_price ?? 0}`);
      navigate("/purchases");
    } catch (e) {
      const msg = formatFastapiError(e);
      alert("Error al confirmar compra:\n" + msg);
      setError(msg);
    } finally {
      setConfirming(false);
    }
  };

  if (loading) return <div className="p-4">Cargando checkout…</div>;
  if (!reservation) return <div className="p-4">No hay información de la reserva.</div>;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <button className="mb-3 text-blue-700" onClick={() => navigate(-1)}>
        ← Volver
      </button>

      <h1 className="text-2xl font-bold mb-4">Checkout</h1>

      <div className="border rounded p-4 space-y-4">
        <div className="text-sm text-gray-700">
          <span className="font-semibold">Reservation ID:</span> {reservation.reservation_id}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Datos del comprador</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="border rounded px-3 py-2 w-full"
              placeholder="Nombre y apellido"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
            />
            <input
              className="border rounded px-3 py-2 w-full"
              type="email"
              placeholder="Correo"
              value={buyerEmail}
              onChange={(e) => setBuyerEmail(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600 mt-2">Último error: {error}</p>}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Tickets</h2>
          {reservation.items?.length ? (
            <ul className="list-disc pl-6">
              {reservation.items.map((item, idx) => (
                <li key={idx}>
                  {item.type}: {item.quantity}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">No se proporcionaron detalles de tickets.</p>
          )}
          <p className="mt-3 font-semibold">Total: ${reservation.total_price ?? 0}</p>
        </div>

        <button
          className="mt-2 px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          disabled={confirming}
          onClick={handleConfirmPurchase}
        >
          {confirming ? "Confirmando..." : "Confirmar compra"}
        </button>
      </div>
    </div>
  );
}
