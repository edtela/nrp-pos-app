/**
 * Generate complete seatmap SVG with symmetric outdoor and reorganized indoor
 */

// Layout constants
const STOREFRONT = { left: 200, right: 1000, center: 600, width: 800 };
const OUTDOOR_FULL = { left: 0, right: 1200, center: 600, width: 1200, height: 600 };
const VERTICAL_WALKWAY = { left: 550, right: 650, center: 600, width: 100 };

// Padding/spacing constants for consistent gaps
const PADDING = {
  small: 10,      // Small gap (grass to rows, walkway to rows)
  standard: 20,   // Standard gap between elements
  top: 40         // Top margin for grass area
};

// Table dimensions
const TABLE_SIZES = {
  rowB_height: 60,  // Row B rectangular table height
  rowA_chairOffset: 15,  // Distance of north chairs from Row A table center
  rowA_benchEnd: 45  // Distance from Row A center to end of south bench (33 + 12)
};

// Calculate positions based on spacing rules
const ROW_POSITIONS = {
  D: 100,
  C: 200,
  B: 300,  // Same spacing as C-D (100 pixels)
};

// Calculate horizontal walkway position based on Row B
ROW_POSITIONS.B_bottom = ROW_POSITIONS.B + TABLE_SIZES.rowB_height;
const HORIZONTAL_WALKWAY = {
  top: ROW_POSITIONS.B_bottom + PADDING.small,
  get bottom() { return this.top + 100; },
  height: 100
};

// Calculate Row A position based on walkway
ROW_POSITIONS.A = HORIZONTAL_WALKWAY.bottom + PADDING.small + TABLE_SIZES.rowA_chairOffset;

// Calculate indoor section start position based on Row A
const INDOOR_START = ROW_POSITIONS.A + TABLE_SIZES.rowA_benchEnd + PADDING.standard;

// Colors
const COLORS = {
  patio: '#e8f5e9',
  grass: '#7cb342',
  walkway: '#d0d0d0',
  tableOutdoor: '#d7ccc8',    // Light brown for outdoor tables
  tableIndoor: '#d7ccc8',     // Light brown for indoor tables
  chairOutdoor: '#a1887f',    // Darker brown for outdoor chairs/benches
  chairIndoor: '#a1887f',     // Darker brown for indoor chairs
  indoor: '#fff8e1',
  indoorBg: '#f5f5f5',
  wall: '#e0e0e0',
  door: '#b3e5fc',
  bench: '#8d6e63',
  bar: '#795548',
  tableText: '#ffffff'        // White text for table numbers
};

// Helper functions
function roundTable(id, cx, cy, r, label, capacity) {
  return `      <g id="table-${id}-group">
        <circle id="table-${id}" cx="${cx}" cy="${cy}" r="${r}"
                fill="${COLORS.tableOutdoor}" stroke="#333" stroke-width="2"
                data-number="${label}" data-capacity="${capacity}"/>
        <text x="${cx}" y="${cy + 6}" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="${COLORS.tableText}">${label}</text>
      </g>`;
}

function chair(cx, cy, color = COLORS.chairOutdoor) {
  return `        <circle cx="${cx}" cy="${cy}" r="8" fill="${color}" stroke="#666" stroke-width="1"/>`;
}

function bench(x, y, width, height) {
  return `        <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="6" ry="6"
              fill="${COLORS.chairOutdoor}" stroke="#666" stroke-width="1"/>`;
}

function rectTable(id, x, y, width, height, label, capacity) {
  return `      <g id="table-${id}-group">
        <rect id="table-${id}" x="${x}" y="${y}" width="${width}" height="${height}" rx="5"
              fill="${COLORS.tableOutdoor}" stroke="#333" stroke-width="2"
              data-number="${label}" data-capacity="${capacity}"/>
        <text x="${x + width/2}" y="${y + height/2 + 6}" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="${COLORS.tableText}">${label}</text>
      </g>`;
}

// Calculate positions for equal spacing
function calculatePositions(count, start, end) {
  const span = end - start;
  const spacing = span / (count + 1);
  return Array.from({ length: count }, (_, i) => start + spacing * (i + 1));
}

// Calculate positions with minimum spacing between table centers
function calculateRectTablePositions(count, start, end, tableWidth) {
  const span = end - start;
  const totalTableWidth = count * tableWidth;
  const availableGapSpace = span - totalTableWidth;
  const gapSize = availableGapSpace / (count + 1);

  const positions = [];
  for (let i = 0; i < count; i++) {
    const centerX = start + gapSize * (i + 1) + tableWidth * i + tableWidth / 2;
    positions.push(centerX);
  }
  return positions;
}

// Generate grass background areas
function generateGrassAreas() {
  const grassTop = PADDING.top;
  const grassBottom = ROW_POSITIONS.B - PADDING.small; // Small gap before Row B
  const grassHeight = grassBottom - grassTop;

  let svg = `    <!-- Grass areas covering rows D, C and extending to Row B -->\n`;
  svg += `    <rect x="${OUTDOOR_FULL.left}" y="${grassTop}" width="${VERTICAL_WALKWAY.left}" height="${grassHeight}" fill="${COLORS.grass}" stroke="none"/>\n`;
  svg += `    <rect x="${VERTICAL_WALKWAY.right}" y="${grassTop}" width="${OUTDOOR_FULL.right - VERTICAL_WALKWAY.right}" height="${grassHeight}" fill="${COLORS.grass}" stroke="none"/>\n\n`;

  return svg;
}

// Generate Row D (8 round tables with 4 diagonal chairs)
function generateRowD() {
  const y = ROW_POSITIONS.D;
  const r = 30;
  // Match Row B spacing for consistency
  const leftPositions = calculatePositions(4, OUTDOOR_FULL.left + 30, VERTICAL_WALKWAY.left - 30);
  const rightPositions = calculatePositions(4, VERTICAL_WALKWAY.right + 30, OUTDOOR_FULL.right - 30);

  let svg = `    <!-- Row D - Round tables with diagonal chairs -->\n`;
  svg += `    <g id="row-d-tables">\n`;

  // Left side: D1-D4
  leftPositions.forEach((cx, i) => {
    const label = `D${i + 1}`;
    svg += roundTable(`d${i + 1}`, Math.round(cx), y, r, label, 4) + '\n';
    // 4 chairs at 45° angles
    svg += chair(Math.round(cx + 21), Math.round(y - 21)) + '\n'; // 45°
    svg += chair(Math.round(cx + 21), Math.round(y + 21)) + '\n'; // 135°
    svg += chair(Math.round(cx - 21), Math.round(y + 21)) + '\n'; // 225°
    svg += chair(Math.round(cx - 21), Math.round(y - 21)) + '\n'; // 315°
  });

  // Right side: D5-D8
  rightPositions.forEach((cx, i) => {
    const label = `D${i + 5}`;
    svg += roundTable(`d${i + 5}`, Math.round(cx), y, r, label, 4) + '\n';
    // 4 chairs at 45° angles
    svg += chair(Math.round(cx + 21), Math.round(y - 21)) + '\n';
    svg += chair(Math.round(cx + 21), Math.round(y + 21)) + '\n';
    svg += chair(Math.round(cx - 21), Math.round(y + 21)) + '\n';
    svg += chair(Math.round(cx - 21), Math.round(y - 21)) + '\n';
  });

  svg += `    </g>\n\n`;
  return svg;
}

// Generate Row C (8 round tables with 4 diagonal chairs)
function generateRowC() {
  const y = ROW_POSITIONS.C;
  const r = 30;
  // Match Row B spacing for consistency
  const leftPositions = calculatePositions(4, OUTDOOR_FULL.left + 30, VERTICAL_WALKWAY.left - 30);
  const rightPositions = calculatePositions(4, VERTICAL_WALKWAY.right + 30, OUTDOOR_FULL.right - 30);

  let svg = `    <!-- Row C - Round tables with diagonal chairs -->\n`;
  svg += `    <g id="row-c-tables">\n`;

  // Left side: C1-C4
  leftPositions.forEach((cx, i) => {
    const label = `C${i + 1}`;
    svg += roundTable(`c${i + 1}`, Math.round(cx), y, r, label, 4) + '\n';
    svg += chair(Math.round(cx + 21), Math.round(y - 21)) + '\n';
    svg += chair(Math.round(cx + 21), Math.round(y + 21)) + '\n';
    svg += chair(Math.round(cx - 21), Math.round(y + 21)) + '\n';
    svg += chair(Math.round(cx - 21), Math.round(y - 21)) + '\n';
  });

  // Right side: C5-C8
  rightPositions.forEach((cx, i) => {
    const label = `C${i + 5}`;
    svg += roundTable(`c${i + 5}`, Math.round(cx), y, r, label, 4) + '\n';
    svg += chair(Math.round(cx + 21), Math.round(y - 21)) + '\n';
    svg += chair(Math.round(cx + 21), Math.round(y + 21)) + '\n';
    svg += chair(Math.round(cx - 21), Math.round(y + 21)) + '\n';
    svg += chair(Math.round(cx - 21), Math.round(y - 21)) + '\n';
  });

  svg += `    </g>\n\n`;
  return svg;
}

// Generate Row B (8 rectangular tables with 2 benches)
function generateRowB() {
  const y = ROW_POSITIONS.B;
  const width = 100;
  const height = 60;
  // Use special function to ensure proper gaps between rectangular tables
  const leftPositions = calculateRectTablePositions(4, OUTDOOR_FULL.left + 20, VERTICAL_WALKWAY.left - 20, width);
  const rightPositions = calculateRectTablePositions(4, VERTICAL_WALKWAY.right + 20, OUTDOOR_FULL.right - 20, width);

  let svg = `    <!-- Row B - Rectangular tables with benches -->\n`;
  svg += `    <g id="row-b-tables">\n`;

  // Left side: B1-B4
  leftPositions.forEach((cx, i) => {
    const label = `B${i + 1}`;
    const x = Math.round(cx - width / 2);
    svg += rectTable(`b${i + 1}`, x, y, width, height, label, 6) + '\n';
    // North bench
    svg += bench(x + 20, y - 15, 60, 12) + '\n';
    // South bench
    svg += bench(x + 20, y + height + 3, 60, 12) + '\n';
  });

  // Right side: B5-B8
  rightPositions.forEach((cx, i) => {
    const label = `B${i + 5}`;
    const x = Math.round(cx - width / 2);
    svg += rectTable(`b${i + 5}`, x, y, width, height, label, 6) + '\n';
    // North bench
    svg += bench(x + 20, y - 15, 60, 12) + '\n';
    // South bench
    svg += bench(x + 20, y + height + 3, 60, 12) + '\n';
  });

  svg += `    </g>\n\n`;
  return svg;
}

// Generate Row A (6 round tables within storefront)
function generateRowA() {
  const y = ROW_POSITIONS.A;
  const r = 30;
  const leftPositions = calculatePositions(3, STOREFRONT.left, VERTICAL_WALKWAY.left);
  const rightPositions = calculatePositions(3, VERTICAL_WALKWAY.right, STOREFRONT.right);

  let svg = `    <!-- Row A - Round tables within storefront (bench + angled chairs) -->\n`;
  svg += `    <g id="row-a-tables">\n`;

  // Left side: A1-A3
  leftPositions.forEach((cx, i) => {
    const label = `A${i + 1}`;
    svg += roundTable(`a${i + 1}`, Math.round(cx), y, r, label, 4) + '\n';
    // Bench on storefront side
    svg += bench(Math.round(cx - 30), y + 33, 60, 12) + '\n';
    // Two chairs at 60° and 120° angles (north side)
    svg += chair(Math.round(cx - 26), y - 15) + '\n'; // 60°
    svg += chair(Math.round(cx + 26), y - 15) + '\n'; // 120°
  });

  // Right side: A4-A6
  rightPositions.forEach((cx, i) => {
    const label = `A${i + 4}`;
    svg += roundTable(`a${i + 4}`, Math.round(cx), y, r, label, 4) + '\n';
    // Bench on storefront side
    svg += bench(Math.round(cx - 30), y + 33, 60, 12) + '\n';
    // Two chairs at 60° and 120° angles (north side)
    svg += chair(Math.round(cx - 26), y - 15) + '\n';
    svg += chair(Math.round(cx + 26), y - 15) + '\n';
  });

  svg += `    </g>\n\n`;
  return svg;
}

// Generate T Tables (3 small vertical tables)
function generateTTables() {
  const x = 620; // Inside vertical walkway on the right (East) side
  const r = 25;
  const positions = [ROW_POSITIONS.B, ROW_POSITIONS.C, ROW_POSITIONS.D]; // T1 at Row B, T2 at Row C, T3 at Row D

  let svg = `    <!-- T Tables - Small vertical tables along walkway -->\n`;
  svg += `    <g id="row-t-tables">\n`;

  positions.forEach((cy, i) => {
    const label = `T${i + 1}`;
    svg += roundTable(`t${i + 1}`, x, cy, r, label, 2) + '\n';
    // North chair
    svg += chair(x, cy - 33) + '\n';
    // South chair
    svg += chair(x, cy + 33) + '\n';
  });

  svg += `    </g>\n\n`;
  return svg;
}

// Generate indoor section
function generateIndoor() {
  const indoorY = Math.round(INDOOR_START);

  let svg = `  <!-- INDOOR SECTION -->\n`;
  svg += `  <g id="indoor-section">\n`;
  svg += `    <!-- Indoor background -->\n`;
  svg += `    <rect x="${STOREFRONT.left}" y="${indoorY}" width="${STOREFRONT.width}" height="400" fill="${COLORS.indoorBg}" stroke="none"/>\n`;
  svg += `    <rect x="${STOREFRONT.left}" y="${indoorY + 50}" width="${STOREFRONT.width}" height="300" fill="${COLORS.indoor}" stroke="none"/>\n\n`;

  svg += `    <!-- Window wall with door -->\n`;
  svg += `    <rect x="${STOREFRONT.left}" y="${indoorY}" width="${STOREFRONT.width}" height="50" fill="${COLORS.wall}" stroke="#666" stroke-width="2"/>\n`;
  svg += `    <rect x="${VERTICAL_WALKWAY.left}" y="${indoorY}" width="${VERTICAL_WALKWAY.width}" height="50" fill="${COLORS.door}" stroke="#333" stroke-width="2"/>\n`;
  svg += `    <text x="${VERTICAL_WALKWAY.center}" y="${indoorY + 30}" text-anchor="middle" font-family="Arial" font-size="12" fill="#333">Door</text>\n\n`;

  svg += `    <!-- Indoor title -->\n`;
  svg += `    <text x="${STOREFRONT.center}" y="${indoorY + 80}" text-anchor="middle" font-family="Arial" font-size="14" fill="${COLORS.bar}">Indoor Dining Area</text>\n\n`;

  // Table 1 - Left wall bench (vertical)
  const benchY = indoorY + 200;
  const benchTableY = indoorY + 220;
  svg += `    <!-- Table 1 - Left wall bench -->\n`;
  svg += `    <g id="table-1-group">\n`;
  svg += `      <rect x="${STOREFRONT.left}" y="${benchY}" width="20" height="100" fill="${COLORS.bench}" stroke="#5d4037" stroke-width="1"/>\n`;
  svg += `      <rect id="table-1" x="220" y="${benchTableY}" width="80" height="60" rx="5"\n`;
  svg += `            fill="${COLORS.tableIndoor}" stroke="#333" stroke-width="2"\n`;
  svg += `            data-number="1" data-capacity="4"/>\n`;
  svg += `      <text x="260" y="${benchTableY + 36}" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="${COLORS.tableText}">1</text>\n`;
  svg += `      <rect x="305" y="${benchTableY + 15}" width="15" height="20" fill="${COLORS.chairIndoor}" stroke="#666" stroke-width="1"/>\n`;
  svg += `      <rect x="305" y="${benchTableY + 45}" width="15" height="20" fill="${COLORS.chairIndoor}" stroke="#666" stroke-width="1"/>\n`;
  svg += `    </g>\n\n`;

  // Tables 2-3 - Square tables left of walkway (closer to storefront, more space between)
  const leftTableX = [330, 440];
  const tableY = indoorY + 80; // Offset from indoor start
  leftTableX.forEach((x, i) => {
    const num = i + 2;
    svg += `    <!-- Table ${num} - Square table -->\n`;
    svg += `    <g id="table-${num}-group">\n`;
    svg += `      <rect id="table-${num}" x="${x}" y="${tableY}" width="70" height="70" rx="5"\n`;
    svg += `            fill="${COLORS.tableIndoor}" stroke="#333" stroke-width="2"\n`;
    svg += `            data-number="${num}" data-capacity="4"/>\n`;
    svg += `      <text x="${x + 35}" y="${tableY + 42}" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="${COLORS.tableText}">${num}</text>\n`;
    // 4 chairs with proper spacing
    svg += `      <circle cx="${x + 35}" cy="${tableY - 20}" r="12" fill="${COLORS.chairIndoor}" stroke="#666" stroke-width="1"/>\n`; // North
    svg += `      <circle cx="${x + 35}" cy="${tableY + 90}" r="12" fill="${COLORS.chairIndoor}" stroke="#666" stroke-width="1"/>\n`; // South
    svg += `      <circle cx="${x - 15}" cy="${tableY + 35}" r="12" fill="${COLORS.chairIndoor}" stroke="#666" stroke-width="1"/>\n`; // West
    svg += `      <circle cx="${x + 85}" cy="${tableY + 35}" r="12" fill="${COLORS.chairIndoor}" stroke="#666" stroke-width="1"/>\n`; // East
    svg += `    </g>\n\n`;
  });

  // Tables 4-5 - Square tables right of walkway (closer to storefront, more space between)
  const rightTableX = [690, 800];
  rightTableX.forEach((x, i) => {
    const num = i + 4;
    svg += `    <!-- Table ${num} - Square table -->\n`;
    svg += `    <g id="table-${num}-group">\n`;
    svg += `      <rect id="table-${num}" x="${x}" y="${tableY}" width="70" height="70" rx="5"\n`;
    svg += `            fill="${COLORS.tableIndoor}" stroke="#333" stroke-width="2"\n`;
    svg += `            data-number="${num}" data-capacity="4"/>\n`;
    svg += `      <text x="${x + 35}" y="${tableY + 42}" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="${COLORS.tableText}">${num}</text>\n`;
    // 4 chairs with proper spacing
    svg += `      <circle cx="${x + 35}" cy="${tableY - 20}" r="12" fill="${COLORS.chairIndoor}" stroke="#666" stroke-width="1"/>\n`;
    svg += `      <circle cx="${x + 35}" cy="${tableY + 90}" r="12" fill="${COLORS.chairIndoor}" stroke="#666" stroke-width="1"/>\n`;
    svg += `      <circle cx="${x - 15}" cy="${tableY + 35}" r="12" fill="${COLORS.chairIndoor}" stroke="#666" stroke-width="1"/>\n`;
    svg += `      <circle cx="${x + 85}" cy="${tableY + 35}" r="12" fill="${COLORS.chairIndoor}" stroke="#666" stroke-width="1"/>\n`;
    svg += `    </g>\n\n`;
  });

  // Table 6 - Right wall bench (vertical)
  svg += `    <!-- Table 6 - Right wall bench -->\n`;
  svg += `    <g id="table-6-group">\n`;
  svg += `      <rect x="${STOREFRONT.right - 20}" y="${benchY}" width="20" height="100" fill="${COLORS.bench}" stroke="#5d4037" stroke-width="1"/>\n`;
  svg += `      <rect id="table-6" x="900" y="${benchTableY}" width="80" height="60" rx="5"\n`;
  svg += `            fill="${COLORS.tableIndoor}" stroke="#333" stroke-width="2"\n`;
  svg += `            data-number="6" data-capacity="4"/>\n`;
  svg += `      <text x="940" y="${benchTableY + 36}" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="${COLORS.tableText}">6</text>\n`;
  svg += `      <rect x="875" y="${benchTableY + 15}" width="15" height="20" fill="${COLORS.chairIndoor}" stroke="#666" stroke-width="1"/>\n`;
  svg += `      <rect x="875" y="${benchTableY + 45}" width="15" height="20" fill="${COLORS.chairIndoor}" stroke="#666" stroke-width="1"/>\n`;
  svg += `    </g>\n\n`;

  // Bar area
  const barY = indoorY + 350;
  svg += `    <!-- Bar area -->\n`;
  svg += `    <rect x="${STOREFRONT.left}" y="${barY}" width="${STOREFRONT.width}" height="50" fill="${COLORS.wall}" stroke="none"/>\n`;
  svg += `    <rect x="${STOREFRONT.left + 100}" y="${barY + 10}" width="${STOREFRONT.width - 200}" height="30" rx="10"\n`;
  svg += `          fill="${COLORS.bar}" stroke="#5d4037" stroke-width="2"/>\n`;
  svg += `    <text x="${STOREFRONT.center}" y="${barY + 30}" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="#fff">Bar</text>\n`;

  svg += `  </g>\n`;
  return svg;
}

// Generate complete SVG
function generateCompleteSVG() {
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 1200 1000" xmlns="http://www.w3.org/2000/svg">
  <!-- Restaurant Floor Plan - Outdoor and Indoor Sections -->

  <!-- OUTDOOR SECTION -->
  <g id="outdoor-section">
    <!-- Outdoor background -->
    <rect x="${OUTDOOR_FULL.left}" y="0" width="${OUTDOOR_FULL.width}" height="${OUTDOOR_FULL.height}" fill="${COLORS.patio}" stroke="none"/>

    <!-- Vertical walkway -->
    <rect x="${VERTICAL_WALKWAY.left}" y="0" width="${VERTICAL_WALKWAY.width}" height="${OUTDOOR_FULL.height}" fill="${COLORS.walkway}" stroke="none"/>

    <!-- Horizontal walkway -->
    <rect x="${OUTDOOR_FULL.left}" y="${HORIZONTAL_WALKWAY.top}" width="${OUTDOOR_FULL.width}" height="${HORIZONTAL_WALKWAY.height}" fill="${COLORS.walkway}" stroke="none"/>

    <!-- Outdoor title -->
    <text x="${OUTDOOR_FULL.center}" y="30" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="#4caf50">Outdoor Patio Area</text>

`;

  svg += generateGrassAreas();
  svg += generateRowD();
  svg += generateRowC();
  svg += generateRowB();
  svg += generateRowA();
  svg += generateTTables();

  svg += `  </g>\n\n`;
  svg += generateIndoor();
  svg += `</svg>`;

  return svg;
}

// Main execution
const fs = require('fs');
const svgContent = generateCompleteSVG();
fs.writeFileSync('public/data/seatmap/main-floor.svg', svgContent);
console.log('✅ Generated new seatmap SVG');
console.log('📊 Layout summary:');
console.log('   - Row D: 8 tables (D1-D8) with diagonal chairs');
console.log('   - Row C: 8 tables (C1-C8) with diagonal chairs');
console.log('   - Row B: 8 tables (B1-B8) with benches');
console.log('   - Row A: 6 tables (A1-A6) with benches + angled chairs');
console.log('   - T Tables: 3 tables (T1-T3) with vertical chairs');
console.log('   - Indoor: 6 tables (1-6) clockwise from left wall');
