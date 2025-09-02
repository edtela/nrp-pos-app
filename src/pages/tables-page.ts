/**
 * Tables Page Controller
 * Displays restaurant floor plan with table layout
 * With map-like pan/zoom functionality
 */

import { Template, html } from "@/lib/template";
import { Context } from "@/lib/context";
import { TablesPageData } from "@/types/page-data";
import { SeatmapViewer } from "@/components/seatmap-viewer";
import "@/components/seatmap-viewer.css";

// Template function - renders the SVG with viewer controls
export function template(data: TablesPageData, _context: Context): Template {
  return html`
    <div class="tables-page" style="width: 100%; height: 100vh; display: flex; flex-direction: column; margin: 0; padding: 0;">
      <header class="tables-header" style="padding: 0.75rem 1rem; background: white; border-bottom: 1px solid #ddd; flex-shrink: 0;">
        <h1 style="font-size: 1.5rem; margin: 0;">${data.name}</h1>
      </header>
      <div class="seatmap-viewer-container" style="flex: 1; position: relative; overflow: hidden; width: 100%;">
        <div class="seatmap-viewer" style="width: 100%; height: 100%;">
          ${data.svgContent}
        </div>
        <div class="seatmap-controls">
          <button class="seatmap-control-btn zoom-in" title="Zoom In"></button>
          <button class="seatmap-control-btn zoom-out" title="Zoom Out"></button>
          <button class="seatmap-control-btn zoom-reset" title="Reset Zoom"></button>
          <button class="seatmap-control-btn zoom-fit" title="Fit to Screen"></button>
        </div>
        <div class="seatmap-status">
          Zoom: <span class="zoom-level">100%</span>
        </div>
      </div>
    </div>
  `;
}

// Hydrate function - sets up pan/zoom interactions
export function hydrate(container: Element, _data: TablesPageData, _context: Context) {
  const viewerContainer = container.querySelector('.seatmap-viewer') as HTMLElement;
  
  if (!viewerContainer) {
    console.error('Seatmap viewer container not found');
    return;
  }
  
  // Initialize the seatmap viewer with pan/zoom functionality
  const viewer = new SeatmapViewer(viewerContainer);
  
  // Setup zoom control buttons
  const zoomInBtn = container.querySelector('.zoom-in') as HTMLButtonElement;
  const zoomOutBtn = container.querySelector('.zoom-out') as HTMLButtonElement;
  const resetBtn = container.querySelector('.zoom-reset') as HTMLButtonElement;
  const fitBtn = container.querySelector('.zoom-fit') as HTMLButtonElement;
  const zoomLevel = container.querySelector('.zoom-level') as HTMLElement;
  
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      viewer.zoomIn();
      updateZoomLevel();
    });
  }
  
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      viewer.zoomOut();
      updateZoomLevel();
    });
  }
  
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      viewer.resetZoom();
      updateZoomLevel();
    });
  }
  
  if (fitBtn) {
    fitBtn.addEventListener('click', () => {
      viewer.fitToContainer();
      updateZoomLevel();
    });
  }
  
  // Update zoom level display
  function updateZoomLevel() {
    const svg = viewerContainer.querySelector('svg');
    if (svg && zoomLevel) {
      const transform = svg.style.transform;
      const match = transform.match(/scale\(([\d.]+)\)/);
      const scale = match ? parseFloat(match[1]) : 1;
      zoomLevel.textContent = `${Math.round(scale * 100)}%`;
    }
  }
  
  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Only if not typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }
    
    if (e.key === '+' || e.key === '=') {
      viewer.zoomIn();
      updateZoomLevel();
    } else if (e.key === '-' || e.key === '_') {
      viewer.zoomOut();
      updateZoomLevel();
    } else if (e.key === '0') {
      viewer.resetZoom();
      updateZoomLevel();
    }
  });
  
  // Add table click handlers
  const tables = viewerContainer.querySelectorAll('[id^="table-"]');
  tables.forEach(table => {
    table.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Remove previous selection
      tables.forEach(t => t.classList.remove('selected'));
      
      // Add selection to clicked table
      table.classList.add('selected');
      
      // Get table info from data attributes
      const tableNumber = table.getAttribute('data-number');
      const capacity = table.getAttribute('data-capacity');
      
      console.log(`Table ${tableNumber} selected (capacity: ${capacity})`);
      
      // Here you could dispatch an event or update UI with table info
    });
  });
  
  // Initial view: fill width for better default presentation
  setTimeout(() => {
    viewer.fillWidth();
    updateZoomLevel();
  }, 100);
  
  console.log("Seatmap viewer initialized with pan/zoom controls");
}