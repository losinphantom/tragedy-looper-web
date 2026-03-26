import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const requiredPaths = [
  "package.json",
  "tsconfig.base.json",
  ".gitignore",
  "vitest.config.ts",
  "apps/server",
  "apps/server/package.json",
  "apps/web",
  "apps/web/package.json",
  "packages/domain",
  "packages/domain/package.json",
  "packages/rules",
  "packages/rules/package.json",
];

for (const requiredPath of requiredPaths) {
  assert.equal(existsSync(requiredPath), true, `${requiredPath} should exist`);
}

const rootPackage = JSON.parse(readFileSync("package.json", "utf8"));
assert.deepEqual(rootPackage.workspaces, ["apps/*", "packages/*"]);
assert.equal(rootPackage.private, true);
assert.equal(typeof rootPackage.scripts.test, "string");
assert.equal(typeof rootPackage.scripts.typecheck, "string");

const serverPackage = JSON.parse(readFileSync("apps/server/package.json", "utf8"));
assert.equal(serverPackage.name, "@tragedy/server");
assert.equal(serverPackage.private, true);
assert.equal(serverPackage.type, "module");
assert.ok(serverPackage.scripts, "apps/server/package.json should define scripts");
assert.equal(typeof serverPackage.scripts.dev, "string");

const webPackage = JSON.parse(readFileSync("apps/web/package.json", "utf8"));
assert.equal(webPackage.name, "@tragedy/web");
assert.equal(webPackage.private, true);
assert.equal(webPackage.type, "module");
assert.ok(webPackage.scripts, "apps/web/package.json should define scripts");
assert.equal(typeof webPackage.scripts.dev, "string");

const domainPackage = JSON.parse(readFileSync("packages/domain/package.json", "utf8"));
assert.equal(domainPackage.name, "@tragedy/domain");
assert.equal(domainPackage.private, true);
assert.equal(domainPackage.type, "module");

const rulesPackage = JSON.parse(readFileSync("packages/rules/package.json", "utf8"));
assert.equal(rulesPackage.name, "@tragedy/rules");
assert.equal(rulesPackage.private, true);
assert.equal(rulesPackage.type, "module");
