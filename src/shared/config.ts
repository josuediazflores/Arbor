import { cosmiconfig } from 'cosmiconfig';
import { DocGenConfigSchema } from './schema.js';
import { ConfigError } from './errors.js';
import type { DocGenConfig } from './types.js';

const explorer = cosmiconfig('docgen', {
  searchPlaces: [
    'docgen.yaml',
    'docgen.yml',
    'docgen.json',
    '.docgenrc',
    '.docgenrc.json',
    '.docgenrc.yaml',
    '.docgenrc.yml',
    'package.json',
  ],
});

export async function loadConfig(overrides: Partial<DocGenConfig> = {}): Promise<DocGenConfig> {
  const result = await explorer.search();
  const fileConfig = result?.config ?? {};

  const merged = { ...fileConfig, ...overrides };

  // Use API key from env if not provided
  if (!merged.anthropicApiKey && process.env.ANTHROPIC_API_KEY) {
    merged.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  }

  const parsed = DocGenConfigSchema.safeParse(merged);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new ConfigError(`Invalid configuration: ${issues}`);
  }

  return parsed.data;
}

export function getDefaultConfig(): DocGenConfig {
  return DocGenConfigSchema.parse({});
}
