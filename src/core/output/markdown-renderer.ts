import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import type { DocEntry } from '../../shared/types.js';
import type { ModuleGroup } from '../analyzer/module-grouper.js';
import { ModuleGrouper } from '../analyzer/module-grouper.js';
import { registerHelpers } from './handlebars-helpers.js';

export interface RenderOptions {
  outputDir: string;
  title?: string;
  templateDir?: string;
}

export class MarkdownRenderer {
  private hbs: typeof Handlebars;
  private templates: Map<string, Handlebars.TemplateDelegate> = new Map();
  private grouper = new ModuleGrouper();

  constructor() {
    this.hbs = Handlebars.create();
    registerHelpers(this.hbs);
  }

  async loadTemplates(templateDir?: string): Promise<void> {
    const dir = templateDir || path.join(import.meta.dirname, '../../../templates');

    // Load main templates
    const templateFiles = ['index', 'module', 'function', 'class', 'enum'];
    for (const name of templateFiles) {
      const filePath = path.join(dir, `${name}.hbs`);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        this.templates.set(name, this.hbs.compile(content));
      } catch {
        // Use built-in template if file doesn't exist
        this.templates.set(name, this.hbs.compile(this.getBuiltinTemplate(name)));
      }
    }

    // Always register built-in partials first as baseline
    this.registerBuiltinPartials();

    // Override with disk partials if available
    const partialDir = path.join(dir, 'partials');
    try {
      const partialFiles = await fs.readdir(partialDir);
      for (const file of partialFiles) {
        if (file.endsWith('.hbs')) {
          const content = await fs.readFile(path.join(partialDir, file), 'utf-8');
          const name = file.replace('.hbs', '');
          this.hbs.registerPartial(name, content);
        }
      }
    } catch {
      // Disk partials unavailable, builtins already registered
    }
  }

  async render(entries: DocEntry[], options: RenderOptions): Promise<string[]> {
    await this.loadTemplates(options.templateDir);

    const groups = this.grouper.groupByFile(entries);
    const filesWritten: string[] = [];

    // Create output directory
    await fs.mkdir(options.outputDir, { recursive: true });

    // Render index page
    const indexTemplate = this.templates.get('index')!;
    const indexContent = indexTemplate({
      title: options.title || 'API Documentation',
      modules: groups,
      totalEntries: entries.length,
      stats: this.computeStats(entries),
    });
    const indexPath = path.join(options.outputDir, 'index.md');
    await fs.writeFile(indexPath, indexContent);
    filesWritten.push(indexPath);

    // Render per-module pages
    const moduleTemplate = this.templates.get('module')!;
    for (const group of groups) {
      const moduleContent = moduleTemplate({
        module: group,
        entries: group.entries,
        classes: group.classes,
        functions: group.functions,
        enums: group.enums,
        others: group.others,
      });
      const modulePath = path.join(options.outputDir, `${group.name}.md`);
      await fs.writeFile(modulePath, moduleContent);
      filesWritten.push(modulePath);
    }

    return filesWritten;
  }

  private computeStats(entries: DocEntry[]) {
    const byKind: Record<string, number> = {};
    const byLanguage: Record<string, number> = {};
    let documented = 0;

    for (const e of entries) {
      byKind[e.kind] = (byKind[e.kind] || 0) + 1;
      byLanguage[e.language] = (byLanguage[e.language] || 0) + 1;
      if (e.description) documented++;
    }

    return { byKind, byLanguage, documented, total: entries.length };
  }

  private getBuiltinTemplate(name: string): string {
    const templates: Record<string, string> = {
      index: `# {{title}}

> Generated documentation covering {{totalEntries}} entries.

## Modules

{{#each modules}}
- [{{name}}](./{{name}}.md) — {{entries.length}} entries
{{/each}}

---

## Statistics

| Metric | Count |
|--------|-------|
| Total entries | {{stats.total}} |
| Documented | {{stats.documented}} |
{{#each stats.byLanguage}}
| {{@key}} | {{this}} |
{{/each}}
`,

      module: `# {{module.name}}

> Source: \`{{module.file}}\`

{{#if classes.length}}
## Classes & Structs

{{#each classes}}
{{> class-entry this}}
{{/each}}
{{/if}}

{{#if functions.length}}
## Functions

{{#each functions}}
{{> function-entry this}}
{{/each}}
{{/if}}

{{#if enums.length}}
## Enums

{{#each enums}}
{{> enum-entry this}}
{{/each}}
{{/if}}

{{#if others.length}}
## Other

{{#each others}}
### {{name}}

{{#if description}}
{{description}}
{{/if}}

\`\`\`
{{signature}}
\`\`\`

{{/each}}
{{/if}}
`,

      function: `{{> function-entry this}}`,
      class: `{{> class-entry this}}`,
      enum: `{{> enum-entry this}}`,
    };

    return templates[name] || `{{! Template "${name}" not found }}`;
  }

  private registerBuiltinPartials(): void {
    this.hbs.registerPartial('function-entry', `### {{name}}

{{#if visibility}}{{visibility_badge visibility}} {{/if}}{{#if isStatic}}\`static\` {{/if}}{{#if isAsync}}\`async\` {{/if}}

\`\`\`
{{signature}}
\`\`\`

{{#if description}}
{{description}}
{{/if}}

{{#if params.length}}
**Parameters:**

{{paramTable params}}
{{/if}}

{{#if returnType}}
**Returns:** \`{{returnType.type}}\`{{#if returnType.description}} — {{returnType.description}}{{/if}}
{{/if}}

{{#if throws.length}}
**Throws:**
{{#each throws}}
- {{#if type}}\`{{type}}\`{{/if}}{{#if description}} {{description}}{{/if}}
{{/each}}
{{/if}}

{{#if examples.length}}
**Examples:**
{{#each examples}}
{{#if description}}
*{{description}}*
{{/if}}
\`\`\`{{language}}
{{code}}
\`\`\`
{{/each}}
{{/if}}

{{#if edgeCases.length}}
**Edge Cases:**
{{#each edgeCases}}
- {{this}}
{{/each}}
{{/if}}

---

`);

    this.hbs.registerPartial('class-entry', `### {{name}}

{{#if visibility}}{{visibility_badge visibility}} {{/if}}\`{{kind}}\`

\`\`\`
{{signature}}
\`\`\`

{{#if description}}
{{description}}
{{/if}}

{{#if templateParams.length}}
**Template Parameters:** {{#each templateParams}}\`{{this}}\`{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

---

`);

    this.hbs.registerPartial('enum-entry', `### {{name}}

\`enum\`

\`\`\`
{{signature}}
\`\`\`

{{#if description}}
{{description}}
{{/if}}

---

`);

    this.hbs.registerPartial('signature', `\`\`\`
{{signature}}
\`\`\``);

    this.hbs.registerPartial('params-table', `{{paramTable params}}`);

    this.hbs.registerPartial('examples', `{{#each examples}}
{{#if description}}
*{{description}}*
{{/if}}
\`\`\`{{language}}
{{code}}
\`\`\`
{{/each}}`);

    this.hbs.registerPartial('edge-cases', `{{#each edgeCases}}
- {{this}}
{{/each}}`);
  }
}
