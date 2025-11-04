import React, { useEffect, useState } from "react";
import { api } from "../api";
import { Link } from "react-router-dom";

export default function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
  api.listEvents()
    .then((res) => {
      console.log("API Response:", res);
      setEvents(res.data || []); // 🔹 Aquí usamos el array real
    })
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));
}, []);


  if (loading) return <p className="p-4">Cargando eventos...</p>;
  if (error) return <p className="p-4 text-red-500">Error: {error}</p>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Eventos 🥳</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {events.map((ev) => (
          <div key={ev.id || ev._id} className="border p-4 rounded shadow">
            <img
              src={ev.image || "https://via.placeholder.com/300x200"}
              alt={ev.name}
              className="w-full h-40 object-cover rounded mb-2"
            />
            <h2 className="text-lg font-semibold">{ev.name}</h2>
            <p className="text-sm text-gray-600">{ev.category}</p>
            <p className="text-sm text-gray-600">
              {new Date(ev.date).toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">{ev.location}</p>
            <Link
              to={`/events/${ev.id || ev._id}`}
              className="mt-2 inline-block bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
            >
              Ver / Reservar
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
