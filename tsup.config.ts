import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/mcp.ts', 'src/openclaw.ts', 'src/bin.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  outDir: 'dist',
  splitting: false,
  banner: ({ format }) => {
    if (format === 'esm') {
      return {
        js: '// Lucid Tax - Crypto Tax & DeFi Accounting MCP Plugin\n// (c) Raijin Labs\n',
      };
    }
    return {};
  },
});
