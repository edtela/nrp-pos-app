# Seatmap Generation System

A structured TypeScript system for generating restaurant floor plan SVGs from JSON configuration files.

## Overview

This system provides a clean, maintainable architecture for generating seatmap SVGs with:
- **Data/Code Separation**: Floor plans defined in JSON, not hardcoded
- **Type Safety**: Full TypeScript support with interfaces
- **Reusability**: Shared components and presets across multiple floor plans
- **Maintainability**: Clear separation of concerns with dedicated modules

## Quick Start

### Generate Seatmap
```bash
npm run generate:seatmap
```

### Custom Configuration
```bash
npx tsx scripts/seatmap/generate.ts path/to/config.json path/to/output.svg
```

## Architecture

```
scripts/seatmap/
├── types.ts                    # TypeScript type definitions
├── core/
│   ├── svg-element.ts         # Base SVG elements (Circle, Rect, Text, Group)
│   ├── table.ts               # Table classes (Round, Rectangular, Square)
│   ├── seating.ts             # Chair & Bench classes
│   └── svg-renderer.ts        # SVG rendering utilities & color theme
├── layout/
│   ├── seating-presets.ts     # Named seating arrangements
│   ├── floor-plan.ts          # FloorPlan class - main coordinator
│   ├── spacing.ts             # Spacing/positioning utilities
│   └── areas.ts               # Background areas (grass, walkways)
├── data/
│   └── main-floor.json        # Floor plan configuration
└── generate.ts                # Main entry point
```

## Key Concepts

### 1. Tables

Tables are defined with:
- **Shape**: `round`, `rectangular`, or `square`
- **Position**: x,y coordinates
- **Dimensions**: radius (round) or width/height (rectangular/square)
- **Seating Preset**: Named arrangement of chairs/benches

Example:
```json
{
  "shape": "round",
  "id": "d1",
  "position": { "x": 136, "y": 100 },
  "radius": 30,
  "capacity": 4,
  "label": "D1",
  "seatingPreset": "diagonal-4"
}
```

### 2. Seating Presets

Named arrangements that automatically position chairs/benches around tables:

| Preset | Description | Use Case |
|--------|-------------|----------|
| `diagonal-4` | 4 chairs at 45° intervals | Rows C, D |
| `cardinal-4` | 4 chairs N/E/S/W | General purpose |
| `bench-south-chairs-60-120` | Bench south + 2 angled chairs | Row A |
| `bench-horizontal-2` | 2 horizontal benches N/S | Row B |
| `chairs-vertical-2` | 2 chairs N/S | T tables |
| `square-cardinal-4` | 4 chairs for square tables | Indoor square tables |
| `bench-wall-chairs-2` | Wall bench + 2 opposite chairs | Indoor tables 1, 6 |

### 3. Floor Plan Configuration

JSON structure:
```json
{
  "id": "main-floor",
  "name": "Main Floor",
  "dimensions": { "width": 1200, "height": 1000 },
  "padding": { "small": 10, "standard": 20, "top": 40 },
  "areas": [
    { "type": "patio", "bounds": { ... } },
    { "type": "grass", "bounds": { ... } }
  ],
  "rows": [
    { "id": "D", "y": 100, "tables": [...] }
  ],
  "indoor": {
    "startY": 560,
    "tables": [...]
  }
}
```

## Creating a New Floor Plan

1. **Create JSON configuration**:
   ```bash
   cp scripts/seatmap/data/main-floor.json scripts/seatmap/data/new-floor.json
   ```

2. **Edit configuration**:
   - Update dimensions, areas, and walkways
   - Define tables with positions and presets
   - Configure indoor section if needed

3. **Generate SVG**:
   ```bash
   npx tsx scripts/seatmap/generate.ts data/new-floor.json ../../public/data/seatmap/new-floor.svg
   ```

## Creating Custom Seating Presets

Define a new preset in `layout/seating-presets.ts`:

```typescript
const myPreset: SeatingPreset = {
  name: 'my-preset',
  description: 'Description of arrangement',
  calculate: (config: AnyTableConfig): SeatingConfig[] => {
    const center = config.position;
    return [
      {
        type: 'chair',
        position: { x: center.x, y: center.y - 40 }
      },
      // ... more seats
    ];
  }
};

// Register it
presetRegistry.set(myPreset.name, myPreset);
```

## Extending the System

### Adding New Table Shapes

1. Define interface in `types.ts`:
```typescript
export interface HexagonTableConfig extends TableConfig {
  shape: 'hexagon';
  size: number;
}
```

2. Implement class in `core/table.ts`:
```typescript
export class HexagonTable extends Table {
  protected createTableShape(context: RenderContext): BaseSVGElement {
    // Implementation
  }
}
```

3. Update `createTable()` factory function

### Adding New Seating Types

1. Define interface in `types.ts`
2. Implement class in `core/seating.ts`
3. Update `createSeating()` factory function

## Color Theme

Colors are defined in `core/svg-renderer.ts` as `DEFAULT_COLORS`:

```typescript
{
  patio: '#e8f5e9',
  grass: '#7cb342',
  walkway: '#d0d0d0',
  tableOutdoor: '#d7ccc8',    // Light brown
  tableIndoor: '#d7ccc8',
  chairOutdoor: '#a1887f',    // Darker brown
  chairIndoor: '#a1887f',
  // ... more colors
}
```

Modify these to change the color scheme.

## Benefits Over Previous System

✅ **Maintainable**: Clear structure, easy to find and modify code
✅ **Type Safe**: Catch errors at compile time
✅ **Reusable**: Share components across multiple floor plans
✅ **Flexible**: Easy to add new table types, seating patterns
✅ **Data-Driven**: Change layout by editing JSON, not code
✅ **Testable**: Classes can be unit tested independently
✅ **Scalable**: Handles multiple restaurants/floors easily

## Migration from Old System

The old procedural script (`generate-seatmap.cjs`) has been kept for reference at:
`scripts/generate-seatmap.cjs`

Key improvements:
- Replaced string concatenation with class-based rendering
- Extracted seating logic into reusable presets
- Separated layout data into JSON configuration
- Added TypeScript type checking
- Improved code organization and documentation

## Future Enhancements

Potential additions:
- [ ] Interactive visual editor
- [ ] Validation of table positions (overlap detection)
- [ ] Automatic spacing optimization
- [ ] Multiple floor plan support in single file
- [ ] Export to other formats (PDF, PNG)
- [ ] Responsive sizing calculations
- [ ] Animation/transition support
