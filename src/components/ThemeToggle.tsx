"use client";
import { useEffect, useState } from "react";

type Thema = "system" | "light" | "dark";
const VOLGORDE: Thema[] = ["system", "light", "dark"];
const LABEL: Record<Thema, string> = { system: "Thema: volgt systeem", light: "Thema: licht", dark: "Thema: donker" };

export function ThemeToggle() {
  const [thema, setThema] = useState<Thema>("system");

  useEffect(() => {
    try {
      const t = localStorage.getItem("koerslijst-thema");
      if (t === "light" || t === "dark") setThema(t);
    } catch {}
  }, []);

  function wissel() {
    const volgende = VOLGORDE[(VOLGORDE.indexOf(thema) + 1) % VOLGORDE.length];
    setThema(volgende);
    try {
      if (volgende === "system") {
        localStorage.removeItem("koerslijst-thema");
        document.documentElement.removeAttribute("data-theme");
      } else {
        localStorage.setItem("koerslijst-thema", volgende);
        document.documentElement.setAttribute("data-theme", volgende);
      }
    } catch {}
  }

  return (
    <button type="button" onClick={wissel} className="btn h-9 w-9 justify-center px-0" title={LABEL[thema]} aria-label={LABEL[thema]}>
      {thema === "light" && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      )}
      {thema === "dark" && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
      )}
      {thema === "system" && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="14" rx="2" /><path d="M8 21h8M12 18v3" /></svg>
      )}
    </button>
  );
}
