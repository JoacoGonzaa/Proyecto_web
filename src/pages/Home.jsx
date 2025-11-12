// src/pages/Home.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function Home() {
  const [events, setEvents] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // Paginación
  const PAGE_SIZE = 12;
  const [page, setPage] = useState(1);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.getEvents();
        const arr = Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.results)
          ? res.results
          : [];
        if (mounted) setEvents(arr);
      } catch (e) {
        setErr(e?.message || "Error al cargar eventos");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  // Filtro
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return events;
    return events.filter((ev) => {
      const hay = `${ev?.name ?? ""} ${ev?.category ?? ""} ${ev?.location ?? ""}`.toLowerCase();
      return hay.includes(term);
    });
  }, [q, events]);

  // Resetear a página 1 cada vez que cambia el filtro
  useEffect(() => { setPage(1); }, [q]);

  // Cálculos de paginación
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  const goTo = (p) => setPage(Math.max(1, Math.min(p, pageCount)));
  const pagesToShow = (() => {
    // rango compacto: primeras/últimas y entorno de la actual
    const arr = new Set([1, 2, pageCount - 1, pageCount, currentPage - 1, currentPage, currentPage + 1]);
    return [...arr].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  })();

  return (
    <section className="container">
      {/* Encabezado (el botón Mis Compras ya está ARRIBA en el header global) */}
      <div className="row">
        <h1 className="h1">Eventos</h1>
        <div className="searchbar" style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
          <input
            className="input"
            placeholder="Buscar eventos..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {/* Eliminado: <Link to="/purchases" className="btn">Mis Compras</Link> */}
        </div>
      </div>

      {/* Contenido */}
      {loading && (
        <div className="grid-3 mt-16">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton">
              <div className="block" style={{ height: "112px" }}></div>
              <div className="block" style={{ width: "70%" }}></div>
              <div className="block" style={{ width: "50%" }}></div>
            </div>
          ))}
        </div>
      )}

      {!loading && err && <div className="error mt-16">⚠ {err}</div>}

      {!loading && !err && (
        <>
          {filtered.length === 0 ? (
            <div className="empty mt-16">No hay eventos que coincidan con “{q}”.</div>
          ) : (
            <>
              <div className="grid-3 mt-16">
                {pageItems.map((ev) => {
                  const id = ev.id || ev._id || ev.event_id;
                  const dateStr = ev.date ? new Date(ev.date).toLocaleDateString() : "";
                  return (
                    <div key={id} className="card">
                      {ev.image ? (
                        <img src={ev.image} alt={ev.name} className="card-img" loading="lazy" />
                      ) : (
                        <div className="card-img" />
                      )}
                      <div className="card-body">
                        <h2 className="card-title">{ev.name}</h2>
                        <p className="card-meta">{dateStr || "Fecha por confirmar"}</p>
                        <Link to={`/events/${id}`} className="btn">Ingresar</Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Paginación */}
              <nav className="pagination">
                <button className="page-btn" onClick={() => goTo(currentPage - 1)} disabled={currentPage === 1}>
                  ← Anterior
                </button>

                {pagesToShow.map((n, idx) => {
                  const prev = pagesToShow[idx - 1];
                  const showDots = prev && n - prev > 1;
                  return (
                    <React.Fragment key={n}>
                      {showDots && <span className="page-dots">…</span>}
                      <button
                        className={`page-btn${n === currentPage ? " active" : ""}`}
                        aria-current={n === currentPage ? "page" : undefined}
                        onClick={() => goTo(n)}
                      >
                        {n}
                      </button>
                    </React.Fragment>
                  );
                })}

                <button className="page-btn" onClick={() => goTo(currentPage + 1)} disabled={currentPage === pageCount}>
                  Siguiente →
                </button>
              </nav>
            </>
          )}
        </>
      )}
    </section>
  );
}
