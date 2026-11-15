#!/usr/bin/env node
// Read-only Mode B AST comparison against an immutable Git commit.
// This tool does not run product tests, change files, or claim Rust/OS coverage.
import { readFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const BASELINE = 'a3ba7fa30fc4c81890d3075f94142942d001cbf3';

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i < 0 ? fallback : process.argv[i + 1] || fallback;
}

function typescriptParser() {
  const attempts = [process.env.MODE_B_TYPESCRIPT_PATH, 'typescript'];
  const npm = spawnSync('npm', ['root', '-g'], { encoding: 'utf8' });
  if (npm.status === 0) attempts.push(resolve(npm.stdout.trim(), 'typescript'));
  for (const path of attempts.filter(Boolean)) {
    try { return require(path); } catch { /* Try the next installed location. */ }
  }
  throw new Error('TypeScript parser unavailable. Install TypeScript locally or set MODE_B_TYPESCRIPT_PATH.');
}

const PYTHON_AST = [
  'import ast, json, sys',
  'tree = ast.parse(sys.stdin.read())',
  'result = []',
  'class Visitor(ast.NodeVisitor):',
  '    def __init__(self): self.scope = []',
  '    def visit_ClassDef(self, node):',
  '        self.scope.append(node.name)',
  '        self.generic_visit(node)',
  '        self.scope.pop()',
  '    def visit_FunctionDef(self, node):',
  '        result.append({"line": node.lineno, "kind": "function", "name": ".".join(self.scope + [node.name])})',
  '        self.scope.append(node.name)',
  '        self.generic_visit(node)',
  '        self.scope.pop()',
  '    visit_AsyncFunctionDef = visit_FunctionDef',
  '    def visit_Lambda(self, node):',
  '        result.append({"line": node.lineno, "kind": "lambda", "name": ".".join(self.scope + ["<lambda>"])})',
  '        self.generic_visit(node)',
  'Visitor().visit(tree)',
  'print(json.dumps(result))',
].join('\n');

function jsAst(source, path, ts) {
  const kind = path.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS;
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, kind);
  if (file.parseDiagnostics.length) {
    throw new Error(path + ': ' + file.parseDiagnostics.map(x => ts.flattenDiagnosticMessageText(x.messageText, ' ')).join('; '));
  }
  const out = [];
  function name(node) {
    if (node.name && typeof node.name.getText === 'function') return node.name.getText(file);
    const parent = node.parent;
    if (ts.isVariableDeclaration(parent) || ts.isPropertyAssignment(parent)) return parent.name.getText(file);
    if (ts.isCallExpression(parent)) return 'callback:' + parent.expression.getText(file).slice(0, 100);
    if (ts.isPropertyDeclaration(parent)) return parent.name.getText(file);
    return '<anonymous>';
  }
  function visit(node) {
    let kind = null;
    if (ts.isFunctionDeclaration(node)) kind = 'function';
    else if (ts.isArrowFunction(node)) kind = 'arrow';
    else if (ts.isFunctionExpression(node)) kind = 'function-expression';
    else if (ts.isMethodDeclaration(node)) kind = 'method';
    else if (ts.isConstructorDeclaration(node)) kind = 'constructor';
    else if (ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) kind = 'accessor';
    if (kind && node.body) {
      const pos = file.getLineAndCharacterOfPosition(node.getStart(file));
      out.push({ line: pos.line + 1, column: pos.character + 1, kind, name: name(node) });
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return out;
}

function pythonAst(source, path) {
  const r = spawnSync('python3', ['-c', PYTHON_AST], {
    input: source, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024,
  });
  if (r.status !== 0) throw new Error(path + ': Python AST failed: ' + r.stderr.trim());
  return JSON.parse(r.stdout);
}

function registryPaths(markdown) {
  return [...markdown.matchAll(/^## `([^`]+)`$/gm)].map(x => x[1]);
}

function registryLines(markdown, path) {
  const start = markdown.indexOf('## `' + path + '`');
  const end = markdown.indexOf('\n## `', start + 5);
  const text = markdown.slice(start, end < 0 ? undefined : end);
  return [...text.matchAll(/^\| (\d+) \| `([^`]+)` \|/gm)].map(x => Number(x[1]));
}

function git(root, ...args) {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8', maxBuffer: 20 * 1024 * 1024,
  });
}

function run() {
  if (process.argv.includes('--help')) {
    process.stdout.write('Usage: node docs/mode-b/tools/ast-reconciliation.mjs [--repo PATH] [--baseline SHA] [--markdown]\n');
    return;
  }
  const root = resolve(arg('--repo', process.cwd()));
  const baseline = arg('--baseline', BASELINE);
  const registry = readFileSync(resolve(root, 'docs/mode-b/method-level-discovery.md'), 'utf8');
  git(root, 'cat-file', '-e', baseline + '^{commit}');
  const ts = typescriptParser();
  const paths = registryPaths(registry);
  const files = [];
  for (const path of paths) {
    const blob = git(root, 'rev-parse', baseline + ':' + path).trim();
    const source = git(root, 'show', baseline + ':' + path);
    const lines = registryLines(registry, path);
    const registered = new Set(lines);
    let ast = null;
    let parser = 'pending';
    if (/\.(?:mjs|js|ts)$/.test(path)) {
      ast = jsAst(source, path, ts);
      parser = 'typescript';
    } else if (path.endsWith('.py')) {
      ast = pythonAst(source, path);
      parser = 'python-ast';
    } else if (path.endsWith('.rs')) {
      parser = 'requires-rust-ast-cfg';
    } else if (/\.(?:sh|ps1)$/.test(path)) {
      parser = 'requires-shell-parser';
    }
    const missing = ast ? ast.filter(x => !registered.has(x.line)) : null;
    files.push({ path, blob, parser, recorded: lines.length,
      astCallables: ast?.length ?? null,
      missing, exactLineMatches: ast ? ast.length - missing.length : null });
  }
  const result = {
    mode: 'B', baseline, astCompleteness: 'PARTIAL',
    parsers: { javascript: 'typescript', python: 'python3 ast', rust: 'pending', shell: 'pending' },
    totals: {
      files: files.length,
      astParsed: files.filter(x => x.astCallables !== null).length,
      pending: files.filter(x => x.astCallables === null).length,
      missingCallableNodes: files.reduce((sum, x) => sum + (x.missing?.length || 0), 0),
    },
    files,
  };
  if (process.argv.includes('--markdown')) {
    process.stdout.write('# Mode B AST reconciliation (not Stage 3 signoff)\n\n');
    process.stdout.write('Baseline: `' + baseline + '`\n\n');
    process.stdout.write('Parsed ' + result.totals.astParsed + '/' + result.totals.files + ' files; ' +
      result.totals.pending + ' require Rust/shell parsers.\n\n');
    for (const f of files) {
      if (f.missing?.length) {
        process.stdout.write('## `' + f.path + '` @ `' + f.blob + '`\n\n');
        for (const node of f.missing) {
          process.stdout.write('- Line ' + node.line + ': ' + node.kind + ' `' + node.name + '`\n');
        }
        process.stdout.write('\n');
      }
    }
  } else {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  }
}

try { run(); } catch (error) {
  process.stderr.write('Mode B inventory error: ' + error.message + '\n');
  process.exitCode = 1;
}
