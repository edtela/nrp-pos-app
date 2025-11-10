#!/usr/bin/env tsx

/**
 * V2 Seatmap Generation Script
 * Generates SVG from component-based configuration
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { RootConfig } from './types.js';
import { loadConfig } from './config.js';
import { renderToSVG } from './renderer.js';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load configuration from JSON file
 */
function loadConfigFile(configPath: string): RootConfig {
  const fullPath = path.resolve(__dirname, configPath);
  const jsonContent = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(jsonContent) as RootConfig;
}

/**
 * Save SVG to file
 */
function saveSVG(svg: string, outputPath: string): void {
  const fullPath = path.resolve(__dirname, outputPath);
  const dir = path.dirname(fullPath);

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(fullPath, svg, 'utf-8');
}

/**
 * Generate seatmap from v2 configuration
 */
function generateSeatmap(configPath: string, outputPath: string): void {
  console.log(`🔧 Loading v2 configuration from: ${configPath}`);
  const rootConfig = loadConfigFile(configPath);

  console.log(`📐 Base unit: ${rootConfig.baseUnit}px (1s)`);
  console.log(`📦 Building component tree...`);
  const { rootComponent } = loadConfig(rootConfig);

  console.log(`🎨 Rendering SVG (three-phase layout)...`);
  const svg = renderToSVG(rootComponent);

  console.log(`💾 Saving to: ${outputPath}`);
  saveSVG(svg, outputPath);

  console.log(`✅ Generated v2 seatmap successfully!`);
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  let configPath = '../data/v2-simple.json';
  let outputPath = '../../../public/data/seatmap/v2-simple.svg';

  if (args.length > 0) {
    configPath = args[0];
  }
  if (args.length > 1) {
    outputPath = args[1];
  }

  try {
    generateSeatmap(configPath, outputPath);
  } catch (error) {
    console.error('❌ Error generating seatmap:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Export for programmatic use
export { generateSeatmap, loadConfigFile };
