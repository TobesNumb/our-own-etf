"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overzicht" },
  { href: "/beheer", label: "Beheer" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Hoofdnavigatie">
      {LINKS.map((l) => {
        const actief = l.href === "/" ? path === "/" || path.startsWith("/aandeel") : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-md px-2.5 py-1 font-medium transition ${actief ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-surface-2 hover:text-ink"}`}
            aria-current={actief ? "page" : undefined}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
