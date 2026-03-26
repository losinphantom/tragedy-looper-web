import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

const TARGET_FILES = [
  'packages/game-logic/src/moves.ts',
  'packages/game-logic/src/phaseResolveCardsHandler.ts',
  'packages/game-logic/src/phaseCheckpointHandlers.ts',
  'packages/game-logic/src/resultAnnouncements.ts',
  'packages/game-logic/src/runtime/interactions.ts',
  'packages/game-logic/src/lossConditions.ts',
] as const;

const FORBIDDEN_PATTERNS = [
  { label: 'G.publicLog.push', regex: /G\.publicLog\.push\s*\(/g },
  { label: 'G.fullLog.push', regex: /G\.fullLog\.push\s*\(/g },
  { label: 'G.v1.eventLogs.push', regex: /G\.v1\.eventLogs\.push\s*\(/g },
] as const;

type AuditFailure = {
  file: string;
  pattern: string;
  line: number;
  source: string;
};

function findFailures(file: string): AuditFailure[] {
  const absolutePath = resolve(ROOT, file);
  const content = readFileSync(absolutePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const failures: AuditFailure[] = [];

  for (const pattern of FORBIDDEN_PATTERNS) {
    for (let index = 0; index < lines.length; index += 1) {
      if (pattern.regex.test(lines[index])) {
        failures.push({
          file,
          pattern: pattern.label,
          line: index + 1,
          source: lines[index].trim(),
        });
      }
      pattern.regex.lastIndex = 0;
    }
  }

  return failures;
}

const failures = TARGET_FILES.flatMap(findFailures);

if (failures.length > 0) {
  console.error('Timeline fact audit failed. Direct legacy history writes remain in migrated hotspots:');
  for (const failure of failures) {
    console.error(`- ${failure.file}:${failure.line} matched ${failure.pattern}`);
    console.error(`  ${failure.source}`);
  }
  process.exit(1);
}

console.log('Timeline fact audit passed. No forbidden legacy history writers found in migrated hotspots.');
