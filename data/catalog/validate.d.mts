export function validateCatalog(candidates: unknown): Promise<{ errors: string[]; imageDimensions: Record<string, { w: number; h: number }>; result: string }>;
