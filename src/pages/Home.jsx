import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api"; // mantiene la ruta correcta

export default function Home() {
  const [events, setEvents] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.getEvents(); // ✅ usar el método correcto
        // Acepta distintos "shapes" de la API:
        const arr = Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.results)
          ? res.results
          : [];
        if (mounted) setEvents(arr);
      } catch (e) {
        const msg =
          e?.message ||
          (Array.isArray(e?.body?.detail) ? e.body.detail.map(d => d.msg).join(" | ") : "") ||
          "Error al cargar eventos";
        setErr(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = events.filter((ev) => {
    const term = q.trim().toLowerCase();
    if (!term) return true;
    const hay = `${ev?.name ?? ""} ${ev?.category ?? ""} ${ev?.location ?? ""}`.toLowerCase();
    return hay.includes(term);
  });

  if (loading) return <div className="p-4">Cargando eventos…</div>;
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>;

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Eventos</h1>
      <Link
        to="/purchases"
        className="inline-block bg-blue-600 text-white px-4 py-2 rounded mb-4"
      >
  Mis Compras
</Link>

      <input
        className="border rounded px-3 py-2 w-full mb-4"
        placeholder="Buscar por nombre, categoría o ubicación…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {filtered.length === 0 ? (
        <p>No hay eventos para mostrar.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ev) => {
            const id = ev.id || ev._id || ev.event_id; // 🔎 defensivo
            return (
              <div key={id} className="border rounded-lg overflow-hidden">
                {ev.image && (
                  <img src={ev.image} alt={ev.name} className="w-full h-40 object-cover" />
                )}
                <div className="p-3">
                  <h2 className="font-semibold text-lg">{ev.name}</h2>
                  <p className="text-sm text-gray-600">
                    {ev.category} {ev.category && ev.location ? "–" : ""} {ev.location}
                  </p>
                  {ev.date && (
                    <p className="text-sm text-gray-600">
                      Fecha: {new Date(ev.date).toLocaleString()}
                    </p>
                  )}
                  <Link
                    to={`/events/${id}`}
                    className="inline-block mt-3 px-3 py-2 rounded bg-black text-white"
                  >
                    Ver detalle
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
