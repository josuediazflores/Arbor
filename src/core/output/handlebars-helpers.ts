import Handlebars from 'handlebars';
import type { DocEntry, ParamEntry } from '../../shared/types.js';
import { LANGUAGE_NAMES } from '../../shared/constants.js';

export function registerHelpers(hbs: typeof Handlebars): void {
  hbs.registerHelper('codeBlock', function (code: string, language: string) {
    return new hbs.SafeString(`\`\`\`${language || ''}\n${code}\n\`\`\``);
  });

  hbs.registerHelper('inlineCode', function (text: string) {
    if (!text) return '';
    return new hbs.SafeString(`\`${text}\``);
  });

  hbs.registerHelper('paramTable', function (params: ParamEntry[]) {
    if (!params || params.length === 0) return '';

    const rows = params.map(p => {
      const name = `\`${p.name}\``;
      const type = p.type ? `\`${p.type}\`` : '-';
      const desc = p.description || '-';
      const def = p.defaultValue ? `\`${p.defaultValue}\`` : '-';
      return `| ${name} | ${type} | ${desc} | ${def} |`;
    });

    return new hbs.SafeString(
      `| Parameter | Type | Description | Default |\n` +
      `|-----------|------|-------------|----------|\n` +
      rows.join('\n')
    );
  });

  hbs.registerHelper('langName', function (lang: string) {
    return LANGUAGE_NAMES[lang as keyof typeof LANGUAGE_NAMES] || lang;
  });

  hbs.registerHelper('kindIcon', function (kind: string) {
    const icons: Record<string, string> = {
      function: 'fn',
      method: 'method',
      class: 'class',
      struct: 'struct',
      enum: 'enum',
      protocol: 'protocol',
      extension: 'ext',
      typedef: 'type',
      namespace: 'ns',
      property: 'prop',
      object: 'obj',
      constructor: 'init',
      destructor: 'deinit',
    };
    return icons[kind] || kind;
  });

  hbs.registerHelper('anchor', function (name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  });

  hbs.registerHelper('ifNotEmpty', function (this: unknown, arr: unknown[], options: Handlebars.HelperOptions) {
    if (arr && arr.length > 0) {
      return options.fn(this);
    }
    return options.inverse(this);
  });

  hbs.registerHelper('eq', function (a: unknown, b: unknown) {
    return a === b;
  });

  hbs.registerHelper('visibility_badge', function (visibility: string | undefined) {
    if (!visibility || visibility === 'public') return '';
    return new hbs.SafeString(`\`${visibility}\``);
  });
}
