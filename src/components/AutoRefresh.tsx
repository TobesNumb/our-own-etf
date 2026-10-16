"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Ververst de koersen op de achtergrond als de cache verouderd is,
 * en laadt daarna de pagina-data opnieuw. Toont ondertussen een discrete melding.
 */
export function AutoRefresh({ verouderd, eersteKeer }: { verouderd: boolean; eersteKeer: boolean }) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const gestart = useRef(false);

  useEffect(() => {
    if (!verouderd || gestart.current) return;
    gestart.current = true;
    setBezig(true);
    fetch("/api/vernieuw", { method: "POST" })
      .then(() => router.refresh())
      .catch(() => {})
      .finally(() => setBezig(false));
  }, [verouderd, router]);

  if (!bezig) return null;
  return (
    <div role="status" className="flex items-center gap-2 rounded-lg border border-line bg-accent-soft px-3 py-2 text-sm text-accent">
      <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
      {eersteKeer ? "Eerste synchronisatie: koersen en historiek ophalen. Dit duurt even…" : "Koersen worden bijgewerkt…"}
    </div>
  );
}
