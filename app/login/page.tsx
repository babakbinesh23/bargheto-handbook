"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [boltActive, setBoltActive] = useState(false);
  const normalizedRole = role.trim().toLowerCase();
  const managerLogin = Boolean(normalizedRole && normalizedRole !== "user" && normalizedRole !== "admin");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (normalizedRole === "user") {
      setError("ورود عمومی user حذف شده است؛ نام کاربری مسئول یا admin را وارد کنید.");
      return;
    }
    if (normalizedRole === "admin") {
      setSubmitting(true);
      try {
        await fetch("/api/login", { method: "DELETE" });
      } finally {
        window.location.href = "/signin-with-chatgpt?return_to=%2Fadmin";
      }
      return;
    }
    if (!normalizedRole || !password) {
      setError("نام کاربری و رمز عبور مسئول را وارد کنید");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: normalizedRole, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "ورود انجام نشد.");
        return;
      }
      const destination = typeof data.destination === "string" && /^\/(?:admin|user(?:\?view=units)?|units\/unit-[a-z0-9-]{2,80})$/.test(data.destination)
        ? data.destination
        : "/user";
      window.location.assign(destination);
    } catch {
      setError("ارتباط با سامانه برقرار نشد؛ دوباره تلاش کنید.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="reference-login" dir="rtl">
      <div className="reference-login__canvas">
        <span
          className={`login-laptop-bolt${boltActive ? " is-active" : ""}`}
          role="img"
          aria-label="علامت برق روی لپ‌تاپ"
          tabIndex={0}
          onPointerEnter={() => setBoltActive(true)}
          onPointerLeave={() => setBoltActive(false)}
          onPointerDown={() => setBoltActive((value) => !value)}
          onFocus={() => setBoltActive(true)}
          onBlur={() => setBoltActive(false)}
        />
        <img className="login-brand-logo" src="/bargheto-logo.png" alt="برقتو" />
        <form id="handbook-login-form" className={`reference-login__form${managerLogin ? " is-manager" : ""}`} onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="role">نوع ورود</label>
          <input
            id="role"
            autoComplete="username"
            autoFocus
            value={role}
            onChange={(event) => {
              setRole(event.target.value);
              setError("");
            }}
            placeholder="admin یا نام کاربری مسئول"
            aria-describedby={error ? "login-error" : undefined}
          />
          {managerLogin && (
            <>
              <label className="sr-only" htmlFor="password">رمز عبور</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                placeholder="رمز عبور"
              />
            </>
          )}
          {error ? <p id="login-error" role="alert">{error}</p> : null}
        </form>
        <button
          type="submit"
          form="handbook-login-form"
          className="login-image-button"
          disabled={submitting}
          aria-label={submitting ? "در حال ورود" : "ورود به هندبوک"}
        >
          <span className="sr-only">{submitting ? "در حال ورود..." : "ورود به هندبوک"}</span>
        </button>
      </div>
    </main>
  );
}
