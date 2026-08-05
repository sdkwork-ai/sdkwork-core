import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
  test: {
    environment: "jsdom",
    globals: true
  }
});
