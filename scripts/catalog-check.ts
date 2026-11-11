// Offline, isolated verification: never loads CLI env or connects to production.
import { connectDatabase } from "../src/db/client.ts";
import { migrateDatabase } from "../src/db/migrate.ts";
import { seedDatabase, seedEntries } from "../src/db/seed.ts";
import { importCatalog, readCatalog } from "../src/db/catalog-import.ts";
import { catalogSearch } from "../src/server/ai/catalog-search.ts";
const connection = await connectDatabase({ memory: true });
try {
  await migrateDatabase(connection.db);
  await seedDatabase(connection.db, seedEntries.map(entry => ({ url: entry.url, finalUrl: entry.url, status: 200, checkedAt: "2026-11-11T12:00:00Z", verified: true })));
  const candidates = await readCatalog();
  console.log("first", JSON.stringify(await importCatalog(connection.db, candidates, { production: true })));
  console.log("second", JSON.stringify(await importCatalog(connection.db, candidates, { production: true })));
  for (const language of ["es", "en"]) {
    const search = await catalogSearch(connection.db, language);
    for (const query of ["bayaibe", "salto el limon", "bahia de las aguilas", "samna", "whale watching", "colonial zone", "qué comer", "playas en Punta Cana", "qué hacer en Samaná", "fiestas dominicanas", "museos de Santiago", "¿qué hora es en Tokio?"]) {
      for (let i = 0; i < 5; i++) search.search(query);
      const times = Array.from({ length: 50 }, () => { const start = performance.now(); search.search(query); return performance.now() - start; }).sort((a, b) => a - b);
      console.log(JSON.stringify({ language, query, median: times[25], p95: times[47], max: times[49], hits: search.search(query).map(r => ({ key: r.item.contentKey, score: r.score })) }));
    }
  }
} finally { await connection.close(); }
