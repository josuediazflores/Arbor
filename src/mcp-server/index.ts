#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { scanRepo } from './tools/scan-repo.js';
import { generateDocs } from './tools/generate-docs.js';

const server = new McpServer({
  name: 'arbor',
  version: '0.1.0',
});

// Register scan_repo tool
server.registerTool(
  'scan_repo',
  {
    title: 'Scan Repository',
    description: 'Scan a source code repository and extract documentation entries from C, C++, Kotlin, and Swift files. Returns entry names, kinds, signatures, and documentation status.',
    inputSchema: z.object({
      rootDir: z.string().describe('Root directory of the repository to scan'),
      languages: z.array(z.enum(['c', 'cpp', 'kotlin', 'swift'])).optional().describe('Languages to scan (defaults to all)'),
      include: z.array(z.string()).optional().describe('Glob patterns to include'),
      exclude: z.array(z.string()).optional().describe('Glob patterns to exclude'),
    }),
  },
  async ({ rootDir, languages, include, exclude }) => {
    try {
      const result = await scanRepo({ rootDir, languages, include, exclude });
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error: ${(error as Error).message}`,
        }],
        isError: true,
      };
    }
  },
);

// Register generate_docs tool
server.registerTool(
  'generate_docs',
  {
    title: 'Generate Documentation',
    description: 'Generate markdown documentation from source code. Scans the repository, optionally enriches with AI descriptions, and outputs markdown files.',
    inputSchema: z.object({
      rootDir: z.string().describe('Root directory of the repository'),
      outputDir: z.string().optional().describe('Output directory for generated docs (defaults to ./docs)'),
      enrich: z.boolean().optional().describe('Enable AI enrichment with Claude (requires ANTHROPIC_API_KEY)'),
      languages: z.array(z.enum(['c', 'cpp', 'kotlin', 'swift'])).optional().describe('Languages to scan'),
    }),
  },
  async ({ rootDir, outputDir, enrich, languages }) => {
    try {
      const result = await generateDocs({ rootDir, outputDir, enrich, languages });
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error: ${(error as Error).message}`,
        }],
        isError: true,
      };
    }
  },
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('DocGen MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
