export class DocGenError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'DocGenError';
  }
}

export class ParseError extends DocGenError {
  constructor(
    message: string,
    public readonly file: string,
    public readonly cause?: Error,
  ) {
    super(`Parse error in ${file}: ${message}`, 'PARSE_ERROR');
    this.name = 'ParseError';
  }
}

export class EnrichmentError extends DocGenError {
  constructor(
    message: string,
    public readonly entryName?: string,
    public readonly cause?: Error,
  ) {
    super(`Enrichment error${entryName ? ` for ${entryName}` : ''}: ${message}`, 'ENRICHMENT_ERROR');
    this.name = 'EnrichmentError';
  }
}

export class ConfigError extends DocGenError {
  constructor(message: string) {
    super(`Configuration error: ${message}`, 'CONFIG_ERROR');
    this.name = 'ConfigError';
  }
}
