import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";

export default function EventDetail() {
  const { id } = useParams(); // ID del evento desde la URL
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tickets, setTickets] = useState({}); // { type: cantidad }

  // Cargar el evento al montar
  useEffect(() => {
    api.getEvent(id)
      .then((res) => {
        setEvent(res);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="p-4">Cargando evento...</p>;
  if (error) return <p className="p-4 text-red-500">Error: {error}</p>;
  if (!event) return <p className="p-4">Evento no encontrado</p>;

  // Cambiar cantidad de tickets seleccionados
  const handleTicketChange = (type, quantity) => {
    setTickets((prev) => ({ ...prev, [type]: quantity }));
  };

  // Crear reserva y redirigir a checkout
  const handleReserve = async () => {
    try {
      const items = Object.entries(tickets)
        .filter(([_, qty]) => qty > 0)
        .map(([type, quantity]) => ({ type, quantity }));

      if (items.length === 0) {
        alert("Selecciona al menos un ticket");
        return;
      }

      const payload = {
        event_id: id,
        items,
      };

      console.log("Reserva payload:", payload);

      const reservation = await api.createReservation(payload);

      // Redirigir al checkout con reservation_id
      navigate("/checkout", { state: { reservationId: reservation.reservation_id } });
    } catch (err) {
      alert("Error al crear reserva: " + err.message);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{event.name} 🎟️</h1>
      <img
        src={event.image || "https://via.placeholder.com/600x300"}
        alt={event.name}
        className="w-full h-64 object-cover rounded mb-4"
      />
      <p className="text-sm text-gray-600">{event.category}</p>
      <p className="text-sm text-gray-600">{new Date(event.date).toLocaleString()}</p>
      <p className="text-sm text-gray-600">{event.location}</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Tickets disponibles</h2>
      {event.tickets?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {event.tickets.map((t) => (
            <div key={t.name} className="border p-4 rounded shadow">
              <h3 className="font-semibold">{t.name}</h3>
              <p className="text-sm text-gray-600">
                Precio: ${t.price} | Disponibles: {t.available}
              </p>
              <input
                type="number"
                min="0"
                max={t.available}
                value={tickets[t.name] || 0}
                onChange={(e) => handleTicketChange(t.name, parseInt(e.target.value))}
                className="mt-2 border rounded px-2 py-1 w-20"
              />
            </div>
          ))}
        </div>
      ) : (
        <p>No hay tickets disponibles para este evento.</p>
      )}

      <button
        onClick={handleReserve}
        className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
      >
        Reservar tickets
      </button>
    </div>
  );
}
