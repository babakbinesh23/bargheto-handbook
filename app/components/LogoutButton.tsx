"use client";

import { useState } from "react";

export default function LogoutButton() {
  const [leaving, setLeaving] = useState(false);

  async function logout() {
    if (leaving) return;
    setLeaving(true);
    try {
      await fetch("/api/login", { method: "DELETE" });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <button
      type="button"
      className="global-logout-button"
      onClick={logout}
      disabled={leaving}
      aria-label="خروج از هندبوک و بازگشت به صفحه ورود"
    >
      <span aria-hidden="true">↪</span>
      {leaving ? "در حال خروج..." : "خروج"}
    </button>
  );
}
