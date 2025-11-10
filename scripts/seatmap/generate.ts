#!/usr/bin/env tsx

/**
 * Seatmap Generation Script
 * Main entry point for generating seatmap SVG from configuration
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { FloorPlanConfig } from './types.js';
import { FloorPlan } from './layout/floor-plan.js';
import { DEFAULT_COLORS } from './core/svg-renderer.js';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load floor plan configuration from JSON file
 */
function loadFloorPlanConfig(configPath: string): FloorPlanConfig {
  const fullPath = path.resolve(__dirname, configPath);
  const jsonContent = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(jsonContent) as FloorPlanConfig;
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
 * Generate seatmap from configuration
 */
function generateSeatmap(configPath: string, outputPath: string): void {
  console.log(`🔧 Loading configuration from: ${configPath}`);
  const config = loadFloorPlanConfig(configPath);

  console.log(`📐 Generating floor plan: ${config.name}`);
  const floorPlan = new FloorPlan(config);

  console.log(`🎨 Rendering SVG...`);
  const svg = floorPlan.render(DEFAULT_COLORS);

  console.log(`💾 Saving to: ${outputPath}`);
  saveSVG(svg, outputPath);

  console.log(`✅ Generated seatmap SVG successfully!`);
  console.log(`📊 Layout summary:`);
  console.log(`   - Dimensions: ${config.dimensions.width}x${config.dimensions.height}`);
  console.log(`   - Rows: ${config.rows.length}`);

  const tableCount = config.rows.reduce((sum, row) => sum + row.tables.length, 0);
  const indoorTableCount = config.indoor?.tables.length || 0;
  console.log(`   - Outdoor tables: ${tableCount}`);
  console.log(`   - Indoor tables: ${indoorTableCount}`);
  console.log(`   - Total tables: ${tableCount + indoorTableCount}`);
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  let configPath = 'data/main-floor.json';
  let outputPath = '../../public/data/seatmap/main-floor.svg';

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
export { generateSeatmap, loadFloorPlanConfig };
