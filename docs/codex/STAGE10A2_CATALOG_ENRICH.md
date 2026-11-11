# Codex — Etapa 10A2: enriquecer y equilibrar el catálogo (solo datos)

Sigues en `D:\Ary The Parrot`. La etapa 10A (`docs/codex/STAGE10A_CATALOG_RESEARCH.md`) generó `data/catalog/candidates.json` con 313 fichas en borrador. El revisor encontró tres problemas que impiden usarlas.

## Problemas detectados

1. **Textos vacíos de contenido.** 284 de 313 fichas tienen descripciones como «Bahía de las Águilas es una playa dominicana. Su ubicación está vinculada a Pedernales.» Eso no le sirve a un viajero. Ary necesita **qué es, por qué es interesante y qué se puede ver o vivir allí**, con hechos verificados.
2. **Fuentes no citables.** 303 fichas citan una URL masiva de la API de Wikidata (`w/api.php?...ids=Q1|Q2|...` con 40 IDs). Cada fuente debe ser **la página concreta de esa entidad**:
   - `https://www.wikidata.org/wiki/Q…`;
   - el artículo de Wikipedia ES o EN de esa entidad;
   - o la página oficial: godominicanrepublic.com, UNESCO, museo, ministerio o ayuntamiento.
   - Las URL de la API **nunca** son una fuente.
3. **Desequilibrio.** Hay 101 «regiones» (muchos municipios y provincias duplicados, como «La Vega» y «Provincia de La Vega») y 43 especies. En cambio, apenas hay 5 de música, 8 de tradiciones, 14 de comida y casi ninguna de fiestas y eventos. El propietario pidió explícitamente **lugares culturales, turísticos, fiestas y eventos que interesen a un viajero**.

## Qué hacer

**Trabaja sobre los archivos existentes** de `data/catalog/` y reutiliza tus scripts. Guarda el progreso por lotes.

### 1. Enriquecer cada ficha que se quede

- **`description.es` / `description.en`:** de 2 a 4 frases propias, cálidas y concretas, con **hechos verificados de la fuente citada**. Por ejemplo:
  - qué es;
  - la historia o el origen breve;
  - qué la hace especial;
  - qué puede ver o vivir el visitante, de forma general, sin precios, horarios ni condiciones actuales.
- **Fuente principal:** el artículo de Wikipedia ES o EN de la entidad (API REST `/api/rest_v1/page/summary/<título>`, y el texto completo si hace falta), o la web oficial si existe. Cita la **URL legible del artículo**, no la de la API.
- Añade también `https://www.wikidata.org/wiki/Q…` como fuente secundaria para coordenadas e imagen.
- **`summary`:** 1 frase atractiva, de 160 caracteres como máximo.
- **`facts`:** de 2 a 5 hechos atómicos con su `sourceUrl` de artículo, para que Ary pueda responder preguntas concretas. Por ejemplo, «Fue construida en el siglo XVI» o «Es Patrimonio Mundial de la UNESCO desde 1990».
- **`aliases`:** nombres comunes en ES y EN y faltas típicas.
- Si **no hay fuente suficiente** para escribir al menos 2 frases útiles, mueve la ficha a `rejected.json` con el motivo `thin_source`.

### 2. Equilibrar las categorías

- **Regiones:**
  - **fusiona duplicados** (ciudad y provincia del mismo nombre → una ficha de destino; usa la ciudad o el destino turístico);
  - descarta municipios sin interés turístico claro;
  - deja como mucho unas **40 regiones o destinos** con una descripción turística real (qué la caracteriza y sus atractivos citados).
- **Especies:** como mucho **20**. Prioriza las emblemáticas: cotorra de La Española (la especie de Ary), cigua palmera, solenodonte, manatí, ballena jorobada, flamenco, iguana rinoceronte, caoba, rosa de Bayahíbe, tortugas marinas y cocodrilo americano del Lago Enriquillo.
- **Añade fichas nuevas** hasta superar de nuevo las **300 válidas**, con este mínimo por categoría:

| Categoría | Mínimo | Ejemplos |
|---|---|---|
| Fiestas, eventos y tradiciones | 35 | carnavales regionales (Santiago y los Lechones, Bonao, Cabral y los Cachúas, Montecristi y los Toros, Punta Cana, Santo Domingo y su desfile), Guloyas, Día de la Altagracia, Semana Santa (tradiciones culturales), Festival del Merengue, Dominican Republic Jazz Festival, Feria Internacional del Libro, fiestas patronales destacadas, Independencia, Restauración, Día de la Constitución, Navidad dominicana, gagá, salves, Fiesta del Espíritu Santo, Carnaval Cimarrón, Velaciones, Festival de las Flores de Jarabacoa |
| Gastronomía y bebidas | 35 | mangú, sancocho, la bandera, locrio, mofongo, chivo guisado, pescado con coco, habichuelas con dulce, chenchén, yaniqueque, quipe, pastelitos, catibías, asopao, pastelón, moro, tostones, casabe, morir soñando, mabí, jugo de chinola, café, cacao, ron, mamajuana (como tradición), dulce de coco, jalao, majarete, arepa dominicana, chicharrón de Villa Mella, bizcocho dominicano, empanadas de yuca, longaniza, chimichurri dominicano, frituras |
| Música, baile y artes | 20 | merengue, bachata, merengue típico/perico ripiao, son dominicano, salve, palos/atabales, dembow (como fenómeno cultural), güira, tambora, acordeón, pintura dominicana, artesanía de Higüerito, máscaras de carnaval, larimar, ámbar, tabaco y cigarros de Santiago, cerámica |
| Playas | 30 | Bávaro, Macao, Juanillo, Bayahibe, Dominicus, Boca Chica, Juan Dolio, Playa Rincón, Playa Frontón, Las Galeras, Playa Cosón, Las Terrenas, Playa Grande, Cabarete, Sosúa, Playa Dorada, Bahía de las Águilas, San Rafael, Los Patos, Playa Esmeralda, Punta Rucia, Cayo Arena… |
| Naturaleza, parques, cuevas y cascadas | 45 | parques nacionales, saltos, ríos, lagos, cuevas taínas, miradores, Pico Duarte, Valle Nuevo, Laguna Gri-Gri, Ojos Indígenas, Hoyo Azul, Los Tres Ojos, 27 Charcos, Salto del Limón, Salto de Baiguate, Jimenoa, Hoyo de Pelempito, Lago Enriquillo, Isla Cabritos |
| Lugares históricos, monumentos e iglesias | 45 | Zona Colonial (cada monumento), Faro a Colón, La Isabela, Fortaleza San Felipe, Monumento de Santiago, Basílica de Higüey, Catedral de La Vega, Santo Cerro, Puerta del Conde, Altar de la Patria, Casa de Duarte… |
| Museos y centros culturales | 20 | Museo de las Casas Reales, Alcázar de Colón, Museo del Hombre Dominicano, Museo de Arte Moderno, Centro León, Museo Hermanas Mirabal, Museo del Ámbar, Museo Larimar, Museo Memorial de la Resistencia, Museo Bellapart, Teatro Nacional, Gran Teatro del Cibao |
| Experiencias | 20 | avistamiento de ballenas, kitesurf en Cabarete, rafting en Jarabacoa, buceo en Bayahibe, senderismo al Pico Duarte, observación de aves, ruta del cacao, ruta del café, paseo en catamarán a Saona, teleférico de Puerto Plata, tour de tabaco en Santiago |
| Personajes históricos y culturales | 12 | Duarte, Sánchez, Mella, Luperón, Hermanas Mirabal, Salomé Ureña, Pedro Henríquez Ureña, Juan Luis Guerra (solo hechos biográficos verificados y no polémicos), Johnny Ventura, Eduardo Brito |

### 3. Fotos

- Mantén las fotos válidas existentes.
- Para las fichas nuevas, aplica las mismas reglas de Commons y licencia de la etapa 10A.
- **Corrige lo que marcó la revisión:**
  - reproducciones pictóricas usadas como foto de lugar;
  - capturas de mapa;
  - fotos de ejemplares en cautiverio sin identificar.
- Las comidas pueden usar fotos ilustrativas con licencia, indicándolo en `reviewNotes`.
- Tamaño total de `public/assets/catalog/` menor de 200 MB.
- Borra las imágenes de las fichas descartadas.

### 4. Validador

Amplía `data/catalog/validate.mjs` para que falle si:

- alguna fuente contiene `api.php` o `/w/api` o no es una página concreta;
- `description.es` o `description.en` tiene menos de 2 frases o menos de 140 caracteres;
- aparece el patrón «Su ubicación está vinculada a»;
- hay títulos duplicados o casi duplicados (ciudad y provincia);
- no se cumplen los mínimos por categoría de la tabla.

## Entrega

Actualiza `docs/catalog/CATALOG_10A_REPORT.md`:

- recuento por categoría frente al mínimo;
- 10 fichas de ejemplo completas;
- fusiones y descartes;
- fuentes bloqueadas;
- tamaño de las imágenes;
- resultado del validador.

## Restricciones

Las mismas de 10A:

- escribe solo en `data/catalog/`, `public/assets/catalog/` y `docs/catalog/`;
- sin commits, push ni despliegues;
- sin Gemini ni base de datos;
- sin secretos;
- en UTF-8 con `apply_patch`;
- no copies párrafos literales: redacta con tus palabras;
- `User-Agent` genérico y pausas entre peticiones.
