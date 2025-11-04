const BASE_URL = "/api"; // usa proxy

async function request(path, options = {}) {
  const res = await fetch(BASE_URL + path, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  listEvents: () => request("/events"),
  getEvent: (id) => request(`/events/${id}`),
  createReservation: (payload) =>
    request("/reservations", { method: "POST", body: JSON.stringify(payload) }),
  checkout: (payload) =>
    request("/checkout", { method: "POST", body: JSON.stringify(payload) }),
  getPurchases: () => request("/purchases"),
};
