# DOM Messaging Architecture Migration Plan

## Overview
This document outlines the migration from the current monolithic `html-template.ts` to a modular DOM-based messaging architecture that eliminates singletons and provides null-safe DOM operations.

## Migration Scope

### Files to Migrate (15 components using html-template)
1. `src/pages/page-renderer.ts`
2. `src/components/order-content.ts`
3. `src/components/order-item.ts`
4. `src/components/app-bottom-bar.ts`
5. `src/pages/order-page.ts`
6. `src/components/modifier-page-content.ts`
7. `src/components/menu-page-content.ts`
8. `src/pages/menu-page.ts`
9. `src/components/menu-content.ts`
10. `src/app-init.ts`
11. `src/components/menu-item.ts`
12. `src/components/app-header.ts`
13. `src/components/app-menu.ts`
14. `src/components/variant.ts`
15. `src/components/menu-header.ts`

### Files using NavigationService (2 files)
1. `src/pages/order-page.ts`
2. `src/pages/menu-page.ts`

### Files using domUpdate (1 file)
1. `src/components/modifier-page-content.ts`

## Migration Steps

### Phase 1: Update Imports
- [x] Change imports from `@/lib/html-template` to specific modules:
  - Template functions → `@/lib/template`
  - Event functions → `@/lib/events`
  - DOM updates → `@/lib/dom-node` or `@/lib/dom-update`

### Phase 2: Migrate DOM Operations
- [x] Replace `domUpdate.*` calls with DomNode
- [x] Replace `querySelector` with `dom()` or `DomNode.select()`
- [x] Replace direct element manipulation with DomNode methods

### Phase 3: Replace Navigation Singleton
- [x] Remove `getNavigationService()` imports
- [x] Replace navigation calls with message dispatching
- [x] Set up navigation message handler in app-init.ts
- [x] Update navigation-service.ts to use messaging

### Phase 4: Clean Up
- [x] Remove html-template.ts facade
- [x] Remove old navigation-service.ts singleton pattern
- [x] Update tests if needed

## Migration Patterns

### Pattern 1: Import Updates
```typescript
// OLD
import { html, render, domUpdate, onClick } from "@/lib/html-template";

// NEW
import { html, render } from "@/lib/template";
import { onClick } from "@/lib/events";
import { dom } from "@/lib/dom-node";
```

### Pattern 2: DOM Updates
```typescript
// OLD
domUpdate.setTextContent(container, ".price", "$10");
domUpdate.setVisibility(container, ".badge", true);

// NEW
const node = dom(container);
node.select(".price").setText("$10");
node.select(".badge").setVisibility(true);
```

### Pattern 3: querySelector Replacement
```typescript
// OLD
const element = container.querySelector(".my-element") as HTMLElement;
if (element) {
  element.textContent = "Hello";
}

// NEW
dom(container).select(".my-element").setText("Hello");
```

### Pattern 4: Navigation
```typescript
// OLD
import { getNavigationService } from "@/services/navigation-service";
getNavigationService().goto.home();

// NEW
import { NavigationMessenger } from "@/lib/messaging";
const nav = new NavigationMessenger();
nav.home();
```

## Testing Strategy
1. Build project after each component migration
2. Test navigation flows
3. Verify DOM updates work correctly
4. Check event handling still functions

## Rollback Plan
All changes are in branch `refactor/dom-messaging-architecture`. If issues arise:
```bash
git checkout main
git branch -D refactor/dom-messaging-architecture
```