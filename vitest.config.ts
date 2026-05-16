import { defineConfig, Plugin } from 'vitest/config';

// node:sqlite (added in Node 22) is not in Vite's built-in node-protocol allowlist.
// Marking all node: protocol imports as external prevents Vite from trying to bundle them.
const nodeProtocolExternalPlugin: Plugin = {
  name: 'vitest-node-protocol-external',
  enforce: 'pre',
  resolveId(id: string) {
    if (id.startsWith('node:')) {
      return { id, external: true };
    }
    return null;
  },
};

export default defineConfig({
  plugins: [nodeProtocolExternalPlugin],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'tests/'],
    },
    testTimeout: 15000,
    pool: 'forks',
  },
});
