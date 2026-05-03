# Node.js SDK Deployment & Publishing Guide

This guide explains how to publish the `@afconwave/sdk` package to the official npm registry.

## Prerequisites
1. You must have an active npm account (https://npmjs.com).
2. You must be added to the `@afconwave` organization on npm.
3. Ensure you are logged into npm on your local CLI:
   ```bash
   npm login
   ```

## Pre-Flight Checklist
Before publishing a new version, ensure:
- [ ] All tests pass (`npm run test`)
- [ ] The TypeScript builds successfully (`npm run build`)
- [ ] The version number in `package.json` has been updated appropriately following Semantic Versioning (e.g., `1.0.1` -> `1.0.2` for bug fixes, `1.1.0` for new features).

## Publishing Steps

1. **Build the Package**
   Ensure the `dist/` directory contains the latest compiled CommonJS and ESM outputs:
   ```bash
   npm run build
   ```

2. **Publish to npm**
   Because this is a scoped package (`@afconwave`), you must explicitly publish it with public access:
   ```bash
   npm publish --access public
   ```

3. **Verify**
   Visit `https://www.npmjs.com/package/@afconwave/sdk` to verify the new version is live.

## Automated CI/CD (Optional)
If you link this directory's parent repository to GitHub Actions, you can automate this using an `NPM_TOKEN`:
```yaml
- run: npm ci
- run: npm run build
- run: npm config set //registry.npmjs.org/:_authToken $NPM_TOKEN
- run: npm publish --access public
```
