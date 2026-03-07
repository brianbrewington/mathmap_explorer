import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'https://cdn.jsdelivr.net/npm/d3-force@3/+esm': 'd3-force',
    },
  },
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node'
  }
});
