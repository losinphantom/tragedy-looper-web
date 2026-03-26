import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export type ScaffoldMode = 'module' | 'script';

export type ScaffoldOptions = {
  mode: ScaffoldMode;
  module: string;
  script: string;
  rootDir?: string;
  force?: boolean;
};

export type ScaffoldResult = {
  mode: ScaffoldMode;
  moduleId: string;
  tragedySetId: string;
  scriptId: string;
  createdFiles: string[];
  updatedFiles: string[];
};

type TemplateName =
  | 'module-manifest.ts.tpl'
  | 'script-definition.ts.tpl'
  | 'module-index.ts.tpl'
  | 'README.md.tpl';

type TemplateContext = {
  MODULE_ID: string;
  TRAGEDY_SET_ID: string;
  SCRIPT_ID: string;
  SCRIPT_EXPORT_NAME: string;
  SCRIPT_FILE_NAME: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const TEMPLATE_ROOT = path.join(__dirname, 'templates', 'official-content-pack');
const HELP_TEXT = `Usage: npm run scaffold:official-content -- --mode <module|script> --module <module_id> --script <script_id> [--root <dir>] [--force]

Examples:
  npm run scaffold:official-content -- --mode module --module basic_tragedy --script my_script
  npm run scaffold:official-content -- --mode script --module basic_tragedy --script second_script

Options:
  --mode     Required. "module" creates a new official module skeleton. "script" adds a script to an existing module.
  --module   Required. Explicit module id input. "basic_tragedy" normalizes to moduleId "basic-tragedy".
  --script   Required. Explicit script id input. "my-script" normalizes to scriptId "my_script".
  --root     Optional output root. Defaults to the current repository root.
  --force    Optional. Overwrite generated files if they already exist.
  --help     Show this message.
`;

function normalizeModuleId(rawValue: string): string {
  const normalized = rawValue.trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/-+/g, '-');
  if (!normalized) {
    throw new Error('Missing module id.');
  }
  return normalized;
}

function normalizeScriptId(rawValue: string): string {
  const normalized = rawValue.trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/_+/g, '_');
  if (!normalized) {
    throw new Error('Missing script id.');
  }
  return normalized;
}

function toTragedySetId(moduleId: string): string {
  return moduleId.replace(/-/g, '_');
}

function toCamelCase(value: string): string {
  const parts = value.split(/[_-]/).filter(Boolean);
  return parts
    .map((part, index) => {
      const lower = part.toLowerCase();
      return index === 0 ? lower : `${lower[0]?.toUpperCase() ?? ''}${lower.slice(1)}`;
    })
    .join('');
}

function toScreamingSnake(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase();
}

function parseArgs(argv: string[]): ScaffoldOptions | { help: true } {
  const args = new Map<string, string | boolean>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument: ${token}`);
    }
    const key = token.slice(2);
    if (key === 'help' || key === 'force') {
      args.set(key, true);
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }
    args.set(key, value);
    index += 1;
  }

  if (args.has('help')) {
    return { help: true };
  }

  const mode = args.get('mode');
  if (mode !== 'module' && mode !== 'script') {
    throw new Error('The --mode option must be "module" or "script".');
  }

  const moduleValue = args.get('module');
  const scriptValue = args.get('script');
  if (typeof moduleValue !== 'string' || typeof scriptValue !== 'string') {
    throw new Error('Both --module and --script are required.');
  }

  const rootDir = typeof args.get('root') === 'string' ? path.resolve(String(args.get('root'))) : REPO_ROOT;

  return {
    mode,
    module: moduleValue,
    script: scriptValue,
    rootDir,
    force: Boolean(args.get('force')),
  };
}

async function loadTemplate(name: TemplateName): Promise<string> {
  return fs.readFile(path.join(TEMPLATE_ROOT, name), 'utf8');
}

function renderTemplate(template: string, context: TemplateContext): string {
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key: keyof TemplateContext) => context[key] ?? '');
}

async function ensureWritableFile(filePath: string, content: string, force = false): Promise<'created' | 'updated'> {
  try {
    await fs.access(filePath);
    if (!force) {
      throw new Error(`Refusing to overwrite existing file: ${filePath}`);
    }
    await fs.writeFile(filePath, content, 'utf8');
    return 'updated';
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf8');
    return 'created';
  }
}

function updateManifestScriptIds(source: string, scriptId: string): string {
  const scriptIdsPattern = /scriptIds:\s*\[([^\]]*)\]/m;
  const match = source.match(scriptIdsPattern);
  if (!match) {
    throw new Error('Unable to find a scriptIds array in the target manifest.');
  }

  const existingIds = match[1]
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => part.replace(/^['"]|['"]$/g, ''));

  if (existingIds.includes(scriptId)) {
    return source;
  }

  const nextIds = [...existingIds, scriptId];
  const replacement = `scriptIds: [${nextIds.map(id => `'${id}'`).join(', ')}]`;
  return source.replace(scriptIdsPattern, replacement);
}

export async function scaffoldOfficialContentPack(options: ScaffoldOptions): Promise<ScaffoldResult> {
  const moduleId = normalizeModuleId(options.module);
  const scriptId = normalizeScriptId(options.script);
  const tragedySetId = toTragedySetId(moduleId);
  const scriptDirectoryName = toCamelCase(tragedySetId);
  const scriptFileName = `${toCamelCase(scriptId)}.ts`;
  const context: TemplateContext = {
    MODULE_ID: moduleId,
    TRAGEDY_SET_ID: tragedySetId,
    SCRIPT_ID: scriptId,
    SCRIPT_EXPORT_NAME: toScreamingSnake(scriptId),
    SCRIPT_FILE_NAME: path.basename(scriptFileName, '.ts'),
  };

  const rootDir = path.resolve(options.rootDir ?? REPO_ROOT);
  const manifestPath = path.join(rootDir, 'packages/game-logic/src/rules/modules', moduleId, 'manifest.ts');
  const moduleIndexPath = path.join(rootDir, 'packages/game-logic/src/rules/modules', moduleId, 'index.ts');
  const scriptDir = path.join(rootDir, 'packages/domain/src/data/scripts', scriptDirectoryName);
  const scriptPath = path.join(scriptDir, scriptFileName);
  const readmePath = path.join(scriptDir, 'README.md');

  const createdFiles: string[] = [];
  const updatedFiles: string[] = [];

  const scriptTemplate = await loadTemplate('script-definition.ts.tpl');
  const renderedScript = renderTemplate(scriptTemplate, context);
  const scriptWriteStatus = await ensureWritableFile(scriptPath, renderedScript, options.force);
  (scriptWriteStatus === 'created' ? createdFiles : updatedFiles).push(scriptPath);

  if (options.mode === 'module') {
    const [manifestTemplate, indexTemplate, readmeTemplate] = await Promise.all([
      loadTemplate('module-manifest.ts.tpl'),
      loadTemplate('module-index.ts.tpl'),
      loadTemplate('README.md.tpl'),
    ]);

    const writes: Array<[string, string]> = [
      [manifestPath, renderTemplate(manifestTemplate, context)],
      [moduleIndexPath, renderTemplate(indexTemplate, context)],
      [readmePath, renderTemplate(readmeTemplate, context)],
    ];

    for (const [filePath, content] of writes) {
      const writeStatus = await ensureWritableFile(filePath, content, options.force);
      (writeStatus === 'created' ? createdFiles : updatedFiles).push(filePath);
    }
  } else {
    const manifestSource = await fs.readFile(manifestPath, 'utf8');
    const nextManifestSource = updateManifestScriptIds(manifestSource, scriptId);
    if (nextManifestSource !== manifestSource) {
      await fs.writeFile(manifestPath, nextManifestSource, 'utf8');
      updatedFiles.push(manifestPath);
    }
  }

  return {
    mode: options.mode,
    moduleId,
    tragedySetId,
    scriptId,
    createdFiles: createdFiles.sort(),
    updatedFiles: updatedFiles.sort(),
  };
}

async function runCli(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  if ('help' in parsed) {
    console.log(HELP_TEXT);
    return;
  }

  const result = await scaffoldOfficialContentPack(parsed);
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
