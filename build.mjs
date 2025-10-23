import * as esbuild from 'esbuild';
import { resolve } from 'path';

await esbuild.build({
  entryPoints: ['renderer/index.tsx'],
  bundle: true,
  outfile: 'renderer/bundle.js',
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts',
  },
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  minify: false,
  sourcemap: true,
});

console.log('✓ React bundle built successfully');
