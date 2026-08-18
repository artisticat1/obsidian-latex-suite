import { defineConfig } from 'vitest/config';
import 'obsidian-integration-testing/vitest/typings';
import "node"



export default defineConfig({
  test: {
    fileParallelism: false,
    globalSetup: ['obsidian-integration-testing/vitest-global-setup-plugin']
  }
});
