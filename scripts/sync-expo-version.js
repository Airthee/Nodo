#!/usr/bin/env node
/**
 * Sync package.json version into app.json (expo.version).
 * Used by release-it before:release hook.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const appPath = path.join(root, "app.json");
const app = JSON.parse(fs.readFileSync(appPath, "utf8"));

app.expo.version = pkg.version;
fs.writeFileSync(appPath, JSON.stringify(app, null, 2) + "\n");
console.log("Synced app.json expo.version to", pkg.version);
