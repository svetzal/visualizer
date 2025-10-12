import { Blob } from 'buffer';

console.log('[Bootstrap] Starting...');

// Polyfill for undici in Electron's main process
// This must run before any other imports
console.log('[Bootstrap] Setting up polyfills...');
if (typeof global.File === 'undefined') {
  // @ts-ignore
  global.File = class File extends Blob {
    name: string;
    lastModified: number;

    constructor(bits: any[], name: string, options?: any) {
      super(bits, options);
      this.name = name;
      this.lastModified = options?.lastModified || Date.now();
    }
  };
}

// Also polyfill FormData if needed
if (typeof global.FormData === 'undefined') {
  // @ts-ignore
  global.FormData = class FormData {
    private data: Map<string, any>;

    constructor() {
      this.data = new Map();
    }

    append(name: string, value: any) {
      this.data.set(name, value);
    }

    get(name: string) {
      return this.data.get(name);
    }
  };
}

// Now import and run the main application
console.log('[Bootstrap] Polyfills complete, loading main...');
import('./main.js')
  .then(() => {
    console.log('[Bootstrap] Main module loaded successfully');
  })
  .catch((error) => {
    console.error('[Bootstrap] Failed to start application:', error);
    console.error(error.stack);
    process.exit(1);
  });
