#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const [, , pkgPathArg, version] = process.argv;

if (!pkgPathArg || !version) {
  console.error('Usage: node update-package-version.js <package.json path> <version>');
  process.exit(1);
}

const pkgPath = path.resolve(process.cwd(), pkgPathArg);

if (!fs.existsSync(pkgPath)) {
  console.error(`File not found: ${pkgPath}`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = version;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

