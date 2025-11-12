import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home.jsx";
import EventDetail from "./pages/EventDetail.jsx";
import Checkout from "./pages/Checkout.jsx";
import Purchases from "./pages/Purchases.jsx";
import logo from "./assets/logo.png"; // ✅ logo dentro de src/assets/

function Shell({ children }) {
  const STORAGE_KEY = "theme";
  const [theme, setTheme] = useState(null);

  // Detectar tema inicial
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "dark" || saved === "light") return setTheme(saved);
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    } catch {
      setTheme("light");
    }
  }, []);

  // Aplicar tema
  useEffect(() => {
    if (!theme) return;
    const root = document.documentElement;
    if (theme === "dark") root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    // ✅ flex-col para que el footer quede siempre abajo
    <div className="flex flex-col min-h-screen text-[color:var(--ink)] bg-[color:var(--bg)] transition-colors duration-300">
      
      {/* 🔷 HEADER */}
      <header className="border-b backdrop-blur bg-[color:var(--card)]/80 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

          {/* 🔹 Logo + Marca “Tickets Blue” */}
          <Link
            to="/"
            className="flex items-center gap-3 font-extrabold tracking-tight"
            style={{
              fontSize: "1.4rem",
              color: "var(--primary)",
              letterSpacing: "-0.02em",
            }}
          >
            
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                background: "white",
                boxShadow: "0 2px 5px rgba(0,0,0,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <img
                src={logo}
                alt="Tickets Blue logo"
                style={{
                  width: "26px",
                  height: "26px",
                  objectFit: "contain",
                  filter: theme === "dark" ? "brightness(1.15)" : "none",
                }}
              />
            </div>

            <span>
              Tickets{" "}
              <span
                style={{
                  background: "linear-gradient(90deg, #027DE0 0%, #3EE6C5 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                   <span className="text-gradient-blue">Blue</span></span>

            </span>
          </Link>

          {/* 🔸 Navegación */}
          <nav className="flex items-center gap-2">
            <Link
              to="/"
              className="px-3 py-1.5 rounded hover:bg-[color:var(--line)]/30 transition-colors"
            >
              Inicio
            </Link>
            <Link
               to="/purchases"
                className="px-3 py-1.5 rounded btn--gradient hover:opacity-90 transition-opacity"
            >
              Mis Compras
            </Link>

            {/* 🌙☀️ Botón modo oscuro */}
            <button
              onClick={toggleTheme}
              className="btn btn--ghost ml-2"
              title={theme === "dark" ? "Cambiar a claro" : "Cambiar a oscuro"}
              aria-label="Cambiar tema"
              style={{ lineHeight: 1 }}
            >
              {!theme ? "…" : theme === "dark" ? "☀️ Claro" : "🌙 Oscuro"}
            </button>
          </nav>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full">
        {children}
      </main>

      {/* 🔻 FOOTER fijo al fondo */}
      <footer className="mt-auto border-t text-sm text-[color:var(--muted)] transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>© {new Date().getFullYear()} Tickets Blue</div>
          <div className="flex gap-3 text-[color:var(--secondary)]">
            <span>@tickets_blue</span>
            <span>·</span>
            <span>soporte@ticketsblue.cl</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/purchases" element={<Purchases />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  );
}
