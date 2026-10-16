import Link from "next/link";
import { config } from "@/lib/config";
import { ThemeToggle } from "./ThemeToggle";
import { RefreshButton } from "./RefreshButton";
import { NavLinks } from "./NavLinks";

export function TopNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-display text-lg font-extrabold tracking-tight text-ink">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-accent-ink" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1,12 5,7 8,9 12,3 15,5" />
            </svg>
          </span>
          {config.appNaam}
        </Link>
        <NavLinks />
        <div className="ml-auto flex items-center gap-2">
          <RefreshButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
