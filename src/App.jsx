import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

import Home from "./pages/Home.jsx";
import EventDetail from "./pages/EventDetail.jsx";
import Checkout from "./pages/Checkout.jsx";
import Purchases from "./pages/Purchases.jsx";

import logo from "./assets/logo.png";

/* =====================================================
   SHELL — HEADER + MAIN + FOOTER
===================================================== */
function Shell({ children }) {
  const STORAGE_KEY = "theme";
  const [theme, setTheme] = useState(null);

  // Detectar tema inicial
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "dark" || saved === "light") {
        setTheme(saved);
        return;
      }
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    } catch {
      setTheme("light");
    }
  }, []);

  // Aplicar tema al <html>
  useEffect(() => {
    if (!theme) return;
    const root = document.documentElement;

    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignorar errores de localStorage
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[color:var(--bg)] text-[color:var(--ink)] transition-colors duration-300">

      {/* ===========================
          HEADER
      ============================ */}
      <header className="sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

          {/* Logo + Nombre EN LÍNEA */}
          <Link
            to="/"
            className="brand-link font-extrabold tracking-tight"
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
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
              }}
            >
              <img
                src={logo}
                alt="Logo Tickets Blue"
                style={{
                  width: "26px",
                  height: "26px",
                  objectFit: "contain",
                  filter: theme === "dark" ? "brightness(1.2)" : "none",
                }}
              />
            </div>

            <span>
              Tickets{" "}
              <span className="text-gradient-blue">Blue</span>
            </span>
          </Link>

          {/* NAV */}
          <nav className="flex items-center gap-2">
            <Link
              to="/"
              className="px-3 py-1.5 rounded hover:bg-[color:var(--line)]/30 transition-colors"
            >
              Inicio
            </Link>

            {/* Botón Mis compras con estilo de botón principal */}
            <Link
              to="/purchases"
              className="btn btn--gradient"
            >
              Mis compras
            </Link>

            {/* Toggle Tema */}
            <button
              type="button"
              onClick={toggleTheme}
              className="btn btn--ghost ml-2"
              style={{ lineHeight: 1 }}
              aria-label="Alternar tema claro/oscuro"
            >
              {!theme ? "…" : theme === "dark" ? "☀️ Claro" : "🌙 Oscuro"}
            </button>
          </nav>
        </div>
      </header>

      {/* ===========================
          CONTENIDO
      ============================ */}
      <main className="flex-1 w-full">
        {/* .container separa el contenido de los bordes */}
        <div className="container">
          {children}
        </div>
      </main>

      {/* ===========================
          FOOTER PEGADO ABAJO
      ============================ */}
      <footer className="mt-auto text-sm transition-colors duration-300">
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

/* =====================================================
   APP — RUTAS PRINCIPALES
===================================================== */
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
