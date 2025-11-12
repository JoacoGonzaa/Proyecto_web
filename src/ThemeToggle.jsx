// src/ThemeToggle.jsx
import { useEffect, useState } from "react";

const STORAGE_KEY = "theme"; // 'light' | 'dark'

export default function ThemeToggle({ className = "" }) {
  // Empezamos con null y decidimos en useEffect para evitar errores de acceso a window/localStorage
  const [theme, setTheme] = useState(null);

  // Al montar: lee preferencia guardada o del sistema
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "dark" || saved === "light") {
        setTheme(saved);
        return;
      }
      const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    } catch {
      setTheme("light");
    }
  }, []);

  // Aplica el atributo en <html> y persiste
  useEffect(() => {
    if (!theme) return;
    try {
      const root = document.documentElement; // <html>
      if (theme === "dark") root.setAttribute("data-theme", "dark");
      else root.removeAttribute("data-theme");
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* no-op */
    }
  }, [theme]);

  if (!theme) {
    // Mientras determinamos el tema, renderiza un botón neutro para no romper nada
    return (
      <button type="button" className={`btn btn--ghost ${className}`} disabled>
        …
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      className={`btn btn--ghost ${className}`}
      title={theme === "dark" ? "Cambiar a claro" : "Cambiar a oscuro"}
      aria-label="Cambiar tema"
      style={{ lineHeight: 1 }}
    >
      {theme === "dark" ? "☀️ Claro" : "🌙 Oscuro"}
    </button>
  );
}
