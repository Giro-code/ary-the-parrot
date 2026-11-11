import { z } from "zod";
import { locationText, mapsUrl } from "../location.ts";
import type { Locale } from "../i18n/index.ts";

const localAsset = z.string().regex(/^\/assets\/(items|catalog)\/[a-z0-9-]+\.webp$/);
const commonsUrl = z.url().refine(value => {
  const url = new URL(value);
  return url.origin === "https://commons.wikimedia.org" && url.pathname.startsWith("/wiki/File:");
});
const imageMetadataSchema = z.object({
  credit: z.string().trim().min(1).max(240),
  license: z.object({ code: z.string().regex(/^(CC BY(?:-SA)? [1234]\.[05](?: [a-z]{2,})?|CC0 1.0|Public domain)$/i), url: z.url().refine(value => /^https:\/\/creativecommons\.org\/(licenses\/(by|by-sa)\/[1234]\.[05](?:\/[a-z]{2,}(?:\/deed\.[a-z]+)?)?|publicdomain\/(zero|mark)\/1\.0)\/?$/.test(value)) }),
  sourceUrl: commonsUrl, alt: z.object({ es: z.string().trim().min(1).max(300), en: z.string().trim().min(1).max(300) }),
  width: z.number().int().positive().max(1200), height: z.number().int().positive().max(1200),
  file: localAsset.optional(), thumb: localAsset.optional(), illustrative: z.boolean().optional(),
});
export const itemImageSchema = z.object({
  src: localAsset, thumbnail: localAsset, alt: z.string().min(1).max(300), credit: imageMetadataSchema.shape.credit,
  license: imageMetadataSchema.shape.license, sourceUrl: commonsUrl, width: imageMetadataSchema.shape.width, height: imageMetadataSchema.shape.height,
  illustrative: z.boolean().optional(),
});
export type ItemImage = z.infer<typeof itemImageSchema>;
type MediaRecord = { status?: string; hiddenAt?: Date | string | null; sourceUrl?: string | null; sourceCheckedAt?: Date | string | null; imageAsset?: string | null; image?: unknown; gallery?: unknown[]; location?: unknown; language?: string };
export function itemMedia(item: MediaRecord, locale: Locale) {
  const media: { image?: ItemImage; gallery?: ItemImage[]; mapsUrl?: string; location?: string } = {};
  if (item.hiddenAt || item.status !== "published" || !item.sourceUrl?.startsWith("https://") || !item.sourceCheckedAt) return media;
  const asset = localAsset.safeParse(item.imageAsset), metadata = imageMetadataSchema.safeParse(item.image);
  if (asset.success && metadata.success) {
    const { alt, ...data } = metadata.data;
    media.image = { ...data, src: asset.data, thumbnail: data.thumb || asset.data.replace(/\.webp$/, "-480.webp"), alt: alt[locale] };
  }
  media.gallery = (item.gallery || []).slice(0, 6).flatMap(raw => {
    const parsed = imageMetadataSchema.safeParse(raw);
    if (!parsed.success || !parsed.data.file || !parsed.data.thumb) return [];
    const { alt, file, thumb, ...data } = parsed.data;
    return [{ ...data, src: file, thumbnail: thumb, alt: alt[locale] }];
  });
  const url = mapsUrl(item.location), label = locationText(item.location);
  if (url && label) { media.mapsUrl = url; media.location = label; }
  return media;
}
export function presentItem<T extends MediaRecord>(item: T, locale: Locale) {
  return { ...item, image: undefined, mapsUrl: undefined, ...itemMedia(item, locale) };
}
