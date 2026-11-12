"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";

export function SignIn() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
      if (!response.ok) { setError("Unable to sign in. Check your email and password."); return; }
      // A full reload clears the anonymous module state after authentication.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/");
    } catch { setError("Could not connect. Please try again."); }
    finally { setBusy(false); }
  }
  return <main className="owner-sign-in">
    <Link href="/" className="masthead">The Personalized Time</Link>
    <h1>Owner sign-in</h1>
    <p>Sync your saved stories and reading history across your devices.</p>
    <form onSubmit={submit}>
      <label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="username" required maxLength={254} />
      <label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required maxLength={256} />
      {error && <p role="alert">{error}</p>}
      <button className="owner-submit" disabled={busy}>{busy ? "Signing in…" : "Sign in →"}</button>
    </form>
    <button className="owner-deploy" onClick={() => dialog.current?.showModal()}>Not an admin?</button>
    <dialog ref={dialog} className="owner-dialog" aria-labelledby="deploy-title">
      <h2 id="deploy-title">If you are not an admin, deploy your own</h2>
      <p>This is a personal newspaper. Create your own from the open-source project.</p>
      <a className="owner-submit" href="https://github.com/kartikk-k/the-personalized-news" target="_blank" rel="noreferrer">View on GitHub →</a>
      <form method="dialog"><button className="owner-deploy">Close</button></form>
    </dialog>
  </main>;
}
