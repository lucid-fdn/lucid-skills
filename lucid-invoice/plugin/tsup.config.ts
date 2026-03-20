import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/bin.ts', 'src/mcp.ts', 'src/openclaw.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node22',
  outDir: 'dist',
  splitting: false,
  banner: ({ format }) => {
    if (format === 'esm') {
      return {
        js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
      };
    }
    return {};
  },
});
