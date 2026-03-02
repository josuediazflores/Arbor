import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';
import type {
  DocEntry, DocGenConfig, ScanResult, ScanStats,
  GenerateResult, SupportedLanguage,
} from '../shared/types.js';
import { EXTENSION_MAP, LANGUAGE_EXTENSIONS } from '../shared/constants.js';
import { ParseError } from '../shared/errors.js';
import { ParserManager } from './parsers/tree-sitter/parser-manager.js';
import { ExtractorRegistry } from './parsers/registry.js';
import { CExtractor } from './parsers/c-cpp/c-extractor.js';
import { CppExtractor } from './parsers/c-cpp/cpp-extractor.js';
import { KotlinExtractor } from './parsers/kotlin/kotlin-extractor.js';
import { SwiftExtractor } from './parsers/swift/swift-extractor.js';
import { ContextBuilder } from './analyzer/context-builder.js';
import { EnrichmentPipeline } from './ai/enrichment-pipeline.js';
import { MarkdownRenderer } from './output/markdown-renderer.js';

export interface EngineEvents {
  onScanFile?: (file: string) => void;
  onScanComplete?: (stats: ScanStats) => void;
  onEnrichProgress?: (completed: number, total: number) => void;
  onRenderFile?: (file: string) => void;
}

export class DocGenEngineImpl {
  private parserManager: ParserManager;
  private registry: ExtractorRegistry;
  private contextBuilder: ContextBuilder;
  private renderer: MarkdownRenderer;
  private events: EngineEvents;

  constructor(events: EngineEvents = {}) {
    this.parserManager = new ParserManager();
    this.registry = new ExtractorRegistry();
    this.contextBuilder = new ContextBuilder();
    this.renderer = new MarkdownRenderer();
    this.events = events;

    // Register extractors
    this.registry.register(new CExtractor(this.parserManager));
    this.registry.register(new CppExtractor(this.parserManager));
    this.registry.register(new KotlinExtractor(this.parserManager));
    this.registry.register(new SwiftExtractor(this.parserManager));
  }

  async scan(config: DocGenConfig): Promise<ScanResult> {
    const files = await this.findFiles(config);
    const allEntries: DocEntry[] = [];
    const scannedFiles: string[] = [];

    for (const file of files) {
      this.events.onScanFile?.(file);

      try {
        const entries = await this.extractFile(file, config);
        allEntries.push(...entries);
        scannedFiles.push(file);
      } catch (error) {
        if (error instanceof ParseError) {
          // Log but continue
          console.error(`Warning: ${error.message}`);
        } else {
          throw error;
        }
      }
    }

    const stats = this.computeStats(allEntries, scannedFiles);
    this.events.onScanComplete?.(stats);

    return { entries: allEntries, stats, files: scannedFiles };
  }

  async enrich(entries: DocEntry[], config: DocGenConfig): Promise<DocEntry[]> {
    const apiKey = config.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required for enrichment. Use --no-ai to skip.');
    }

    const pipeline = new EnrichmentPipeline(apiKey);
    const contexts = this.contextBuilder.buildContexts(entries);

    return pipeline.enrichAll(contexts, {
      model: config.model,
      concurrency: config.concurrency,
      skipDocumented: config.skipDocumented,
      onProgress: this.events.onEnrichProgress,
    });
  }

  async generate(scanResult: ScanResult, config: DocGenConfig): Promise<GenerateResult> {
    let entries = scanResult.entries;
    let enrichedCount = 0;

    // Optionally enrich with AI
    if (config.enrich) {
      entries = await this.enrich(entries, config);
      enrichedCount = entries.filter(e => e.description).length;
    }

    // Render to markdown
    const filesWritten = await this.renderer.render(entries, {
      outputDir: config.outputDir,
      title: config.title,
      templateDir: config.templateDir,
    });

    for (const file of filesWritten) {
      this.events.onRenderFile?.(file);
    }

    return {
      outputDir: config.outputDir,
      filesWritten,
      totalEntries: entries.length,
      enrichedCount,
    };
  }

  private async findFiles(config: DocGenConfig): Promise<string[]> {
    // Build file extensions to look for based on configured languages
    const extensions: string[] = [];
    for (const lang of config.languages) {
      const langExts = LANGUAGE_EXTENSIONS[lang];
      if (langExts) extensions.push(...langExts);
    }

    const patterns = extensions.map(ext => `**/*${ext}`);

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: config.rootDir,
        absolute: true,
        ignore: config.exclude,
      });
      files.push(...matches);
    }

    // Deduplicate
    return [...new Set(files)].sort();
  }

  private async extractFile(file: string, config: DocGenConfig): Promise<DocEntry[]> {
    const ext = path.extname(file);
    let language = EXTENSION_MAP[ext];
    if (!language) return [];

    // For .h files: try C++ first, fall back to C
    if (ext === '.h') {
      const source = await fs.readFile(file, 'utf-8');

      // Check for C++ constructs
      const hasCppConstructs = /\b(class|namespace|template|public:|private:|protected:|virtual|override|nullptr|auto\s+\w+\s*=)\b/.test(source);

      if (hasCppConstructs && config.languages.includes('cpp')) {
        language = 'cpp';
      } else if (config.languages.includes('c')) {
        language = 'c';
      }

      const extractor = this.registry.getExtractor(language);
      if (!extractor) return [];

      const result = await extractor.extract({ file, source, language });
      return result.entries;
    }

    // Filter by configured languages
    if (!config.languages.includes(language)) return [];

    const source = await fs.readFile(file, 'utf-8');
    const extractor = this.registry.getExtractor(language);
    if (!extractor) return [];

    const result = await extractor.extract({ file, source, language });
    return result.entries;
  }

  private computeStats(entries: DocEntry[], files: string[]): ScanStats {
    const byLanguage: Record<SupportedLanguage, number> = { c: 0, cpp: 0, kotlin: 0, swift: 0 };
    const byKind: Record<string, number> = Object.create(null);
    let documentedCount = 0;

    for (const entry of entries) {
      byLanguage[entry.language] = (byLanguage[entry.language] || 0) + 1;
      byKind[entry.kind] = (byKind[entry.kind] || 0) + 1;
      if (entry.description || entry.rawComment) documentedCount++;
    }

    return {
      totalFiles: files.length,
      totalEntries: entries.length,
      byLanguage,
      byKind,
      documentedCount,
      undocumentedCount: entries.length - documentedCount,
    };
  }
}
