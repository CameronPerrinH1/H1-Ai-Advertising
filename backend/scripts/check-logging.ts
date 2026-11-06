// Logging guard (D34, build plan 6.6): fails if backend code could write conversation text to a log.
//   pnpm --filter @concierge/backend check:logging
// Rules, for every .ts file under backend/src and shared/src:
//   - log(event, fields) takes an object literal whose keys are all on log.ts's allowlist, with no spreads.
//   - Field values are numbers, booleans, or fixed string values (a union of literals). A free-form string
//     must not be read from a property that holds guest content (text, message, phone, email, ...).
//   - No console.* or process.stdout/stderr writes, except lines marked `log-guard: allow (<reason>)`.
import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const logFile = join(root, 'backend/src/log.ts');
const allowed = new Set([...readFileSync(logFile, 'utf8').matchAll(/^\s*'([A-Za-z]+)',/gm)].map((m) => m[1]!));
const CONTENT = /^(text|texts|message|messages|content|input|prompt|body|transcript|history|display|phone|email|firstName|lastName|name|notes?|preferredTimes|reason|summary|output)$/;
// Free-form strings that are safe for one field: a tool's name, an error's class name.
const SAFE_FOR: Record<string, RegExp> = { tool: /^name$/, error: /^name$/ };
const MARKER = /log-guard: allow \([^)]+\)/;

const configPath = join(root, 'backend/tsconfig.json');
const parsed = ts.getParsedCommandLineOfConfigFile(configPath, {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} })!;
const program = ts.createProgram(parsed.fileNames, parsed.options);
const checker = program.getTypeChecker();

// True when every possible value is a number, boolean, undefined, or a specific string literal.
function fixedValue(type: ts.Type): boolean {
  const parts = type.isUnion() ? type.types : [type];
  return parts.every(
    (t) =>
      t.isStringLiteral() ||
      t.isNumberLiteral() ||
      (t.flags & (ts.TypeFlags.NumberLike | ts.TypeFlags.BooleanLike | ts.TypeFlags.Undefined | ts.TypeFlags.Null)) !== 0,
  );
}

// The first property or variable name in the expression that can hold guest content.
function readsContent(node: ts.Node, key: string): string | undefined {
  let found: string | undefined;
  const flag = (name: string) => {
    if (CONTENT.test(name) && !SAFE_FOR[key]?.test(name)) found ??= name;
  };
  const visit = (n: ts.Node) => {
    if (ts.isPropertyAccessExpression(n)) flag(n.name.text);
    else if (ts.isIdentifier(n) && !ts.isPropertyAccessExpression(n.parent)) flag(n.text);
    ts.forEachChild(n, visit);
  };
  visit(node);
  return found;
}

const inScope = (f: string) => (f.startsWith(join(root, 'backend/src')) || f.startsWith(join(root, 'shared/src'))) && f !== logFile;
const problems: string[] = [];

for (const source of program.getSourceFiles().filter((s) => inScope(s.fileName))) {
  const where = (n: ts.Node) => `${relative(root, source.fileName)}:${source.getLineAndCharacterOfPosition(n.getStart()).line + 1}`;
  const lineText = (n: ts.Node) => source.text.split('\n')[source.getLineAndCharacterOfPosition(n.getStart()).line] ?? '';

  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n)) {
      const callee = n.expression.getText();
      if (callee === 'log') {
        const fields = n.arguments[1];
        if (fields && !ts.isObjectLiteralExpression(fields)) problems.push(`${where(n)} log() fields must be an object literal`);
        if (fields && ts.isObjectLiteralExpression(fields)) {
          for (const p of fields.properties) {
            if (ts.isSpreadAssignment(p)) {
              problems.push(`${where(p)} log() fields can't use a spread`);
              continue;
            }
            const key = p.name?.getText().replace(/['"]/g, '') ?? '';
            if (!allowed.has(key)) problems.push(`${where(p)} log() field "${key}" isn't on the allowlist in log.ts`);
            const value = ts.isPropertyAssignment(p) ? p.initializer : ts.isShorthandPropertyAssignment(p) ? p.name : undefined;
            if (!value || fixedValue(checker.getTypeAtLocation(value))) continue;
            const bad = readsContent(value, key);
            if (bad) problems.push(`${where(p)} log() field "${key}" reads "${bad}", which can hold guest content`);
          }
        }
      }
      if (/^console\.|^process\.(stdout|stderr)\.write$/.test(callee) && !MARKER.test(lineText(n))) {
        problems.push(`${where(n)} ${callee}() writes outside the logger; use log() or mark the line "log-guard: allow (reason)"`);
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(source);
}

if (problems.length) {
  console.error(`Logging guard failed (${problems.length}):\n${problems.map((p) => `  ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(`Logging guard passed (${allowed.size} allowed fields).`);
