import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [localPurchases, setLocalPurchases] = useState([]);
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [showDebug, setShowDebug] = useState(false); // oculto por defecto

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
        if (!active) return;
        setRaw(res);
        const serverList = extractList(res);
        const locals = JSON.parse(localStorage.getItem("purchases:local") || "[]");
        setLocalPurchases(locals);

        const idOf = (p) => p?.purchase_id || p?.id || p?._id || "";
        const map = new Map();
        [...serverList, ...locals].forEach((p) => map.set(idOf(p), p));
        setPurchases(Array.from(map.values()).filter(Boolean));
      } catch (e) {
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
    return () => (active = false);
  }, []);

  const hint = useMemo(() => {
    if (loading || err || purchases.length > 0) return "";
    return [
      "No llegaron compras desde la API.",
      "• Revisa en Network que /checkout devolvió 200.",
      "• El endpoint de historial puede variar (orders, sales, transactions).",
    ].join("\n");
  }, [loading, err, purchases.length]);

  if (loading) return <div className="p-4">Cargando historial…</div>;
  if (err) return <div className="p-4 rounded-lg bg-red-50 border text-red-700">{err}</div>;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Historial de compras</h1>
        <div className="flex gap-2">
          {/* 🔁 Botones visibles en claro/oscuro */}
          <button className="btn btn--solid" onClick={() => window.location.reload()}>
            Recargar
          </button>
          {localPurchases.length > 0 && (
            <button
              className="btn btn--danger"
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
        <div className="rounded-lg border bg-white p-6 text-gray-600 whitespace-pre-wrap">{hint || "No hay compras para mostrar."}</div>
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
              <div key={id} className="rounded-lg border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">Compra #{id}</div>
                  <div className="text-sm text-gray-500">
                    {created ? new Date(created).toLocaleString() : "—"}
                  </div>
                </div>

                {buyer && (
                  <div className="text-sm text-gray-700 mt-1">
                    Comprador: {buyer.name || "—"} {buyer.email ? `(${buyer.email})` : ""}
                  </div>
                )}

                <div className="text-sm text-gray-700 mt-1">Estado: {status}</div>
                <div className="text-sm text-gray-700">Total: ${total}</div>

                <h3 className="mt-3 font-medium">Items</h3>
                {items.length ? (
                  <ul className="list-disc pl-6 text-sm">
                    {items.map((it, i2) => (
                      <li key={i2}>{(it.type || it.ticket_type || it.name || "Ticket")}: {it.quantity ?? it.qty ?? 1}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600 text-sm">Sin detalle de items.</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showDebug && (
        <div className="mt-4">
          <details>
            <summary className="cursor-pointer font-medium">Depuración: respuesta cruda de /purchases</summary>
            <pre className="text-xs bg-gray-50 border rounded p-2 overflow-auto">{JSON.stringify(raw, null, 2)}</pre>
          </details>
        </div>
      )}
    </section>
  );
}
