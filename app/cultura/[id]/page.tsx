import { getConnection } from "../../../src/db/client";
import { cookies } from "next/headers";
import { optionalSession } from "../../../src/server/auth";
import { recordEvent } from "../../../src/server/service";
import { findItem } from "../../../src/server/service";
import { uuidSchema } from "../../../src/server/http";
import { dictionaries } from "../../../src/i18n";
export const dynamic = "force-dynamic";
export default async function CulturalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let item;
  try {
    if (!uuidSchema.safeParse(id).success) throw new Error();
    const { db } = await getConnection(); item = await findItem(db, id);
    const session = await optionalSession(db, (await cookies()).get("ary_sid")?.value);
    await recordEvent(db, "item_viewed", {}, session || undefined, { culturalItemId: id });
  } catch { /* Render an honest unavailable state below. */ }
  if (!item) return <main className="public-item"><h1>{dictionaries.es.contentUnavailable}</h1><a className="button" href="/experiencia">{dictionaries.es.experience}</a></main>;
  const locale = item.language === "en" ? "en" : "es", t = dictionaries[locale];
  return <main className="public-item" lang={locale}><p className="eyebrow">Ary · {t.demo}</p><h1>{item.title}</h1><p className="lead">{item.validatedDescription}</p><p>{item.sourceUrl && <a href={item.sourceUrl} rel="noreferrer" target="_blank">{t.source}: {item.editor}</a>}</p><p>{t.reviewed}: {item.sourceCheckedAt?.toISOString().slice(0, 10)}</p><p>{t.publicQr}</p><nav><a className="button" href="/experiencia">{t.experience}</a><a href="/#inicio">{t.home}</a></nav></main>;
}
