import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api } from "../api";

const RESERVE_WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const MAX_PER_PERSON = 5;                 // 👈 LÍMITE

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // Selección simple de tickets (puedes ampliar a más tipos luego)
  const [qtyGeneral, setQtyGeneral] = useState(1);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const data = await api.getEvent(id);
        const ev = Array.isArray(data) ? data[0] : data;
        if (!active) return;
        setEvent(ev || null);
      } catch (e) {
        if (!active) return;
        setErr("No se pudo cargar el evento.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  // ---- Carrusel: normaliza posibles campos de imágenes del backend ----
  const gallery = useMemo(() => {
    const pick = (x) => (typeof x === "string" ? x : x?.url || x?.src || null);
    const arr = [
      ...(event?.image ? [event.image] : []),
      ...(Array.isArray(event?.images) ? event.images : []),
      ...(Array.isArray(event?.gallery) ? event.gallery : []),
      ...(Array.isArray(event?.photos) ? event.photos : []),
    ]
      .map(pick)
      .filter(Boolean);
    return Array.from(new Set(arr));
  }, [event]);

  const [idx, setIdx] = useState(0);
  const hasGallery = gallery.length > 0;
  const safeIdx = hasGallery ? Math.max(0, Math.min(idx, gallery.length - 1)) : 0;

  const prev = () => hasGallery && setIdx((i) => (i - 1 + gallery.length) % gallery.length);
  const next = () => hasGallery && setIdx((i) => (i + 1) % gallery.length);

  // teclado ← →
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasGallery, gallery.length]);

  // swipe táctil
  const touchStartX = useRef(null);
  const onTouchStart = (e) => { touchStartX.current = e.touches?.[0]?.clientX ?? null; };
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = (e.changedTouches?.[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    if (Math.abs(dx) > 40) (dx > 0 ? prev() : next());
    touchStartX.current = null;
  };

  // Items seleccionados y total para validar el límite
  const items = useMemo(() => {
    const arr = [];
    if (qtyGeneral > 0) arr.push({ type: "General", quantity: qtyGeneral });
    return arr;
  }, [qtyGeneral]);

  const totalSelected = useMemo(
    () => items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0),
    [items]
  );

  // Helpers para +/- respetando el límite
  const decGeneral = () => setQtyGeneral((q) => Math.max(0, q - 1));
  const incGeneral = () =>
    setQtyGeneral((q) => (totalSelected >= MAX_PER_PERSON ? q : Math.min(MAX_PER_PERSON, q + 1)));

  async function handleReserve() {
    try {
      if (!items.length) {
        alert("Selecciona al menos 1 ticket.");
        return;
      }
      if (totalSelected > MAX_PER_PERSON) {
        alert(`Máximo ${MAX_PER_PERSON} entradas por persona.`);
        return;
      }
      const reservation = await api.createReservation({ event_id: id, items });
      const reservationId = reservation.reservation_id || reservation.id || reservation._id;
      const total = reservation.total_price ?? reservation.total ?? 0;
      const itemsFromApi = reservation.items ?? items;
      const expiresAt = Date.now() + RESERVE_WINDOW_MS;

      sessionStorage.setItem(
        `reservation:${reservationId}`,
        JSON.stringify({
          reservation_id: reservationId,
          items: itemsFromApi,
          total_price: total,
          status: reservation.status || "PENDING",
          event_id: id,
          expires_at: expiresAt,
        })
      );

      navigate("/checkout", { state: { reservationId, items: itemsFromApi, total_price: total } });
    } catch (e) {
      console.error(e);
      alert("No se pudo crear la reserva. Intenta nuevamente.");
    }
  }

  if (loading) return <div className="p-4">Cargando evento…</div>;
  if (err) return <div className="p-4">{err}</div>;
  if (!event) return <div className="p-4">Evento no encontrado.</div>;

  return (
    <section className="grid gap-6 md:grid-cols-[1fr,0.9fr]">
      {/* Panel izquierdo: imagen + info */}
      <div className="rounded-lg border bg-white">
        {/* ------- Carrusel ------- */}
        <div className="carousel" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {hasGallery ? (
            <img
              className="w-full h-64 object-cover"
              src={gallery[safeIdx]}
              alt={event?.name || "Evento"}
              loading="eager"
            />
          ) : (
            <div className="w-full h-64 object-cover" />
          )}

          {gallery.length > 1 && (
            <>
              <button type="button" className="carousel-nav left" onClick={prev} aria-label="Anterior">‹</button>
              <button type="button" className="carousel-nav right" onClick={next} aria-label="Siguiente">›</button>
              <div className="carousel-dots" role="tablist" aria-label="Navegación de imágenes">
                {gallery.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`dot ${i === safeIdx ? "active" : ""}`}
                    onClick={() => setIdx(i)}
                    aria-current={i === safeIdx ? "true" : "false"}
                    aria-label={`Ir a imagen ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-5">
          <h1 className="text-gradient-blue">{event?.name || "Evento"}</h1>
          <div className="text-sm text-gray-700">
            {event?.date ? new Date(event.date).toLocaleString() : "Fecha por confirmar"}
          </div>
          {event?.location && <div className="text-sm text-gray-700 mt-1">Ubicación: {event.location}</div>}
          {event?.category && <div className="text-sm text-gray-700 mt-1">Categoría: {event.category}</div>}
          {event?.description && <p className="mt-3 text-gray-700">{event.description}</p>}

          <div className="mt-4">
            <Link to="/" className="btn btn--ghost">← Volver</Link>
          </div>
        </div>
      </div>

      {/* Panel derecho: selección de tickets / acciones */}
      <aside className="rounded-lg border bg-white p-5">
        <h2 className="card-title">Selecciona tus tickets</h2>
        <p className="card-meta">
          Máximo {MAX_PER_PERSON} entradas por persona. Reserva válida por 10 minutos una vez creada en el Checkout.
        </p>

        <div className="mt-3">
          <label className="grid gap-1">
            <span>Entrada General</span>
            <div className="row" style={{ gap: ".5rem", alignItems: "center" }}>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={decGeneral}
                disabled={qtyGeneral <= 0}
              >
                −
              </button>

              <input
                type="number"
                min={0}
                max={MAX_PER_PERSON}
                value={qtyGeneral}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(MAX_PER_PERSON, parseInt(e.target.value || "0", 10)));
                  setQtyGeneral(v);
                }}
                style={{ width: 80, textAlign: "center" }}
              />

              <button
                type="button"
                className="btn"
                onClick={incGeneral}
                disabled={totalSelected >= MAX_PER_PERSON}
                title={totalSelected >= MAX_PER_PERSON ? `Máximo ${MAX_PER_PERSON}` : "Agregar una entrada"}
              >
                +
              </button>
            </div>
            <span className="card-meta" style={{ marginTop: ".25rem" }}>
              Seleccionadas: {totalSelected}/{MAX_PER_PERSON}
            </span>
          </label>
        </div>

        {/* ⚠ Cambiado a .summary-box para contraste en ambos modos */}
        <div className="mt-4 summary-box">
          <h3 className="text-base font-medium">Resumen</h3>
          {items.length ? (
            <ul className="mt-2 text-sm list-disc pl-6">
              {items.map((it, i) => (<li key={i}>{it.type}: {it.quantity}</li>))}
            </ul>
          ) : (
            <p className="text-gray-600 mt-1">Aún no seleccionas tickets.</p>
          )}
        </div>

        <div className="actions mt-4">
          <button
            className="w-full px-4 py-2 rounded btn--gradient hover:opacity-90"
            onClick={handleReserve}
            disabled={totalSelected === 0 || totalSelected > MAX_PER_PERSON}
            title={totalSelected === 0 ? "Selecciona al menos 1" : totalSelected > MAX_PER_PERSON ? `Máximo ${MAX_PER_PERSON}` : "Reservar"}
          >
            Reservar y continuar
          </button>
        </div>
      </aside>
    </section>
  );
}
