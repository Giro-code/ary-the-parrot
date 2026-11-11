import type { PlaceLocation } from "../location.ts";

export type ImageMetadata = {
  credit: string;
  license: { code: string; url: string };
  sourceUrl: string;
  alt: { es: string; en: string };
  width: number;
  height: number;
};
const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const license = (code: string, path: string) => ({ code, url: `https://creativecommons.org/${path}/` });
// Editorially reviewed Commons files. Sources and exclusions are recorded in docs/IMAGE_CREDITS.md.
export const seedImages: Record<string, ImageMetadata> = {
  "ciudad-colonial": { credit: "Ulises Jorge", license: license("CC BY 2.0", "licenses/by/2.0"), sourceUrl: commons("Catedral_Santo_Domingo.jpg"), width: 1200, height: 656, alt: { es: "Fachada de la Catedral de Santo Domingo en la Ciudad Colonial", en: "Façade of Santo Domingo Cathedral in the Ciudad Colonial" } },
  merengue: { credit: "Rafa Esteve", license: license("CC BY-SA 4.0", "licenses/by-sa/4.0"), sourceUrl: commons("Fallas2018_-_Cavalcada_Patrimoni_10_-_Merengue_República_Dominicana.jpg"), width: 1200, height: 800, alt: { es: "Representación de merengue dominicano en la Cavalcada del Patrimoni de Valencia de 2018", en: "Dominican merengue performance at Valencia's 2018 Cavalcada del Patrimoni" } },
  bachata: { credit: "Mobilus In Mobili", license: license("CC BY-SA 2.0", "licenses/by-sa/2.0"), sourceUrl: commons("Amargue_Bachata_Quintet_with_Andre_Veloz_(22092585435).jpg"), width: 1200, height: 502, alt: { es: "Amargue Bachata Quintet con Andre Veloz en el Richmond Folk Festival de 2015", en: "Amargue Bachata Quintet with Andre Veloz at the 2015 Richmond Folk Festival" } },
  mangu: { credit: "Ll1324", license: license("CC0 1.0", "publicdomain/zero/1.0"), sourceUrl: commons("Dominican_Mangu.jpg"), width: 1200, height: 1031, alt: { es: "Plato de mangú dominicano", en: "A plate of Dominican mangú" } },
  larimar: { credit: "Vassil", license: license("Public domain", "publicdomain/mark/1.0"), sourceUrl: commons("Larimar.jpg"), width: 1018, height: 787, alt: { es: "Pieza de larimar azul pulido", en: "A piece of polished blue larimar" } },
  ambar: { credit: "Géry PARENT", license: license("CC BY-SA 3.0", "licenses/by-sa/3.0"), sourceUrl: commons("Amber_1.jpg"), width: 1200, height: 985, alt: { es: "Pieza de ámbar dominicano pulido", en: "A piece of polished Dominican amber" } },
  haitises: { credit: "Rachel Docherty", license: license("CC BY 2.0", "licenses/by/2.0"), sourceUrl: commons("Los_Haitises.jpg"), width: 1200, height: 797, alt: { es: "Manglar del Parque Nacional Los Haitises", en: "Mangroves in Los Haitises National Park" } },
  ballenas: { credit: "Danu Widjajanto", license: license("CC BY-SA 4.0", "licenses/by-sa/4.0"), sourceUrl: commons("View_of_Samaná_Bay_from_the_top_2.jpg"), width: 1200, height: 800, alt: { es: "Vista panorámica de la Bahía de Samaná", en: "Panoramic view of Samaná Bay" } },
  carnaval: { credit: "Estefanía Moronta", license: license("CC BY-SA 4.0", "licenses/by-sa/4.0"), sourceUrl: commons("CARNAVAL_VEGANO_2020.jpg"), width: 900, height: 1200, alt: { es: "Diablo Cojuelo enmascarado en el Carnaval Vegano de 2020", en: "A masked Diablo Cojuelo at the 2020 La Vega Carnival" } },
  "altos-chavon": { credit: "Captain-tucker", license: license("CC BY-SA 3.0", "licenses/by-sa/3.0"), sourceUrl: commons("Altos_de_Chavon-2.JPG"), width: 1200, height: 900, alt: { es: "Arquitectura de piedra en Altos de Chavón", en: "Stone architecture in Altos de Chavón" } },
};
// Coordinates rounded to four decimals from the cited Wikipedia coordinates, never from the model.
export const seedLocations: Record<string, PlaceLocation> = {
  "ciudad-colonial": { label: "Ciudad Colonial de Santo Domingo", lat: 18.4833, lng: -69.9167, mapsQuery: "Ciudad Colonial, Santo Domingo" },
  haitises: { label: "Parque Nacional Los Haitises", lat: 19.0067, lng: -69.6419, mapsQuery: "Parque Nacional Los Haitises" },
  ballenas: { label: "Bahía de Samaná", lat: 19.1667, lng: -69.4167, mapsQuery: "Bahía de Samaná" },
  "altos-chavon": { label: "Altos de Chavón", lat: 18.4203, lng: -68.8897, mapsQuery: "Altos de Chavón, La Romana" },
  congos: { label: "Villa Mella", lat: 18.55, lng: -69.9, mapsQuery: "Villa Mella, Santo Domingo Norte" },
  carnaval: { label: "La Vega", lat: 19.22, lng: -70.53, mapsQuery: "La Vega, República Dominicana" },
};
