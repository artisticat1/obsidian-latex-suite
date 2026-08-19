import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: false,
    globalSetup: ['obsidian-integration-testing/vitest-global-setup-plugin']
  }
});
