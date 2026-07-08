import { activeVertical, type Vertical } from "@/lib/content";
import type { GenerationRequest } from "./schema";

/**
 * Keyless demo generator. Deep-clones the expert-authored base vertical and
 * re-skins its product references to the requested product, so the full flow
 * — including personalized payoff artifacts — is demoable before an
 * ANTHROPIC_API_KEY exists. The lesson/simulation domain stays ad-tech: the
 * mock swaps who is being marketed, not what is being taught.
 */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function substituteStrings<T>(value: T, replace: (s: string) => string): T {
  if (typeof value === "string") return replace(value) as T;
  if (Array.isArray(value)) {
    return value.map((v) => substituteStrings(v, replace)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, substituteStrings(v, replace)])
    ) as T;
  }
  return value;
}

export async function mockGenerate(request: GenerationRequest): Promise<{
  vertical: Vertical;
  warnings: string[];
}> {
  await delay(2500);

  const productName = request.product.name.trim();
  const compact = productName.replace(/[^a-zA-Z0-9]/g, "");

  const replace = (s: string) =>
    s
      .replaceAll("Atlas Cloud Software", productName)
      .replaceAll("Atlas Cloud", productName)
      .replaceAll("AtlasCloud", compact || "Product")
      .replaceAll("atlascloud.com", `${(compact || "product").toLowerCase()}.com`);

  const base = activeVertical;
  const vertical: Vertical = {
    ...substituteStrings(structuredClone(base), replace),
    id: `mock-${Date.now().toString(36)}`,
    config: base.config,
  };

  return {
    vertical,
    warnings: [
      `Demo mode: no ANTHROPIC_API_KEY configured, so this module re-skins the built-in ad-tech vertical around "${productName}" instead of generating "${request.targetRole}" content. Add a key to .env.local for real generation.`,
    ],
  };
}
