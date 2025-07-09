# NRP POS System

A modern Point of Sale (POS) web application built with TypeScript, Vite, and Material Design 3.

## Technology Stack

- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Linaria** - Zero-runtime CSS-in-JS
- **Custom lit-html** - Lightweight templating without full framework overhead
- **Material Design 3** - Modern design system

## Project Structure

```
nrp/
├── src/
│   ├── lib/
│   │   └── html-template.ts    # Custom templating functions
│   ├── pages/
│   │   └── menu-page.ts        # Menu display page
│   ├── styles/
│   │   └── theme.ts            # M3 design tokens
│   └── main.ts                 # Application entry point
├── data/
│   └── menu/                   # JSON menu data files
└── index.html
```

## Design Guidelines

All styling follows Material Design 3 guidelines: https://m3.material.io/

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Add menu data files to `data/menu/` directory as JSON files

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Menu Data

Place your menu JSON files in the `data/menu/` directory. The application loads menu data based on the URL path:
- `/` → loads `data/menu/menu.json`
- `/breakfast` → loads `data/menu/breakfast.json`
- `/lunch` → loads `data/menu/lunch.json`

## Development

The application uses a custom lit-html compatible templating system that provides:
- Tagged template literals
- Nested template support
- No data binding or event handling (by design)

Styles are co-located with components using Linaria for zero-runtime CSS-in-JS.