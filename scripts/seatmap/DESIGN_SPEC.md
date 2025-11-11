# Seatmap System Design Specification (Draft)
**Date:** 2025-11-10 (Updated)
**Status:** Design Discussion - Parallel Implementation

---

## Overview

This specification documents the design for a new seatmap system based on **component architecture** with **attribute-driven configuration** and **two-phase layout protocol**. This will be a parallel implementation alongside the current system.

---

## Component Architecture

### Component Concept

All elements are **components** (tables, containers, areas). Each component:
1. Has configuration settings specific to its type
2. Implements a layout protocol:
   - **Query phase**: Reports preferred dimensions
   - **Layout phase**: Renders within given dimensions

### Component Types

- **Table Component**: Renders a table with seats
- **Container Component**: Arranges child components using layout algorithms
- **Area Component**: Background/visual element

---

## Layout Protocol

### Two-Phase System

All components implement a standardized layout protocol with two phases:

**Phase 1: Query preferred dimensions**
```typescript
component.getPreferredSize(): {width?: number, height?: number}
```
- Component calculates its ideal size based on configuration
- Returns dimensions in **absolute pixels**
- `undefined` means "auto" - calculate from content or fill available space
- Example: `{width: 60, height: 60}` for 8-person table (when 1s = 30px)

**Phase 2: Render with actual dimensions**
```typescript
component.render(dimensions: {width: number, height: number}): SVGElement
```
- Container provides final dimensions in **absolute pixels**
- Component renders itself within those bounds
- Both width and height are always concrete numbers (no undefined)

### Flow Example

```typescript
// 1. Container queries children
const childSize = tableComponent.getPreferredSize();  // {width: 60, height: 60}

// 2. Container calculates layout
const totalWidth = childSizes.reduce((sum, s) => sum + (s.width ?? 0), 0);

// 3. Container renders children
tableComponent.render({width: 60, height: 60});
```

---

## Unit Conversion Boundary

### Configuration Layer vs Implementation Layer

The system maintains a clean separation between user-facing configuration and internal implementation:

**Configuration Layer (User-facing JSON):**
- Uses **relative units**: `"2s"`, `"0.5s"`, `"10s"`
- Allows **absolute overrides**: `"100px"`, `"30px"`
- Uses **undefined** (omitted fields) for auto-sizing

```json
{
  "gap": "2s",
  "width": "10s"
  // height omitted = auto (undefined)
}
```

**Implementation Layer (Internal code):**
- Uses **absolute pixels only**: All numbers, no strings
- All layout protocol methods work with concrete dimensions
- No unit parsing during calculations

```typescript
interface PreferredSize {
  width?: number;   // pixels or undefined
  height?: number;  // pixels or undefined
}
```

### Conversion Point

Unit conversion happens **once at configuration load time**:

```typescript
// Loading configuration
const config = {gap: "2s", width: "10s"};

// Parse units immediately
const resolved = {
  gap: parseUnit("2s", baseUnit),     // → 60 (if 1s = 30px)
  width: parseUnit("10s", baseUnit),  // → 300
  height: undefined                    // → undefined (auto)
};

// All subsequent operations use resolved numbers
const preferred = component.getPreferredSize();  // {width: 300, height?: undefined}
```

### Benefits

- **Single conversion point**: Parse strings once, work with numbers everywhere
- **Performance**: No repeated string parsing during layout
- **Type safety**: Numbers are unambiguous, no runtime unit errors
- **Clean interfaces**: Layout algorithms work with concrete values
- **Clear boundary**: Strings at config edge, numbers everywhere else

---

## Table Component

### Core Attributes

Tables defined by fundamental attributes rather than classes:

- **shape**: `"round"` | `"rectangle"` (squares are rectangles with aspectRatio = 1.0)
- **capacity**: Determines table SIZE via perimeter formula (perimeter = capacity × 1s)
- **seatCount** (optional): Number of people to seat (defaults to capacity if omitted)
- **aspectRatio**: Ratio of width/height (x/y convention)
  - `1.0` = square or circle
  - `< 1.0` = taller than wide
  - `> 1.0` = wider than tall
  - Rounds can have aspectRatio ≠ 1.0 (ovals/ellipses)

### Seating Configuration

- **startingPosition**: Where seat #1 is located
  - Accepts compass directions: `"N"`, `"NE"`, `"E"`, `"SE"`, `"S"`, `"SW"`, `"W"`, `"NW"`
  - Also accepts numeric degrees (utility converts compass → degrees)

- **seatDirection**: `"clockwise"` | `"counter-clockwise"`
  - Can have defaults at section/site level

- **seats** (optional): Array of custom seat definitions
  ```json
  "seats": [
    {"position": "N", "seatCount": 3},  // Bench for 3 people on north side
    {"position": "S", "seatCount": 3}   // Bench for 3 people on south side
  ]
  ```
  - Each seat has:
    - `position`: Compass direction or degrees
    - `seatCount`: Number of people (default 1). seatCount = 1 → chair, seatCount > 1 → bench
  - Custom seats placed first, remaining seatCount auto-distributed as individual chairs
  - Seat numbering traverses all seats, consuming multiple numbers for benches

### Size Calculation

**Perimeter-based formula:**
- `perimeter = capacity × 1s` (where `1s` = one seat unit)
- For rectangles: solve for width and height using aspectRatio constraint
- For rounds: calculate bounding rectangle, then convert to ellipse radii

**Examples:**
- 4-person square (aspectRatio = 1.0): `1s × 1s`
- 8-person square (aspectRatio = 1.0): `2s × 2s`
- 8-person rectangle (aspectRatio = 2.0): `8s/3 × 4s/3`

**Rectangle formula:**
```
Given: capacity, aspectRatio (ar = w/h)
perimeter = capacity × 1s
2w + 2h = perimeter
w = ar × h

Solve:
  2(ar × h) + 2h = perimeter
  h(2ar + 2) = perimeter
  h = perimeter / (2ar + 2)
  w = perimeter × ar / (2ar + 2)
```

**Round/Ellipse formula:**
```
Calculate bounding rectangle using above
rx = width / 2
ry = height / 2
(When ar = 1.0 → rx = ry → perfect circle)
```

### Seat Placement

**Distribution Logic:**
1. Start with table's `seatCount` (defaults to `capacity` if not specified)
2. Place custom seats from `seats` array, subtracting each seat's `seatCount` from total
3. Remaining count = individual chairs to auto-distribute

**Formula:**
```
remainingChairs = table.seatCount - sum(seat.seatCount for seat in table.seats)
```

**Placement Algorithm:**
1. Place custom seats from `seats` array at their specified positions
2. Auto-distribute remaining individual chairs (`seatCount: 1` each):
   - **Rounds**: Evenly around circumference from startingPosition
   - **Rectangles**: Smart distribution by side length
     - Only cardinal positions: 0°, 90°, 180°, 270° (N, E, S, W)
     - NO corner placement
     - Distribution proportional to side lengths

**Examples:**
- Table with `capacity: 6, seatCount: 6, seats: [{position: "S", seatCount: 2}]`
  - Remaining: 6 - 2 = 4 individual chairs to distribute
- Table with `capacity: 6, seatCount: 4` (wall table, fewer seats than size)
  - 4 individual chairs to distribute on a 6-person-sized table

**Details to be worked out:**
- Exact rectangle distribution algorithm
- Handling startingPosition landing on a bench vs chair

---

## Container Component

### Anchor-Based Positioning

**Dual anchor concept:**
- **Container anchor**: Reference point for positioning children (e.g., `"center"` at walkway intersection)
- **Child anchor**: Which point of the child aligns to the position (e.g., `"bottom-right"`)
- **Offset**: Distance from container's anchor to child's anchor

**Anchor position values (9 positions):**

*Edges (4):*
- `"top"` - top edge center
- `"bottom"` - bottom edge center
- `"left"` - left edge center
- `"right"` - right edge center

*Corners (4):*
- `"top-left"`, `"top-right"`
- `"bottom-left"`, `"bottom-right"`

*Center (1):*
- `"center"` - center point

**Undefined anchor behavior:**
- Not a synonym for "center"
- Context-dependent defaults:
  - Root container: defaults to `"center"`
  - Children in manual layout: inherits parent's anchor
  - Children in auto-layout: not used (positioned by layout algorithm)

**Positioning formula:**
```
Child's anchor point position = Container's anchor point + Offset
```

**Example:**
```json
{
  "anchor": "bottom-right",
  "offset": {"x": "-38s", "y": "-38s"}
}
```
→ Child's bottom-right corner is 38s left and 38s up from parent's anchor

**Offset behavior:**
- Missing offset defaults to `{x: 0, y: 0}` (absolute positioning)
- No automatic collision avoidance - manual calculation required
- Future: `position` property may enable relative positioning modes

### Container Size Calculation for Manual Positioning

When a container uses manual positioning (no `layout` or `layout: null`) and doesn't have explicit width/height, it calculates its size from children's extents. The calculation depends on the container's anchor position.

#### Step 1: Calculate Child Edges

For each child, calculate its left/right and top/bottom edges relative to the container's anchor point (at origin 0,0):

**X axis (width calculation):**
```
if childAnchor includes "left":
  childLeft = offset.x
  childRight = offset.x + childWidth
else if childAnchor includes "right":
  childLeft = offset.x - childWidth
  childRight = offset.x
else: // center, top, bottom
  childLeft = offset.x - childWidth/2
  childRight = offset.x + childWidth/2
```

**Y axis (height calculation):**
```
if childAnchor includes "top":
  childTop = offset.y
  childBottom = offset.y + childHeight
else if childAnchor includes "bottom":
  childTop = offset.y - childHeight
  childBottom = offset.y
else: // center, left, right
  childTop = offset.y - childHeight/2
  childBottom = offset.y + childHeight/2
```

#### Step 2: Calculate Container Size from Container Anchor

The container anchor determines whether the container extends symmetrically or in one direction:

**Width calculation:**
- **Centered horizontally** (`center`, `top`, `bottom`):
  - Container extends symmetrically left and right
  - `width = 2 × max(abs(childLeft), abs(childRight))` for all children

- **Left-anchored** (`left`, `top-left`, `bottom-left`):
  - Container extends rightward only
  - `width = max(childRight)` for all children

- **Right-anchored** (`right`, `top-right`, `bottom-right`):
  - Container extends leftward only
  - `width = max(abs(childLeft))` for all children

**Height calculation:**
- **Centered vertically** (`center`, `left`, `right`):
  - Container extends symmetrically up and down
  - `height = 2 × max(abs(childTop), abs(childBottom))` for all children

- **Top-anchored** (`top`, `top-left`, `top-right`):
  - Container extends downward only
  - `height = max(childBottom)` for all children

- **Bottom-anchored** (`bottom`, `bottom-left`, `bottom-right`):
  - Container extends upward only
  - `height = max(abs(childTop))` for all children

#### Example

**Container with `anchor: "center"`:**
```json
{
  "anchor": "center",
  "children": [
    {
      "anchor": "bottom-right",
      "offset": {"x": -32, "y": 0},
      "width": 192,  // BL row
      "height": 16
    }
  ]
}
```

**Child edge calculation:**
- Child anchor "bottom-right" → right edge at offset.x
- `childLeft = -32 - 192 = -224`
- `childRight = -32`

**Container width calculation:**
- Container anchor "center" → centered horizontally
- `width = 2 × max(abs(-224), abs(-32)) = 2 × 224 = 448`

This ensures the container extends equally in both directions from its center anchor.

**Container with `anchor: "bottom"`:**
```json
{
  "anchor": "bottom",
  "children": [
    {
      "anchor": "bottom-right",
      "offset": {"x": -32, "y": 0},
      "width": 192,
      "height": 52  // column of tables
    }
  ]
}
```

**Child edge calculation:**
- Child anchor "bottom-right" → bottom edge at offset.y
- `childTop = 0 - 52 = -52`
- `childBottom = 0`

**Container height calculation:**
- Container anchor "bottom" → extends upward only
- `height = max(abs(-52)) = 52`

This ensures the container extends only upward from its bottom anchor.

### Symmetry & Bounds

- Center-based anchoring creates natural symmetry through the size calculation
- Edge-based anchoring creates single-direction extent
- Bounds calculated from content extent (not predefined)
- All coordinates relative to container's anchor point
- Optional post-processing to crop unused symmetric space

### Container/Section Structure

```json
{
  "type": "section",
  "anchor": "center",              // Positioning reference

  // Auto-layout (optional)
  "layout": "row",                 // "row" | "column" | null (manual)
  "spacing": "start",              // "start" | "even" | "center" | "end" (default: "start")
  "alignment": "start",            // "start" | "center" | "end" (default: "start")
  "gap": "2s",                     // Space between items
  "padding": "1s",                 // Space inside container edges (around all children)

  // Visual properties
  "background": "gray",
  // width omitted (undefined) = auto-size from content
  "height": "76s",

  // Default attributes for child tables (inheritable)
  "shape": "round",
  "capacity": 4,
  "startingPosition": "N",

  "children": [...]
}
```

### Anchor-Layout Interaction

**Anchor determines layout flow direction and interpretation of spacing/alignment:**

The anchor point controls:
1. **Origin point** for layout
2. **Flow direction** for primary axis
3. **Meaning of "start/end"** for both spacing and alignment

**Row Layout with different anchors:**
- `anchor: "left"` or `"top-left"` or `"bottom-left"` → flows **left to right**
- `anchor: "right"` or `"top-right"` or `"bottom-right"` → flows **right to left**
- `anchor: "center"` or `"top"` or `"bottom"` → flows from center outward

**Column Layout with different anchors:**
- `anchor: "top"` or `"top-left"` or `"top-right"` → flows **top to bottom**
- `anchor: "bottom"` or `"bottom-left"` or `"bottom-right"` → flows **bottom to top**
- `anchor: "center"` or `"left"` or `"right"` → flows from center outward

**Spacing values relative to anchor:**
- `"start"` → toward anchor (packed near anchor point) **[DEFAULT]**
- `"end"` → away from anchor (packed far from anchor point)
- `"center"` → centered between bounds
- `"even"` → evenly distributed (works same in both directions)

**Alignment values relative to anchor:**
- `"start"` → aligned to anchor's perpendicular component **[DEFAULT]**
- `"center"` → centered on cross axis
- `"end"` → aligned opposite to anchor
- Example: `anchor: "bottom-right"` with `layout: "row"` → alignment "start" = bottom

**Example: `anchor: "bottom-right"` with `layout: "row"`**
```
Flow direction: right to left
Alignment "start": bottom

spacing: "start" (packed right):
           [t3][t2][t1]•  ← • = anchor

spacing: "end" (packed left):
[t1][t2][t3]           •

spacing: "even":
[t1]    [t2]    [t3]   •

alignment: "start" (bottom):
[t1][t2][t3]
───────────•  ← all aligned to bottom
```

### Layout Algorithms

**Row Layout** (`layout: "row"`):
- Horizontal arrangement along primary axis
- Flow direction determined by anchor's horizontal component
- Spacing controls distribution along primary axis (anchor-relative)
- Alignment controls positioning along cross axis (anchor-relative)
- Section bounds calculated from children + gap

**Column Layout** (`layout: "column"`):
- Vertical arrangement along primary axis
- Flow direction determined by anchor's vertical component
- Spacing controls distribution along primary axis (anchor-relative)
- Alignment controls positioning along cross axis (anchor-relative)

**Manual Positioning** (no layout or `layout: null`):
- Each child has explicit anchor + offset
- No automatic arrangement

**Section mode:**
- Section is either auto-layout OR manual (no mixing within one section)

### Gap vs Padding

**Gap** - Space **between** children:
- Creates separation between adjacent items
- `n` children → `n-1` gaps
- Only applies in auto-layout (row/column)
- Does not affect container size calculation
- Example: `gap: "1s"` with 4 children → 3 gaps total

**Padding** - Space **inside** container edges:
- Creates margin around all children
- Applies to all edges uniformly
- Works with all layout modes (row/column/manual)
- **Additive to content size**: content (100×100) + padding (10) → container (120×120)
- Formula: `containerSize = contentSize + 2 × padding` (per axis)

**Combined example:**
```json
{
  "layout": "row",
  "gap": "1s",      // Space between children
  "padding": "2s"   // Space around all children
}
```
```
┌────────────────────────────────┐
│padding                         │← 2s padding
│  ┌───┐gap┌───┐gap┌───┐        │
│  │ T1│ 1s│ T2│ 1s│ T3│        │
│  └───┘   └───┘   └───┘        │
│                                │
└────────────────────────────────┘
```

**Padding implementation:**
1. **Size calculation**: Padding is added to content dimensions
   - Row: `width = childrenWidth + gaps + 2×padding`, `height = maxChildHeight + 2×padding`
   - Column: `width = maxChildWidth + 2×padding`, `height = childrenHeight + gaps + 2×padding`
   - Manual: `width = extentWidth + 2×padding`, `height = extentHeight + 2×padding`

2. **Layout calculation**: Children are positioned within padded inner rectangle
   - Container at (x, y) with size (width, height)
   - Inner content area: (x + padding, y + padding) with size (width - 2×padding, height - 2×padding)
   - All child positioning happens within this inner area

### Defaults and Templates System

**Instead of inheritance, use composition with defaults and templates:**

Two separate concepts defined at the top level (root container):

#### 1. Defaults - Type-based default properties

Properties that apply to all components of a given type:

```json
{
  "defaults": {
    "table": {
      "startingPosition": "N",
      "seatDirection": "clockwise",
      "aspectRatio": 1.0
    },
    "container": {
      "spacing": "even",
      "alignment": "center"
    }
  }
}
```

#### 2. Templates - Named, reusable patterns

Specific component configurations that can be referenced:

```json
{
  "templates": {
    "table-4-round": {
      "type": "table",
      "shape": "round",
      "capacity": 4
    },
    "table-bench": {
      "type": "table",
      "shape": "round",
      "capacity": 6,
      "seatCount": 6,
      "seats": [{"position": "S", "seatCount": 2}]
    },
    "row-section": {
      "type": "container",
      "layout": "row",
      "spacing": "even"
    }
  }
}
```

**Important:** Templates cannot use `use` property (no template composition to avoid circular references)

#### Property Resolution Order

When creating a component instance:

1. **Type defaults** (`defaults[type]`) - base defaults for the type
2. **Template** (`templates[templateName]`) - if `use` specified
3. **Instance properties** - explicit properties on the instance

Later properties override earlier ones.

**Example:**
```json
{
  "defaults": {
    "table": {"startingPosition": "N", "aspectRatio": 1.0}
  },
  "templates": {
    "table-4-round": {"type": "table", "shape": "round", "capacity": 4}
  },
  "children": [
    {
      "type": "table",
      "use": "table-4-round",
      "id": "t1",
      "capacity": 6  // Instance override
    }
  ]
}
```

**Result:** Table gets:
- `startingPosition: "N"`, `aspectRatio: 1.0` (from defaults)
- `shape: "round"` (from template)
- `capacity: 6` (from instance - overrides template's 4)

#### Scope

**For initial implementation:**
- Both `defaults` and `templates` are defined **only at top level** (root container)
- Both are optional
- Keeps implementation simple

**Future extension:**
- Could be extended to allow defaults/templates at nested container levels
- Would enable template overrides and variants down the hierarchy
- Note for future consideration

### Layout Hierarchy Inheritance

**Only `anchor` inherits through layout hierarchy:**
- Children inherit parent's anchor unless explicitly specified
- Other layout properties (layout, spacing, alignment) do NOT inherit
- Each container controls its own layout mode

**Note:** Future discussion needed on pros/cons of inheriting other layout properties (spacing, alignment, gap, etc.)

---

## Units System

### Seat-Relative Units

- Base unit: `1s` = one seat size = 30px (configurable)
- Similar to CSS `em` units
- All dimensions can use `s` units: `"2s"`, `"0.5s"`, `"10s"`
- Allows absolute `px` for overrides when needed
- Omit field (undefined) for auto-sizing from content
- Makes entire layout scalable

**Benefits:**
- Consistent proportions
- Easy reasoning ("walkway is 2 seats wide")
- Scale entire layout by adjusting base seat size

---

## Z-Order & Rendering

- Definition order in children array determines z-order
- First defined = bottom layer
- Auto-extending elements (width/height undefined) span to cover content

---

## Area Types

- Metadata for styling: `"patio"`, `"grass"`, `"walkway"`, `"indoor"`
- Maps to visualization (colors, patterns)
- Separate from layout logic

---

## Example Configuration

### Complete Floor Plan with Anchor-Based Layout

This example demonstrates anchor inheritance, manual positioning, auto-layout, and anchor-layout interaction:

```json
{
  "anchor": "center",  // Root container centered at walkway intersection
  "children": [
    {
      "name": "horizontal sidewalk",
      "type": "area",
      "background": "gray",
      "height": "2s"
      // width omitted = auto-extends horizontally
      // anchor inherited = "center"
      // offset omitted = {0, 0} → positioned at center
    },
    {
      "name": "Top",
      "anchor": "bottom",  // Top section anchored at its bottom edge
      "offset": {"y": "1s"},  // Bottom edge 1s above center
      "children": [
        {
          "name": "vertical sidewalk",
          "type": "area",
          "background": "gray",
          "width": "2s",
          "anchor": "bottom"  // Inherited from Top, then explicit
          // height omitted = auto-extends upward from Top's bottom
          // offset omitted = {0, 0} → bottom aligns with Top's bottom
        },
        {
          "name": "Top Left",
          "anchor": "bottom-right",  // Positioned by bottom-right corner
          "offset": {"x": "-1s"},  // 1s left of center (sidewalk edge)
          "layout": "column",  // Auto-layout children vertically
          "children": [
            {
              "name": "Row B Left",
              "layout": "row",  // Nested auto-layout
              "anchor": "bottom-right",  // Flows right-to-left from bottom-right
              "children": [
                {"id": "b4"}, {"id": "b3"}, {"id": "b2"}, {"id": "b1"}
                // Tables flow right-to-left due to anchor
              ]
            },
            {"name": "Grass Left", "type": "area"}
          ]
        },
        {
          "name": "Top Right",
          "anchor": "bottom-left",
          "offset": {"x": "1s"},  // 1s right of center
          "layout": "column",
          "children": [
            {
              "name": "Row B Right",
              "layout": "row",
              "anchor": "bottom-left",  // Flows left-to-right from bottom-left
              "children": [
                {"id": "b5"}, {"id": "b6"}, {"id": "b7"}, {"id": "b8"}
              ]
            },
            {"name": "Grass Right", "type": "area"}
          ]
        }
      ]
    },
    {
      "name": "Bottom",
      "anchor": "top",
      "offset": {"y": "-1s"}  // Top edge 1s below center
    }
  ]
}
```

**Visual result:**
```
    [Grass Left]  ║  [Grass Right]
    [b4][b3][b2][b1]║[b5][b6][b7][b8]
                  ║
    ──────────────╬────────────────  ← Top's bottom (1s above center)
                  ║
    ══════════════╬════════════════  ← horizontal sidewalk (at center)

    ──────────────────────────────  ← Bottom's top (1s below center)
           [Bottom area]
```

**Key features demonstrated:**
- Anchor inheritance (children inherit parent anchor unless specified)
- Manual positioning with explicit offsets
- Auto-layout (row/column) with anchor-based flow direction
- Auto-extending areas (sidewalks span content)
- Nested containers with independent layout modes

### Row Example with Defaults and Templates

Simple row layout showing defaults and templates working together:

```json
{
  "defaults": {
    "table": {
      "startingPosition": "N",
      "seatDirection": "clockwise",
      "aspectRatio": 1.0
    }
  },
  "templates": {
    "table-4-round": {
      "type": "table",
      "shape": "round",
      "capacity": 4
    }
  },
  "children": [
    {
      "type": "container",
      "layout": "row",
      "spacing": "even",
      "alignment": "center",
      "children": [
        {"type": "table", "use": "table-4-round", "id": "d1", "label": "D1"},
        {"type": "table", "use": "table-4-round", "id": "d2", "label": "D2"},
        {"type": "table", "use": "table-4-round", "id": "d3", "label": "D3"},
        {"type": "table", "use": "table-4-round", "id": "d4", "label": "D4"},
        {"type": "table", "use": "table-4-round", "id": "d5", "capacity": 6, "label": "D5"}
        // D5 overrides capacity from template
      ]
    }
  ]
}
```

**Each table gets:**
- From defaults: `startingPosition: "N"`, `seatDirection: "clockwise"`, `aspectRatio: 1.0`
- From template: `shape: "round"`, `capacity: 4`
- D5 overrides: `capacity: 6`

**Note:** Flow direction depends on the section's anchor (inherited or explicit). If the parent container has `anchor: "left"`, this row flows left-to-right. If `anchor: "right"`, it flows right-to-left.

### Table with Benches Using Templates

```json
{
  "templates": {
    "table-with-bench": {
      "type": "table",
      "shape": "round",
      "capacity": 4,
      "seatCount": 4,
      "aspectRatio": 1.0,
      "startingPosition": "N",
      "seats": [
        {"position": "S", "seatCount": 2}  // Bench on south side
      ]
      // Remaining: 4 - 2 = 2 chairs auto-distributed
    }
  },
  "children": [
    {"type": "table", "use": "table-with-bench", "id": "a1", "label": "A1"},
    {"type": "table", "use": "table-with-bench", "id": "a2", "label": "A2"}
  ]
}
```

**Additional Examples:**

Wall table (fewer seats than table size):
```json
{
  "type": "table",
  "shape": "rectangle",
  "capacity": 6,
  "seatCount": 4,
  "aspectRatio": 1.5,
  "seats": [
    {"position": "N", "seatCount": 2},
    {"position": "S", "seatCount": 2}
  ]
  // All 4 seats explicitly defined, 0 chairs to auto-distribute
}
```

---

## Open Questions / To Be Discussed

- Exact algorithm for rectangle seat distribution
- How startingPosition interacts with benches
- Additional layout modes (flow, grid) if needed
- Business logic attributes for sections (server zones, etc.)
- Migration strategy from current system
- Configuration schema validation
- Rendering optimizations
- Default values and required vs optional attributes
- Error handling for invalid configurations

---

## Key Design Decisions

### Naming Conventions
✅ camelCase for all property names (TypeScript/JavaScript convention)
✅ `aspectRatio`, `startingPosition`, `seatDirection` (not snake_case)

### Component Architecture
✅ Component-based system (tables, containers, areas)
✅ Two-phase layout protocol (query preferred size, then render)
✅ Attribute-based tables (not class hierarchy)

### Sizing & Units
✅ Perimeter-based sizing formula (perimeter = capacity × 1s)
✅ Seat-relative units (`s`) in configuration
✅ Absolute pixels (numbers) in implementation
✅ Single conversion point (config load time)
✅ aspectRatio = width/height (x/y)
✅ undefined fields for auto-sizing

### Positioning & Layout
✅ Dual anchor system (container anchor + child anchor + offset)
✅ Simplified anchor naming (9 positions: top, bottom, left, right, corners, center)
✅ Anchor determines layout flow direction and "start/end" meaning
✅ All 9 anchor types supported for container size calculation
✅ Container size calculation respects anchor symmetry (centered vs edge-anchored)
✅ Missing offset defaults to {0, 0} (absolute positioning)
✅ No automatic collision avoidance (explicit offsets required)
✅ Future: `position` property for relative positioning modes

### Layout Algorithms
✅ Row/column layout with anchor-based flow direction
✅ Anchor inheritance (children inherit parent's anchor)
✅ Section is auto-layout OR manual (no mixing)
✅ Spacing/alignment are anchor-relative
✅ Default spacing: "start" (pack toward anchor)
✅ Default alignment: "start" (align to anchor's perpendicular component)
✅ Content-based bounds calculation

### Table Configuration
✅ `capacity` determines table SIZE only (via perimeter formula)
✅ `seatCount` determines number of people to seat (defaults to capacity)
✅ Separation allows wall tables (fewer seats than size) and explicit sizing
✅ Auto-determined seating from shape + seatCount
✅ Custom seats (benches) with seatCount > 1
✅ Distribution formula: remainingChairs = seatCount - sum(custom seat seatCounts)
✅ Compass directions with degree fallback for seating

### Defaults and Templates
✅ Separate `defaults` and `templates` sections (distinct concepts)
✅ Defaults: Type-based default properties for all components of a type
✅ Templates: Named, reusable component patterns
✅ Both defined at top level only (for initial implementation)
✅ No `use` property in templates (prevents circular references)
✅ Property resolution order: defaults → template → instance
✅ Property overrides at usage site
✅ Future: Could extend to nested levels
✅ Only `anchor` inherits in layout hierarchy

---

**End of Specification Draft**

This document will be refined through further discussion before implementation begins.
