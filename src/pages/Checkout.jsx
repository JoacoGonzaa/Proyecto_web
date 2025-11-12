import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";

const RESERVE_WINDOW_MS = 10 * 60 * 1000; // ⏱️ 10 minutos

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [reservation, setReservation] = useState(null);
  const [event, setEvent] = useState(null);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);

  // ⏱️ estado del contador
  const [remainingMs, setRemainingMs] = useState(null);
  const [expired, setExpired] = useState(false);

  // Carga reserva desde sessionStorage (creada en EventDetail)
  useEffect(() => {
    const rid = location?.state?.reservationId;
    const key = rid ? `reservation:${rid}` : null;
    let saved = null;
    if (key) {
      try { saved = JSON.parse(sessionStorage.getItem(key) || "null"); } catch {}
    } else {
      // fallback: tomar la última que exista
      const lastKey = Object.keys(sessionStorage).find((k) => k.startsWith("reservation:"));
      try { saved = lastKey ? JSON.parse(sessionStorage.getItem(lastKey)) : null; } catch {}
    }

    // Si no hay expires_at (reservas anteriores), darle 10 min desde ahora
    if (saved) {
      const now = Date.now();
      const expires = typeof saved.expires_at === "number" ? saved.expires_at : now + RESERVE_WINDOW_MS;
      saved.expires_at = expires;
      setReservation(saved);
      setRemainingMs(Math.max(0, expires - now));
      setExpired(expires <= now);
    }

    setLoading(false);
  }, [location?.state?.reservationId]);

  // Trae datos del evento para el panel derecho
  useEffect(() => {
    if (!reservation?.event_id) return;
    let active = true;
    (async () => {
      try {
        const ev = await api.getEvent(reservation.event_id);
        if (!active) return;
        setEvent(Array.isArray(ev) ? ev[0] : ev);
      } catch {
        setEvent(null); // no bloquear el checkout si falla
      }
    })();
    return () => (active = false);
  }, [reservation?.event_id]);

  // ⏱️ Intervalo 1s para actualizar el contador y expirar
  useEffect(() => {
    if (!reservation?.expires_at) return;
    const tick = () => {
      const now = Date.now();
      const left = Math.max(0, reservation.expires_at - now);
      setRemainingMs(left);
      setExpired(left === 0);
      if (left === 0) {
        try { sessionStorage.removeItem(`reservation:${reservation.reservation_id}`); } catch {}
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [reservation?.reservation_id, reservation?.expires_at]);

  // Reintenta crear reserva si la existente está inválida (conserva la expiración original)
  async function recreateReservationIfNeeded(e) {
    if (!reservation?.items?.length || !reservation?.event_id) return null;
    try {
      const res = await api.createReservation({
        event_id: reservation.event_id,
        items: reservation.items,
      });
      const newId = res.reservation_id || res.id || res._id;
      const total = res.total_price ?? res.total ?? 0;
      const itemsFromApi = res.items ?? reservation.items;

      const updated = {
        reservation_id: newId,
        items: itemsFromApi,
        total_price: total,
        status: res.status || "PENDING",
        event_id: reservation.event_id,
        expires_at: reservation.expires_at,
      };
      sessionStorage.setItem(`reservation:${newId}`, JSON.stringify(updated));
      setReservation(updated);
      return newId;
    } catch {
      return null;
    }
  }

  const itemsList = useMemo(() => reservation?.items ?? [], [reservation?.items]);
  const totalPrice = reservation?.total_price ?? 0;

  function fmt(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  async function handleConfirmPurchase() {
    if (expired) {
      setError("La reserva expiró. Vuelve a seleccionar tus tickets.");
      return;
    }
    if (!reservation?.reservation_id) return;
    setConfirming(true);
    setError(null);

    const tryCheckout = async (rid) => {
      const payload = {
        reservation_id: rid,
        buyer: { name: buyerName.trim(), email: buyerEmail.trim() },
        payment_method: "card_simulated",
      };
      return await api.checkout(payload);
    };

    try {
      if (!buyerName.trim() || !buyerEmail.trim())
        throw new Error("Completa nombre y correo para continuar.");

      let result;
      try {
        result = await tryCheckout(reservation.reservation_id);
      } catch (e1) {
        const newId = await recreateReservationIfNeeded(e1);
        if (!newId) throw e1;
        result = await tryCheckout(newId);
      }

      try { sessionStorage.removeItem(`reservation:${reservation.reservation_id}`); } catch {}

      // respaldo local (opcional)
      try {
        const purchaseObj = result?.purchase ?? result ?? {};
        const locals = JSON.parse(localStorage.getItem("purchases:local") || "[]");
        locals.unshift(purchaseObj);
        localStorage.setItem("purchases:local", JSON.stringify(locals.slice(0, 50)));
      } catch {}

      navigate("/purchases");
    } catch (e) {
      setError(e?.message || "Ocurrió un error al confirmar.");
    } finally {
      setConfirming(false);
    }
  }

  if (loading) return <div className="p-4">Cargando checkout…</div>;
  if (!reservation) return <div className="p-4">No hay información de la reserva.</div>;

  return (
    <section className="checkout-two">
      {/* Izquierda: formulario */}
      <div className="checkout-card">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Checkout</h1>
          <button className="btn--ghost" onClick={() => navigate(-1)}>← Volver</button>
        </div>

        <div className="mt-2 text-sm text-gray-700" style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap"}}>
          <span><span className="font-medium">Reservation ID:</span> {reservation.reservation_id}</span>

          <span
            className={`badge ${expired ? "badge--danger" : "badge--warn"}`}
            title={expired ? "La reserva expiró" : "Tiempo restante para completar la compra"}
          >
            {expired ? "Expirada" : `Reserva: ${fmt(remainingMs ?? 0)}`}
          </span>
        </div>

        {expired && (
          <p className="mt-2 text-sm" style={{color:"#dc2626"}}>
            Tu reserva expiró. Vuelve a la página del evento para seleccionar tus tickets nuevamente.
          </p>
        )}

        <div className="form-grid mt-3">
          <label className="grid gap-1">
            <span>Nombre y apellido</span>
            <input
              placeholder="Ej: Camilo Pérez"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              disabled={expired}
            />
          </label>
          <label className="grid gap-1">
            <span>Correo</span>
            <input
              type="email"
              placeholder="correo@dominio.cl"
              value={buyerEmail}
              onChange={(e) => setBuyerEmail(e.target.value)}
              disabled={expired}
            />
          </label>
        </div>

        {error && <p className="mt-2 text-sm" style={{color:"#dc2626"}}>⚠ {error}</p>}

        {/* ⚠ Cambiado a .summary-box para contraste en ambos modos */}
        <div className="mt-4 summary-box">
          <h2 className="text-base font-medium">Resumen</h2>
          {itemsList?.length ? (
            <ul className="mt-2 text-sm list-disc pl-6">
              {itemsList.map((item, idx) => (
                <li key={idx}>{item.type}: {item.quantity}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600 mt-1">No se proporcionaron detalles de tickets.</p>
          )}
          <p className="mt-3 font-semibold">Total: ${totalPrice}</p>
        </div>

        <div className="actions mt-4">
          {/* 🔁 Antes era un bg-black (poco visible en oscuro). Ahora gradiente accesible. */}
          <button
            className="w-full px-4 py-2 rounded btn--gradient hover:opacity-90 disabled:opacity-50"
            disabled={confirming || expired}
            onClick={handleConfirmPurchase}
          >
            {confirming ? "Confirmando..." : "Confirmar compra"}
          </button>
        </div>
      </div>

      {/* Derecha: cubo con info del concierto (imagen + datos) */}
      <aside className="order-summary">
        {event?.image ? (
          <img className="banner" src={event.image} alt={event?.name || "Evento"} />
        ) : (
          <div className="banner" />
        )}
        <div className="body">
          <div className="title">{event?.name || "Evento"}</div>
          <div className="meta">
            {event?.date ? new Date(event.date).toLocaleString() : "Fecha por confirmar"}
          </div>
          {event?.location && <div className="meta">Ubicación: {event.location}</div>}
          {event?.category && <div className="meta">Categoría: {event.category}</div>}

          <h3 className="mt-3" style={{fontWeight:700}}>Tus tickets</h3>
          {itemsList?.length ? (
            <ul className="mt-1 text-sm list-disc pl-6">
              {itemsList.map((it, i) => (
                <li key={i}>{it.type}: {it.quantity}</li>
              ))}
            </ul>
          ) : (
            <div className="meta mt-1">Sin selección</div>
          )}

          <div className="total">Total: ${totalPrice}</div>
        </div>
      </aside>
    </section>
  );
}
