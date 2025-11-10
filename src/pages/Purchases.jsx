import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [localPurchases, setLocalPurchases] = useState([]);
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [showDebug, setShowDebug] = useState(true); // déjalo en true mientras probamos

  // Intenta extraer una lista desde múltiples shapes comunes
  function extractList(res) {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.results)) return res.results;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.purchases)) return res.purchases;
    return [];
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.getPurchases();
        console.log("[/purchases] raw response:", res);
        if (!active) return;
        setRaw(res);

        const serverList = extractList(res);
        const locals = JSON.parse(localStorage.getItem("purchases:local") || "[]");
        setLocalPurchases(locals);

        // Mezclar y desduplicar por id
        const idOf = (p) => p?.purchase_id || p?.id || p?._id || "";
        const map = new Map();
        [...serverList, ...locals].forEach((p) => map.set(idOf(p), p));
        const merged = Array.from(map.values()).filter(Boolean);

        setPurchases(merged);
      } catch (e) {
        console.error("[/purchases] error:", e);
        if (!active) return;
        const msg =
          e?.message ||
          (Array.isArray(e?.body?.detail) ? e.body.detail.map((d) => d.msg).join(" | ") : "") ||
          "Error al consultar compras";
        setErr(msg);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const hint = useMemo(() => {
    if (loading || err) return "";
    if (purchases.length > 0) return "";
    // Si llegó vacío, damos pistas útiles
    return [
      "No llegaron compras desde la API.",
      "• Revisa en DevTools > Network que /checkout devolvió 200 y no 4xx.",
      "• Asegúrate de no haber cambiado de ventana o refrescado entre reserva y checkout (algunos backends atan la compra a la misma sesión/cookie).",
      "• Verifica que el endpoint de historial responde 200 y qué JSON trae (mira el panel de abajo).",
    ].join("\n");
  }, [loading, err, purchases.length]);

  if (loading) return <div className="p-4">Cargando historial…</div>;
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>;

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 justify-between mb-3">
        <h1 className="text-2xl font-bold">Historial de compras</h1>
        <div className="flex gap-2">
          <button
            className="px-3 py-2 border rounded"
            onClick={() => window.location.reload()}
          >
            Recargar
          </button>
          {localPurchases.length > 0 && (
            <button
              className="px-3 py-2 border rounded"
              onClick={() => {
                localStorage.removeItem("purchases:local");
                window.location.reload();
              }}
            >
              Borrar compras locales
            </button>
          )}
        </div>
      </div>

      {purchases.length === 0 ? (
        <div className="space-y-2">
          <p>No hay compras para mostrar.</p>
          {hint && (
            <pre className="text-sm bg-yellow-50 border border-yellow-200 p-2 rounded whitespace-pre-wrap">
{hint}
            </pre>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {purchases.map((p, idx) => {
            const id = p.purchase_id || p.id || p._id || idx + 1;
            const created = p.date || p.created_at || p.timestamp;
            const status = p.status || "CONFIRMED";
            const total = p.total_price ?? p.total ?? 0;
            const items = Array.isArray(p.items || p.tickets) ? (p.items || p.tickets) : [];
            const buyer = p.buyer || p.customer;

            return (
              <div key={id} className="border rounded p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold">Compra #{id}</div>
                  <div className="text-sm text-gray-600">
                    {created ? new Date(created).toLocaleString() : "—"}
                  </div>
                </div>

                {buyer && (
                  <div className="text-sm text-gray-700 mt-1">
                    Comprador: {buyer.name || "—"} {buyer.email ? `(${buyer.email})` : ""}
                  </div>
                )}

                <div className="text-sm">Estado: {status}</div>
                <div className="text-sm">Total: ${total}</div>

                <h3 className="mt-2 font-medium">Items</h3>
                {items.length ? (
                  <ul className="list-disc pl-6">
                    {items.map((it, i2) => (
                      <li key={i2}>
                        {(it.type || it.ticket_type || it.name || "Ticket")}: {it.quantity ?? it.qty ?? 1}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600">Sin detalle de items.</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Panel de diagnóstico (muestra exactamente qué devolvió la API) */}
      {showDebug && (
        <div className="mt-6">
          <details open>
            <summary className="cursor-pointer font-semibold">Depuración: respuesta cruda de /purchases</summary>
            <pre className="text-xs bg-gray-100 border rounded p-2 overflow-auto">
{JSON.stringify(raw, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
