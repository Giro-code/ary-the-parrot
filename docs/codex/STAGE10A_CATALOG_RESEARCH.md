# Codex — Etapa 10A: investigar y extraer el catálogo cultural dominicano (solo datos)

Sigues en `D:\Ary The Parrot`. Hoy Ary tiene 12 fichas verificadas (`src/db/seed.ts`). El propietario quiere que Ary sea **mucho más inteligente y tenga más referencias**: cientos de fichas con información y fotos verificadas.

Esta etapa es **solo de investigación y extracción de datos**. En paralelo, otro trabajo está modificando `src/`, así que:

- **No toques** `src/`, `app/`, `tests/`, `e2e/`, `package.json`, `drizzle/` ni la base de datos.
- Escribe **solo** en `data/catalog/`, `public/assets/catalog/` y `docs/catalog/`.

Lee primero, para entender el formato y el nivel de exigencia actual:

- `src/db/seed.ts`
- `docs/IMAGE_CREDITS.md`
- `docs/PLACE_LOCATIONS.md`
- `docs/ARY_STAGE9_REPORT.md`
- `src/server/item-media.ts`

## Principio no negociable

Ary **solo afirma lo que está verificado**.

- Cada dato de una ficha debe estar en la fuente citada.
- Nada de precios, horarios, requisitos, condiciones actuales ni cifras que cambian.
- Los textos se **redactan con tus palabras**, sin copiar párrafos de Wikipedia ni de webs oficiales: 1–3 frases claras y cálidas.
- Las fotos solo de **Wikimedia Commons** con licencia PD, CC0, CC BY o CC BY-SA, comprobada en la página del archivo. Sin personas identificables en primer plano salvo en eventos públicos con licencia válida.
- Todo queda como **borrador** (`status: "draft"`). Un humano lo aprueba después.

## Fuentes

- **Wikidata** (SPARQL, `https://query.wikidata.org/sparql`) para descubrir entidades en la República Dominicana (Q786) y obtener coordenadas (P625), imagen de Commons (P18), provincia (P131), sitio web oficial (P856) y etiquetas ES/EN.
- **Wikipedia ES/EN** (API REST `/page/summary/`) como apoyo de contexto. Si un dato viene solo de Wikipedia, la fuente es la página de Wikipedia.
- **Fuentes oficiales**, preferidas cuando existen:
  - godominicanrepublic.com (Ministerio de Turismo);
  - UNESCO (whc.unesco.org, ich.unesco.org);
  - museosrd.gob.do;
  - sitios de ministerios o ayuntamientos;
  - Parques Nacionales / Ministerio de Medio Ambiente.
- Envía un `User-Agent` genérico como `AryCatalogBot/1.0 (cultural guide research)`, sin datos personales. Sé respetuoso con los límites de uso: pausa entre peticiones y sin descargas masivas.
- Si una fuente devuelve 403 o no responde, anótalo y usa otra. No intentes evadir bloqueos.

## Qué buscar (meta del propietario: **al menos 300 fichas**, muy completo)

El propietario pide un catálogo **muy completo** de la República Dominicana para un viajero: lugares culturales y turísticos, fiestas, eventos, comida, naturaleza y todo lo que pueda interesar a un visitante. **Mínimo 300 fichas válidas**; si puedes, 350. Cubre **todas las provincias** (las 31 más el Distrito Nacional), no solo Santo Domingo y Punta Cana.

Trabaja **por lotes** (por categoría o región) y guarda el progreso en `candidates.json` tras cada lote, para no perder trabajo si te interrumpen. Si `data/catalog/` ya tiene contenido, **continúa desde ahí** sin duplicar.

Categorías adicionales a las de la tabla:

- **Eventos y fiestas recurrentes**, descritos como tradición y sin fechas ni programas del año salvo los hechos históricos fijos:
  - fiestas patronales destacadas;
  - Festival del Merengue;
  - Dominican Republic Jazz Festival;
  - Feria Internacional del Libro;
  - carnavales regionales (Santiago, Bonao, Cabral, Montecristi, Punta Cana, Santo Domingo);
  - Guloyas;
  - Día de la Altagracia y Basílica de Higüey;
  - Independencia, Restauración.
- **Islas y cayos:** Saona, Catalina, Cayo Levantado, Cayo Arena (Paraíso), Cayos Siete Hermanos, Isla Beata.
- **Montañas, ríos y cascadas:**
  - Jarabacoa (Salto de Jimenoa, Baiguate);
  - Constanza;
  - Valle Nuevo;
  - Loma de la Medianía;
  - El Mogote;
  - Río Yaque del Norte;
  - Balneario de La Toma;
  - Charcos de Los Militares;
  - Salto de la Jalda.
- **Cuevas y arqueología taína:** Cueva de las Maravillas, Pomier, Fun Fun, José María, Cueva del Puente, Las Caritas del Lago Enriquillo, petroglifos.
- **Arquitectura y monumentos:**
  - Palacio Nacional;
  - Teatro Nacional;
  - Plaza de la Cultura;
  - Panteón de la Patria;
  - Altar de la Patria;
  - Puerta del Conde;
  - Monasterio de San Francisco;
  - Iglesia de Regina Angelorum;
  - Fortaleza de San Luis (Santiago);
  - casas victorianas de Puerto Plata y San Pedro de Macorís.
- **Mercados y compras culturales:** Mercado Modelo, artesanía de Higüerito (muñecas sin rostro), Calle El Conde, mercados de pulgas tradicionales.
- **Gastronomía regional ampliada:**
  - chivo liniero / picao;
  - pescado con coco de Samaná;
  - yaniqueque;
  - chenchén;
  - quipe;
  - kipes;
  - catibías;
  - asopao;
  - locrio;
  - pastelón;
  - jalao;
  - morir soñando;
  - mabí;
  - ron dominicano (como tradición);
  - cacao de San Francisco de Macorís;
  - café de Jarabacoa y Polo.
- **Deporte como cultura:** béisbol dominicano, LIDOM, estadios Quisqueya y Cibao, Serie del Caribe. Describe la tradición, no resultados actuales.
- **Personajes históricos y culturales:** Juan Pablo Duarte, Francisco del Rosario Sánchez, Matías Ramón Mella, Hermanas Mirabal (con su museo), Gregorio Luperón, Salomé Ureña. Solo hechos biográficos verificados y no polémicos, en un tono respetuoso.
- **Pueblos con encanto y regiones:** Las Galeras, Las Terrenas, Río San Juan, Pedernales, Barahona (carretera costera), Monte Plata, San José de Ocoa, Dajabón (mercado fronterizo), Montecristi, Higüey, Bonao, Moca, La Vega, Salcedo.
- **Experiencias de naturaleza:** avistamiento de ballenas, observación de aves (aves endémicas), rafting en Jarabacoa, kitesurf en Cabarete, buceo en Bayahibe (Museo Vivo del Mar), senderismo al Pico Duarte. Describe la experiencia y el lugar, nunca precios ni operadores comerciales.

Calidad antes que cantidad: si una entidad no tiene fuente fiable, va a `rejected.json`. Pero **busca bien** antes de descartarla: Wikidata, Wikipedia ES y la web del Ministerio de Turismo cubren casi todo lo anterior.

### Lista original de ejemplos

| Categoría | Ejemplos |
|---|---|
| Lugares históricos | Ciudad Colonial (Alcázar de Colón, Catedral Primada, Fortaleza Ozama, Calle El Conde), Faro a Colón, La Isabela, Puerto Plata (Fortaleza San Felipe), Santiago (Monumento) |
| Naturaleza y parques | Los Haitises, Parque del Este / Isla Saona, Jaragua, Bahía de las Águilas, Lago Enriquillo, Pico Duarte / Armando Bermúdez, Valle Nuevo, Salto del Limón, 27 Charcos de Damajagua, Los Tres Ojos, Hoyo Azul, Cueva de las Maravillas |
| Playas y costas | Bávaro, Punta Cana, Playa Rincón, Las Terrenas, Cabarete, Sosúa, Bayahibe, Playa Frontón, Montecristi (El Morro) |
| Museos | Museo de las Casas Reales, Museo del Hombre Dominicano, Museo de Arte Moderno, Centro León, Museo Mundo del Ámbar, Museo Larimar |
| Gastronomía | mangú, sancocho, la bandera dominicana, chicharrón, habichuelas con dulce, tostones, mofongo, casabe, moro, dulce de leche, café dominicano, cacao, mamajuana (descrita solo como tradición, sin promover el consumo) |
| Música y danza | merengue, bachata, son, palos/atabales, perico ripiao, güira, tambora |
| Fiestas y tradiciones | carnavales de La Vega, Santiago y Santo Domingo; Diablo Cojuelo, Lechones de Santiago, Califé; Semana Santa (cultural); Día de la Independencia (27 de febrero, como hecho histórico) |
| Artesanía y materiales | larimar, ámbar, muñecas sin rostro, cerámica, tabaco/cigarros de Santiago (descrito como artesanía e historia) |
| Patrimonio UNESCO | Ciudad Colonial, Cocolo, Congos de Villa Mella, merengue, bachata |
| Fauna y flora | cotorra de La Hispaniola (**¡la especie de Ary!**), solenodonte, manatí, ballenas jorobadas, caoba (árbol nacional), rosa de Bayahíbe (flor nacional), cigua palmera (ave nacional) |
| Regiones | Santo Domingo, Santiago, Samaná, La Romana, Puerto Plata, Barahona, Jarabacoa, Constanza |

No inventes entidades. Si una no tiene fuente suficiente, déjala fuera y anótala.

## Formato de salida

**`data/catalog/candidates.json`**, en UTF-8: un array de objetos.

```json
{
  "key": "fortaleza-ozama",
  "status": "draft",
  "kind": "place | food | music | tradition | craft | nature | museum | beach | region | species",
  "tags": ["history", "art", "music", "food", "nature", "adventure"],
  "wikidata": "Q123",
  "province": "Distrito Nacional",
  "title": { "es": "...", "en": "..." },
  "aliases": { "es": ["..."], "en": ["..."] },
  "summary": { "es": "1 frase", "en": "1 sentence" },
  "description": { "es": "1-3 frases verificadas", "en": "1-3 verified sentences" },
  "facts": [{ "text": { "es": "...", "en": "..." }, "sourceUrl": "https://..." }],
  "sources": [{ "url": "https://...", "editor": "...", "checkedAt": "2026-11-11", "httpStatus": 200 }],
  "location": { "label": "...", "lat": 18.4733, "lng": -69.8828, "source": "https://www.wikidata.org/wiki/Q..." },
  "images": [{
    "file": "/assets/catalog/fortaleza-ozama-1.webp",
    "thumb": "/assets/catalog/fortaleza-ozama-1-480.webp",
    "author": "...",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://...",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:...",
    "alt": { "es": "...", "en": "..." }
  }],
  "reviewNotes": "qué debería revisar un humano"
}
```

- Los `tags` deben usar los intereses existentes del proyecto; revisa el tipo `Interest`.
- `location` **solo** para lugares concretos, con coordenadas de Wikidata redondeadas a 4 decimales. Comidas, música y tradiciones van sin ubicación.
- `aliases`: sinónimos reales y nombres comunes, en minúsculas y sin acentos opcionales. Por ejemplo, «zona colonial», «colonial zone».
- Mantén las 12 fichas actuales, con sus mismas `key`, y añádeles alias e imágenes extra si encuentras.

**Imágenes** en `public/assets/catalog/`:

- de 1 a 3 por ficha, en WebP;
- la grande a 1200 px como máximo (calidad ~75, idealmente menos de 180 KB) y la miniatura `-480.webp`;
- usa calidad ~70 y apunta a ~120 KB por imagen grande;
- **tamaño total de la carpeta menor de 200 MB**. Si te acercas al límite, usa 1 foto por ficha;
- descarga las imágenes de `upload.wikimedia.org` con un tamaño ya reducido (`/thumb/.../1280px-...`), no el original.

**`data/catalog/rejected.json`**: entidades descartadas y el motivo (sin fuente, licencia dudosa, sin foto válida…).

## Validación

Crea `data/catalog/validate.mjs`, un script de Node sin dependencias nuevas, que compruebe:

- el esquema;
- claves únicas;
- coordenadas dentro de la RD (lat 17.3–20.0, lng −72.1 a −68.2);
- que cada imagen existe y pesa menos de 400 KB;
- que cada `sourceUrl` es https;
- que no aparecen precios (`$`, `RD$`, `USD`), horas (`\d{1,2}:\d{2}`) ni URLs dentro de los textos;
- que los textos ES/EN existen.

Ejecútalo y deja la salida en el informe.

## Entrega

**`docs/catalog/CATALOG_10A_REPORT.md`:**

- número de fichas por categoría;
- tabla de fichas (key, título y número de fuentes, imágenes y si tiene ubicación);
- lista de **fichas que requieren revisión humana prioritaria**;
- fuentes bloqueadas;
- tamaño total de las imágenes;
- resultado del validador.

**`docs/catalog/IMAGE_CREDITS_CATALOG.md`:** la tabla completa de créditos.

## Restricciones

- Sin commits, push, despliegues ni correos.
- Sin llamadas a Gemini.
- No toques la base de datos ni los archivos de código fuera de `data/catalog/`.
- No imprimas secretos.
- Ignora `outputs/` y las memorias de otros proyectos.
- Escribe **siempre en UTF-8** con `apply_patch` o escrituras UTF-8 explícitas. Nada de tuberías PowerShell→python.
- No copies texto literal largo de las fuentes: como mucho, nombres propios y citas de menos de 10 palabras.
