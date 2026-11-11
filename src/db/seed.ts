import { randomUUID } from "node:crypto";
import type { Database } from "./client.ts";
import { culturalItems, culturalBridges } from "./schema.ts";
import type { Interest } from "../i18n/index.ts";
import { seedImages, seedLocations } from "./seed-media.ts";
type Entry = { key: string; title: string; tags: Interest[]; url: string; editor: string; es: string; en: string };
// Search-only ES/EN aliases, stored with tags and never rendered as visitor copy.
export const searchAliases: Record<string, string[]> = {
  "ciudad-colonial": ["zona colonial", "colonial zone", "santo domingo colonial", "casco historico", "historic district", "catedral primada", "first cathedral"],
  haitises: ["cuevas", "caves", "manglares", "mangroves", "petroglifos", "petroglyphs"],
  ballenas: ["ballenas", "whales", "samana", "avistamiento", "whale watching"],
  mangu: ["comida", "desayuno", "food", "breakfast", "platano", "plantain"],
  merengue: ["musica", "baile", "music", "dance"],
  bachata: ["musica", "baile", "music", "dance"],
  larimar: ["piedras", "joyas", "gems", "jewelry", "souvenir"],
  ambar: ["piedras", "joyas", "gems", "jewelry", "souvenir", "amber"],
  carnaval: ["diablos cojuelos", "mascaras", "masks", "carnival"],
  "altos-chavon": ["la romana", "anfiteatro", "amphitheatre", "amphitheater"],
  cocolo: ["san pedro de macoris", "cocolo dance drama"],
  congos: ["villa mella", "congos brotherhood"],
};
export const seedEntries: Entry[] = [
  { key: "ciudad-colonial", title: "Ciudad Colonial de Santo Domingo", tags: ["history", "art"], url: "https://www.godominicanrepublic.com/destinations/santo-domingo", editor: "Ministerio de Turismo de República Dominicana", es: "La Zona Colonial de Santo Domingo es Patrimonio Mundial de la UNESCO. Sus calles adoquinadas reúnen museos e historia colonial con la vida cultural de la ciudad.", en: "Santo Domingo's Colonial Zone is a UNESCO World Heritage Site. Its cobblestone streets bring together museums and colonial history with the city's cultural life." },
  { key: "merengue", title: "Merengue", tags: ["music"], url: "https://ich.unesco.org/en/RL/music-and-dance-of-the-merengue-in-the-dominican-republic-01162", editor: "UNESCO · Patrimonio Cultural Inmaterial", es: "El merengue une música y baile en la vida social dominicana. La UNESCO lo inscribió en su Lista Representativa en 2016; sus conocimientos se transmiten mediante observación y participación.", en: "Merengue brings music and dance into Dominican social life. UNESCO inscribed it on its Representative List in 2016; knowledge is passed on through observation and participation." },
  { key: "bachata", title: "Bachata", tags: ["music"], url: "https://ich.unesco.org/en/RL/music-and-dance-of-dominican-bachata-01514", editor: "UNESCO · Patrimonio Cultural Inmaterial", es: "La bachata dominicana combina música y baile, con guitarras y percusión. La UNESCO la inscribió en su Lista Representativa en 2019 como una expresión presente en celebraciones y encuentros sociales.", en: "Dominican bachata combines music and dance, with guitars and percussion. UNESCO inscribed it on its Representative List in 2019 as an expression found in celebrations and social gatherings." },
  { key: "cocolo", title: "Teatro Cocolo Danzante", tags: ["music", "history", "art"], url: "https://ich.unesco.org/en/RL/cocolo-dance-drama-tradition-00104", editor: "UNESCO · Patrimonio Cultural Inmaterial", es: "Esta tradición surgió entre comunidades procedentes del Caribe británico. Sus representaciones combinan música, danza y teatro, y la UNESCO las inscribió en su Lista Representativa en 2008.", en: "This tradition developed among communities from the British Caribbean. Performances combine music, dance and theatre; UNESCO inscribed the tradition on its Representative List in 2008." },
  { key: "congos", title: "Congos de Villa Mella", tags: ["music", "history"], url: "https://ich.unesco.org/en/RL/cultural-space-of-the-brotherhood-of-the-holy-spirit-of-the-congos-of-villa-mella-00006", editor: "UNESCO · Patrimonio Cultural Inmaterial", es: "La Cofradía del Espíritu Santo de los Congos de Villa Mella mantiene expresiones de música, danza y celebraciones comunitarias. Su espacio cultural está reconocido por la UNESCO.", en: "The Cofradía del Espíritu Santo de los Congos de Villa Mella maintains music, dance and community celebrations. Its cultural space is recognized by UNESCO." },
  { key: "mangu", title: "Mangú", tags: ["food"], url: "https://www.godominicanrepublic.com/travel/faqs", editor: "Ministerio de Turismo de República Dominicana", es: "El mangú se prepara con plátanos verdes hervidos y majados. En el desayuno dominicano suele acompañarse de huevo, queso frito y salami frito.", en: "Mangú is made from boiled, mashed green plantains. In a Dominican breakfast it is often served with eggs, fried cheese and fried salami." },
  { key: "larimar", title: "Larimar", tags: ["art", "nature"], url: "https://mineria.gob.do/noticias/algo-mas-que-una-piedra-semipreciosa-el-larimar/", editor: "Dirección General de Minería", es: "El larimar es una variedad de pectolita conocida por sus tonos azules. Su extracción y trabajo artesanal forman parte de la actividad económica de comunidades de Barahona.", en: "Larimar is a variety of pectolite known for its blue shades. Its extraction and craftwork are part of the economic activity of communities in Barahona." },
  { key: "ambar", title: "Ámbar dominicano", tags: ["nature", "art", "history"], url: "https://museosrd.gob.do/museos/amber-world-museum/", editor: "MUSEOSRD · Ministerio de Cultura", es: "El Museo Mundo del Ámbar presenta el ámbar dominicano y su importancia cultural. Sus exposiciones permiten acercarse a este material y a sus usos a lo largo del tiempo.", en: "The Museo Mundo del Ámbar presents Dominican amber and its cultural importance. Its exhibitions introduce the material and its uses over time." },
  { key: "haitises", title: "Parque Nacional Los Haitises", tags: ["nature", "adventure", "history"], url: "https://www.godominicanrepublic.com/things-to-do/national-park-los-haitises", editor: "Ministerio de Turismo de República Dominicana", es: "Los Haitises reúne manglares, cayos y formaciones rocosas. Sus cuevas conservan petroglifos y pictografías, una conexión entre el paisaje natural y la historia de la isla.", en: "Los Haitises brings together mangroves, cays and rock formations. Its caves preserve petroglyphs and pictographs, connecting the natural landscape with the island's history." },
  { key: "ballenas", title: "Ballenas jorobadas de Samaná", tags: ["nature"], url: "https://mnhn.gob.do/index.php/exhibiciones/sala-gigantes-marinos", editor: "Museo Nacional de Historia Natural", es: "Las aguas dominicanas forman parte del ciclo de vida de la ballena jorobada. El Museo Nacional de Historia Natural explica su relación con la Bahía de Samaná y el Atlántico Norte.", en: "Dominican waters are part of the humpback whale's life cycle. The Museo Nacional de Historia Natural explains its connection with Bahía de Samaná and the North Atlantic." },
  { key: "carnaval", title: "Carnaval de La Vega", tags: ["art", "music"], url: "https://ayuntamientolavega.gob.do/lanzamiento-carnaval-vegano-2026/", editor: "Ayuntamiento Municipal de La Vega", es: "El Carnaval Vegano es una tradición de La Vega que reúne color, música y los personajes de los Diablos Cojuelos. Esta ficha introduce su expresión cultural, sin anunciar un calendario de actividades.", en: "The Carnaval Vegano is a La Vega tradition bringing together colour, music and the Diablos Cojuelos characters. This introduction describes its cultural expression without advertising an event schedule." },
  { key: "altos-chavon", title: "Altos de Chavón", tags: ["art", "history"], url: "https://www.godominicanrepublic.com/things-to-do/altos-de-chavon", editor: "Ministerio de Turismo de República Dominicana", es: "Altos de Chavón es un conjunto de inspiración mediterránea situado sobre el río Chavón. Vincula arquitectura, artesanía y espacios dedicados a las artes en La Romana.", en: "Altos de Chavón is a Mediterranean-inspired complex above the río Chavón. It brings together architecture, crafts and spaces devoted to the arts in La Romana." },
];
export type SourceCheck = { url: string; finalUrl: string | null; status: number | null; checkedAt: string; verified: boolean; error?: string };
export async function checkSources(): Promise<SourceCheck[]> {
  return Promise.all(seedEntries.map(async entry => {
    const checkedAt = new Date().toISOString();
    try {
      const response = await fetch(entry.url, { redirect: "follow", signal: AbortSignal.timeout(25000) });
      // Reject soft redirects to generic directory pages.
      const samePage = new URL(response.url).pathname.replace(/\/$/, "") === new URL(entry.url).pathname.replace(/\/$/, "");
      await response.body?.cancel();
      return { url: entry.url, finalUrl: response.url, status: response.status, checkedAt, verified: response.status === 200 && samePage };
    } catch { return { url: entry.url, finalUrl: null, status: null, checkedAt, verified: false, error: "http_request_failed" }; }
  }));
}
export async function seedDatabase(db: Database, checks: SourceCheck[], options: { production?: boolean } = {}) {
  for (const entry of seedEntries) {
    const check = checks.find(row => row.url === entry.url && row.verified);
    for (const language of ["es", "en"] as const) {
      const values = {
        contentKey: entry.key, title: entry.title, type: "heritage", language, summary: entry[language], validatedDescription: entry[language], tags: entry.tags, aliases: searchAliases[entry.key],
        sourceUrl: check ? entry.url : null, sourceCheckedAt: check ? new Date(check.checkedAt) : null,
        imageAsset: seedImages[entry.key] ? `/assets/items/${entry.key}.webp` : null,
        image: seedImages[entry.key] || null, location: seedLocations[entry.key] || null,
        license: "Original Ary cultural summary; linked source copyright remains with its publisher. Photograph licensed separately in image metadata.", editor: entry.editor,
        lastReviewedAt: check ? new Date(check.checkedAt) : null, publishedAt: check ? new Date(check.checkedAt) : null, status: check ? "published" : "needs_source", demo: !options.production,
      };
      const [item] = await db.insert(culturalItems).values({ id: randomUUID(), ...values }).onConflictDoUpdate({ target: [culturalItems.contentKey, culturalItems.language], set: values }).returning();
      // UNESCO explicitly describes merengue's reach in these countries; no scoring by country.
      if (entry.key === "merengue" && check) for (const countryCode of ["US", "CO", "VE"]) {
        const relation = language === "es" ? "La UNESCO documenta la presencia del merengue en este país. Esta relación no supone que te guste este género." : "UNESCO documents merengue's presence in this country. This connection does not presume that you like this genre.";
        await db.insert(culturalBridges).values({ countryCode, culturalItemId: item.id, relation, sourceUrl: entry.url, sourceCheckedAt: new Date(check.checkedAt) }).onConflictDoUpdate({ target: [culturalBridges.countryCode, culturalBridges.culturalItemId], set: { relation, sourceCheckedAt: new Date(check.checkedAt) } });
      }
    }
  }
}
