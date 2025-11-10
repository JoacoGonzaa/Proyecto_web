import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home.jsx";
import EventDetail from "./pages/EventDetail.jsx";
import Checkout from "./pages/Checkout.jsx";
import Purchases from "./pages/Purchases.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/events/:id" element={<EventDetail />} />
      <Route path="/checkout" element={<Checkout />} />
     <Route path="/purchases" element={<Purchases />} /> {/* ✅ historial */}
    </Routes>

    </BrowserRouter>
  );
}
