import { z } from "zod";
import { locationText, mapsUrl } from "../location.ts";
import type { Locale } from "../i18n/index.ts";

const localAsset = z.string().regex(/^\/assets\/items\/[a-z0-9-]+\.webp$/);
const commonsUrl = z.url().refine(value => {
  const url = new URL(value);
  return url.origin === "https://commons.wikimedia.org" && url.pathname.startsWith("/wiki/File:");
});
const imageMetadataSchema = z.object({
  credit: z.string().trim().min(1).max(240),
  license: z.object({ code: z.enum(["CC BY 2.0", "CC BY 3.0", "CC BY 4.0", "CC BY-SA 2.0", "CC BY-SA 3.0", "CC BY-SA 4.0", "CC0 1.0", "Public domain"]), url: z.url().refine(value => /^https:\/\/creativecommons\.org\/(licenses\/(by|by-sa)\/[234]\.0|publicdomain\/(zero|mark)\/1\.0)\/$/.test(value)) }),
  sourceUrl: commonsUrl, alt: z.object({ es: z.string().trim().min(1).max(300), en: z.string().trim().min(1).max(300) }),
  width: z.number().int().positive().max(1200), height: z.number().int().positive().max(1200),
});
export const itemImageSchema = z.object({
  src: localAsset, thumbnail: localAsset, alt: z.string().min(1).max(300), credit: imageMetadataSchema.shape.credit,
  license: imageMetadataSchema.shape.license, sourceUrl: commonsUrl, width: imageMetadataSchema.shape.width, height: imageMetadataSchema.shape.height,
});
export type ItemImage = z.infer<typeof itemImageSchema>;
type MediaRecord = { status?: string; sourceUrl?: string | null; sourceCheckedAt?: Date | string | null; imageAsset?: string | null; image?: unknown; location?: unknown; language?: string };
export function itemMedia(item: MediaRecord, locale: Locale) {
  const media: { image?: ItemImage; mapsUrl?: string; location?: string } = {};
  if (item.status !== "published" || !item.sourceUrl?.startsWith("https://") || !item.sourceCheckedAt) return media;
  const asset = localAsset.safeParse(item.imageAsset), metadata = imageMetadataSchema.safeParse(item.image);
  if (asset.success && metadata.success) {
    const { alt, ...data } = metadata.data;
    media.image = { ...data, src: asset.data, thumbnail: asset.data.replace(/\.webp$/, "-480.webp"), alt: alt[locale] };
  }
  const url = mapsUrl(item.location), label = locationText(item.location);
  if (url && label) { media.mapsUrl = url; media.location = label; }
  return media;
}
export function presentItem<T extends MediaRecord>(item: T, locale: Locale) {
  return { ...item, image: undefined, mapsUrl: undefined, ...itemMedia(item, locale) };
}
