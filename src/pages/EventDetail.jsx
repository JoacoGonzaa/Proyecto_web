import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api"; // 👈 correcto

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [tickets, setTickets] = useState({}); // { [typeName]: quantity }

  useEffect(() => {
    let mounted = true;
    api
      .getEvent(id)
      .then((res) => {
        const ev = Array.isArray(res) ? res[0] : res;
        if (mounted) {
          setEvent(ev);
          // Inicializa el mapa de cantidades en 0 por cada tipo válido
          const init = {};
          getTicketTypes(ev).forEach((t) => (init[t] = 0));
          setTickets(init);
        }
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
    return () => (mounted = false);
  }, [id]);

  // Lista de nombres de tipo (strings) válidos para el backend
  const ticketTypes = useMemo(() => getTicketTypes(event), [event]);

  const handleQty = (type, delta) => {
    setTickets((prev) => {
      const next = Math.max(0, (prev[type] ?? 0) + delta);
      return { ...prev, [type]: next };
    });
  };

  // Items seleccionados listos para API
  const selectedItems = useMemo(
    () =>
      Object.entries(tickets)
        .filter(([, qty]) => qty > 0)
        .map(([type, quantity]) => ({ type, quantity })), // 👈 aquí va el NOMBRE, no el índice
    [tickets]
  );

  const handleReserve = async () => {
    try {
      if (selectedItems.length === 0) {
        alert("Selecciona al menos un ticket");
        return;
      }

      const payload = { event_id: id, items: selectedItems };
      // Para depurar si hace falta:
      // console.log("Reserva → payload:", payload);

      const reservation = await api.createReservation(payload);

      const reservationId = reservation.reservation_id || reservation.id || reservation._id;
      const total = reservation.total_price ?? reservation.total ?? 0;
      const itemsFromApi = reservation.items ?? selectedItems;

      // backup por si recargan Checkout
      sessionStorage.setItem(
        `reservation:${reservationId}`,
        JSON.stringify({
          reservation_id: reservationId,
          items: itemsFromApi,
          total_price: total,
          status: reservation.status || "PENDING",
          event_id: id,
        })
      );

      navigate("/checkout", {
        state: { reservationId, items: itemsFromApi, total_price: total },
      });
    } catch (e) {
      alert("Error al crear reserva: " + e.message);
    }
  };

  if (loading) return <div className="p-4">Cargando evento…</div>;
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>;
  if (!event) return <div className="p-4">Evento no encontrado.</div>;

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <button className="mb-3 text-blue-700" onClick={() => navigate(-1)}>
        ← Volver
      </button>

      <div className="border rounded-lg overflow-hidden">
        {event.image && (
          <img src={event.image} alt={event.name} className="w-full h-60 object-cover" />
        )}
        <div className="p-4">
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <p className="text-gray-700">{event.description}</p>
          <p className="text-sm text-gray-600 mt-2">
            Categoría: {event.category} — Ubicación: {event.location}
          </p>
          {event.date && (
            <p className="text-sm text-gray-600">Fecha: {new Date(event.date).toLocaleString()}</p>
          )}

          <h2 className="text-xl font-semibold mt-5 mb-2">Tickets</h2>
          {ticketTypes.length === 0 ? (
            <p>No hay tipos de ticket definidos en este evento.</p>
          ) : (
            <div className="space-y-2">
              {ticketTypes.map((type) => (
                <div key={type} className="flex items-center justify-between border rounded px-3 py-2">
                  <div className="flex-1">
                    <p className="font-medium">{labelize(type)}</p>
                    {/* Si tu evento trae precios por tipo, puedes mostrarlos aquí */}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1 border rounded"
                      onClick={() => handleQty(type, -1)}
                    >
                      -
                    </button>
                    <span className="w-8 text-center">{tickets[type] ?? 0}</span>
                    <button
                      className="px-3 py-1 border rounded"
                      onClick={() => handleQty(type, +1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            className="mt-4 px-4 py-2 rounded bg-black text-white disabled:opacity-50"
            onClick={handleReserve}
            disabled={selectedItems.length === 0}
          >
            Reservar
          </button>
        </div>
      </div>
    </div>
  );
}

/** ===================== Helpers ===================== **/

// Devuelve SIEMPRE un array de strings con los nombres de tipos válidos
function getTicketTypes(ev) {
  if (!ev) return [];

  // Caso 1: backend expone ticket_types como array de objetos
  // ej: [{ type: "general", price: 10000 }, { type: "vip", price: 20000 }]
  if (Array.isArray(ev.ticket_types)) {
    return ev.ticket_types.map((t) => t.type || t.name).filter(Boolean);
  }

  // Caso 2: backend expone tickets como ARRAY de objetos
  // ej: [{ type: "general" }, { type: "vip" }]
  if (Array.isArray(ev.tickets)) {
    return ev.tickets.map((t) => t.type || t.name).filter(Boolean);
  }

  // Caso 3: backend expone tickets como OBJETO (no array)
  // ej: { general: {...}, vip: {...} }
  if (ev.tickets && typeof ev.tickets === "object") {
    return Object.keys(ev.tickets);
  }

  // Fallback: al menos un tipo genérico
  return ["general"];
}

function labelize(s) {
  try {
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
  } catch {
    return s;
  }
}
