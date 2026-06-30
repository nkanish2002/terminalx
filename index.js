/**
 * TerminalFS Framework Public API
 * 
 * Export defineConfig() and Config type for consumer type-checking.
 * Runtime: no-op identity helper with type annotations.
 */

/**
 * Define the terminal site configuration.
 * Validates structure but passes through all fields.
 * @param {object} config 
 * @returns {object}
 */
export function defineConfig(config) {
  // Runtime validation placeholder — full validation in build/config.js
  return config;
}

export default defineConfig;

// Type definitions for consumers using TypeScript
// @typedef {import('./terminal.config.ts').TerminalConfig} Config
