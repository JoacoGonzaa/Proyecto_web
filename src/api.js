// src/api.js

const BASE_URL = "https://tickets.grye.org"; // ✅ base correcta sin /api

// Función genérica para peticiones HTTP
async function request(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });

  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const err = new Error(`API error ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body ?? {};
}

export const api = {
  // ===== Eventos =====
  getEvents: () => request("/events"),
  getEvent: (id) => request(`/events/${id}`),

  // ===== Reservas =====
  createReservation: (data) =>
    request("/reservations", { method: "POST", body: JSON.stringify(data) }),

  // ===== Checkout =====
  checkout: (data) =>
    request("/checkout", { method: "POST", body: JSON.stringify(data) }),

  // ===== Compras / Historial =====
  // Intenta varias rutas comunes para no romper la UI si /purchases no existe.
  getPurchases: async () => {
    const candidates = [
      "/purchases",
      "/purchase",
      "/orders",
      "/sales",
      "/transactions",
      "/users/me/purchases",
    ];

    for (const path of candidates) {
      try {
        return await request(path);
      } catch (e) {
        if (e.status === 404) continue; // prueba la siguiente
        throw e; // errores reales (401/500/etc.)
      }
    }

    console.warn("⚠️ Ninguna ruta de compras respondió; devolviendo lista vacía.");
    return [];
  },
};
