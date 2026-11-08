import type { Interest, Locale } from "../i18n";
export type Visitor = { locale: Locale; countryDeclared: string | null; interests: Interest[]; expiresAt: string; accountVerified: boolean };
export type Item = { id: string; title: string; summary: string; validatedDescription: string; tags: string[]; sourceUrl: string | null; sourceCheckedAt: string | null; editor: string; demo: boolean; language: string };
export type Recommendation = { item: Item; rationale: string; evidenceIds: string[]; sourceUrl: string | null; sourceCheckedAt: string | null };
export type Recommendations = { mode: "rules"; recommendations: Recommendation[]; bridges: { relation: string; sourceUrl: string }[] };
export type Saved = { saved: { id: string; state: "saved" | "visited"; favorite: boolean }; item: Item };
