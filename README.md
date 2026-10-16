# Koerslijst

Lokale webapp die de aandelen uit de lezing bij Bank Delen (16 oktober 2026) volgt: een overzicht van alle aandelen met hun rendement sinds de lezing, een detailpagina per aandeel met grafiek en notities, en een beheerpagina om de lijst te onderhouden.

Koersen komen gratis van Yahoo Finance (onofficieel, via `yahoo-finance2`), 15 tot 20 minuten vertraagd, en worden lokaal gecached in SQLite.

## Starten

Vereist Node.js 20 of nieuwer.

```bash
npm install
cp .env.example .env     # optioneel: pas de instellingen aan
npm run dev
```

Open <http://localhost:3000>. Bij de eerste start wordt `data/koerslijst.db` aangemaakt en gevuld met de lijst uit `data/aandelen.csv`. De eerste synchronisatie haalt vijf jaar historiek op voor elk aandeel en duurt een halve tot één minuut; daarna worden koersen om de 15 minuten ververst.

## Je eigen lijst inladen

Twee manieren:

1. **Beheerpagina** (`/beheer`): zoek een aandeel op naam of ticker en klik Toevoegen, of plak een lijst in het importveld (één aandeel per regel, optioneel `ticker,naam,tag1|tag2,notitie`).
2. **CSV vóór de eerste start**: bewerk `data/aandelen.csv`. Zie de kopregel voor het formaat. De CSV wordt alleen gelezen als de database nog leeg is; gebruik `npm run db:reset` om opnieuw te beginnen.

Yahoo-tickers voor Europese beurzen krijgen een suffix: Brussel `.BR`, Amsterdam `.AS`, Parijs `.PA`, Frankfurt/Xetra `.DE`, Zürich `.SW`, Kopenhagen `.CO`, Stockholm `.ST`, Milaan `.MI`, Madrid `.MC`, Londen `.L`. Amerikaanse aandelen hebben geen suffix.

## Hoe "sinds de lezing" berekend wordt

- De referentiekoers is de slotkoers van de eerste handelsdag op of na `REFERENTIEDATUM` (standaard 16 oktober 2026).
- Zolang die handelsdag nog loopt, is de referentie voorlopig (gemarkeerd in de app) en wordt ze bij elke vernieuwing herberekend. Vanaf de dag erna wordt ze vastgezet.
- Op de beheerpagina kun je per aandeel een referentiekoers handmatig vastzetten, bijvoorbeeld de koers die op de slides stond.
- Rendement = huidige koers / referentiekoers − 1, in de eigen valuta van het aandeel. Het gemiddelde bovenaan is gelijk gewogen over alle aandelen; benchmarks tellen niet mee.

## Instellingen

| Variabele | Standaard | Betekenis |
|---|---|---|
| `DATA_SOURCE` | `yahoo` | `mock` gebruikt synthetische data (handig zonder internet) |
| `REFERENTIEDATUM` | `2026-10-16` | Dag van de lezing |
| `CACHE_MINUTEN` | `15` | Hoe lang live koersen vers blijven |
| `APP_NAAM` | `Koerslijst` | Naam in de navigatiebalk |

Benchmarks (standaard MSCI World via `IWDA.AS` en de BEL 20 via `^BFX`) staan in `src/lib/config.ts`.

## Structuur

```
src/app/                 pagina's en API-routes (Next.js App Router)
  page.tsx               overzicht
  aandeel/[ticker]/      detailpagina
  beheer/                lijst beheren, import/export, ophaallog
  api/                   vernieuw, aandelen, notities, zoek, import, export
src/lib/
  config.ts              instellingen
  db.ts                  SQLite-schema en queries (better-sqlite3)
  sync.ts                ophalen van koersen, historiek en referenties
  metrics.ts             berekeningen voor overzicht en detail
  provider/              databronnen: yahoo.ts en mock.ts
src/components/          UI-componenten (tabel, grafiek, notities, beheer)
data/aandelen.csv        startlijst
```

## Scripts

| Commando | Doel |
|---|---|
| `npm run dev` | ontwikkelserver |
| `npm run build` / `npm start` | productiebuild en -server |
| `npm run typecheck` | TypeScript-controle |
| `npm run db:reset` | database verwijderen (wordt bij de volgende start opnieuw opgebouwd) |

## Goed om te weten

- Yahoo Finance heeft geen officiële API. Als Yahoo iets wijzigt, kan `yahoo-finance2` tijdelijk fouten geven; een `npm update yahoo-finance2` lost dat meestal op. De ophaallog op de beheerpagina toont wat er misliep.
- De app doet één batchverzoek voor alle live koersen en beperkt de snelheid van historiekverzoeken, zodat Yahoo niet tijdelijk blokkeert.
- Geen beleggingsadvies; de cijfers dienen enkel om de lijst uit de lezing op te volgen.
