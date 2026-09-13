const fs = require('node:fs');
const path = require('node:path');
const { isBuiltin } = require('node:module');
const ts = require('typescript');
const { root, packages } = require('./packages.cjs');

// Installing every tarball together can hide a missing dependency declaration.
function checkPackageImports(manifest) {
  const dependencies = {
    ...manifest.dependencies,
    ...manifest.peerDependencies,
  };
  for (const local of packages) {
    if (
      local.name in dependencies &&
      dependencies[local.name] !== local.version
    ) {
      throw new Error(
        `${manifest.name}: ${local.name} must match ${local.version}`
      );
    }
  }
  const directory = path.join(root, manifest.directory, 'dist');
  for (const file of fs.readdirSync(directory, { recursive: true })) {
    if (!/\.(js|ts)$/.test(file)) continue;
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(path.join(directory, file), 'utf8'),
      ts.ScriptTarget.Latest,
      true
    );
    function visit(node) {
      let specifier;
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
        specifier = node.moduleSpecifier;
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument))
        specifier = node.argument.literal;
      if (
        ts.isCallExpression(node) &&
        ((ts.isIdentifier(node.expression) &&
          node.expression.text === 'require') ||
          node.expression.kind === ts.SyntaxKind.ImportKeyword)
      )
        specifier = node.arguments[0];
      if (specifier && ts.isStringLiteral(specifier)) {
        const name = specifier.text;
        if (!name.startsWith('.') && !isBuiltin(name)) {
          const dependency = name.startsWith('@')
            ? name.split('/').slice(0, 2).join('/')
            : name.split('/')[0];
          if (!(dependency in dependencies))
            throw new Error(
              `${manifest.name}/${file}: undeclared dependency ${dependency}`
            );
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}
module.exports = { checkPackageImports };
