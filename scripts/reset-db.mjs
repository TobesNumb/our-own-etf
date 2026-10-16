// Verwijdert de lokale database. Bij de volgende start wordt ze opnieuw aangemaakt en gevuld vanuit data/aandelen.csv.
import fs from "node:fs";
import path from "node:path";
const p = path.join(process.cwd(), "data", "koerslijst.db");
for (const f of [p, p + "-wal", p + "-shm", p + "-journal"]) if (fs.existsSync(f)) { fs.rmSync(f); console.log("verwijderd:", f); }
console.log("Klaar. Start de app opnieuw om de database te herbouwen.");
