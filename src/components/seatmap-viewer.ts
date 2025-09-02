/**
 * Seatmap Viewer Component
 * Provides map-like pan and zoom functionality for SVG floor plans
 */

export class SeatmapViewer {
  private container: HTMLElement;
  private svg: SVGElement;
  private isPanning = false;
  private startX = 0;
  private startY = 0;
  private scrollLeft = 0;
  private scrollTop = 0;
  private currentScale = 1;
  
  // Configuration
  private readonly MIN_SCALE = 0.5;
  private readonly MAX_SCALE = 3;
  
  constructor(container: HTMLElement) {
    this.container = container;
    const svg = container.querySelector('svg');
    if (!svg) {
      throw new Error('No SVG element found in container');
    }
    this.svg = svg as SVGElement;
    
    this.init();
  }
  
  private init() {
    // Setup container styles
    this.container.style.cursor = 'grab';
    this.container.style.userSelect = 'none';
    this.container.style.position = 'relative';
    this.container.style.overflow = 'auto';
    
    // Setup SVG for transformations - center origin for symmetric behavior
    this.svg.style.transformOrigin = 'center center';
    this.svg.style.transition = 'transform 0.1s ease-out';
    this.svg.style.position = 'relative';
    
    // Ensure minimum size
    this.ensureMinimumSize();
    
    // Attach event listeners
    this.attachPanListeners();
    this.attachZoomListeners();
  }
  
  private ensureMinimumSize() {
    // Set the SVG to use full width while maintaining aspect ratio
    this.svg.style.width = '100%';
    this.svg.style.height = 'auto';
    this.svg.style.display = 'block';
    this.svg.style.minWidth = '1200px'; // Match SVG viewBox width
    this.svg.style.margin = '0 auto'; // Center horizontally
  }
  
  private attachPanListeners() {
    // Mouse events
    this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.container.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.container.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.container.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    
    // Touch events
    this.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.container.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }
  
  private attachZoomListeners() {
    // Mouse wheel zoom
    this.container.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    
    // Touch pinch zoom (basic implementation)
    let lastDistance = 0;
    
    this.container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        lastDistance = this.getTouchDistance(e.touches);
      }
    }, { passive: false });
    
    this.container.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = this.getTouchDistance(e.touches);
        const delta = currentDistance / lastDistance;
        this.zoom(delta);
        lastDistance = currentDistance;
      }
    }, { passive: false });
  }
  
  private handleMouseDown(e: MouseEvent) {
    // Don't pan if clicking on a table
    const target = e.target as HTMLElement;
    if (target.closest('[id^="table-"]')) {
      return;
    }
    
    this.isPanning = true;
    this.startX = e.pageX - this.container.offsetLeft;
    this.startY = e.pageY - this.container.offsetTop;
    this.scrollLeft = this.container.scrollLeft;
    this.scrollTop = this.container.scrollTop;
    this.container.style.cursor = 'grabbing';
    
    // Disable transition during pan
    this.svg.style.transition = 'none';
  }
  
  private handleMouseMove(e: MouseEvent) {
    if (!this.isPanning) return;
    
    e.preventDefault();
    const x = e.pageX - this.container.offsetLeft;
    const y = e.pageY - this.container.offsetTop;
    const walkX = (x - this.startX) * 1.5; // Increase pan speed
    const walkY = (y - this.startY) * 1.5;
    this.container.scrollLeft = this.scrollLeft - walkX;
    this.container.scrollTop = this.scrollTop - walkY;
  }
  
  private handleMouseUp() {
    this.isPanning = false;
    this.container.style.cursor = 'grab';
    
    // Re-enable transition
    this.svg.style.transition = 'transform 0.1s ease-out';
  }
  
  private handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      
      // Check if touching a table
      const target = e.target as HTMLElement;
      if (target.closest('[id^="table-"]')) {
        return;
      }
      
      this.isPanning = true;
      this.startX = touch.pageX - this.container.offsetLeft;
      this.startY = touch.pageY - this.container.offsetTop;
      this.scrollLeft = this.container.scrollLeft;
      this.scrollTop = this.container.scrollTop;
    }
  }
  
  private handleTouchMove(e: TouchEvent) {
    if (!this.isPanning || e.touches.length !== 1) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const x = touch.pageX - this.container.offsetLeft;
    const y = touch.pageY - this.container.offsetTop;
    const walkX = (x - this.startX) * 1.5;
    const walkY = (y - this.startY) * 1.5;
    this.container.scrollLeft = this.scrollLeft - walkX;
    this.container.scrollTop = this.scrollTop - walkY;
  }
  
  private handleTouchEnd() {
    this.isPanning = false;
  }
  
  private handleWheel(e: WheelEvent) {
    // Only zoom if ctrl/cmd is pressed or using pinch gesture on trackpad
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      
      // Store current scroll center before zoom
      const scrollCenterX = this.container.scrollLeft + this.container.clientWidth / 2;
      const scrollCenterY = this.container.scrollTop + this.container.clientHeight / 2;
      const scrollRatioX = scrollCenterX / this.container.scrollWidth;
      const scrollRatioY = scrollCenterY / this.container.scrollHeight;
      
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoom(delta);
      
      // Restore scroll center after zoom
      const newScrollCenterX = this.container.scrollWidth * scrollRatioX;
      const newScrollCenterY = this.container.scrollHeight * scrollRatioY;
      this.container.scrollLeft = newScrollCenterX - this.container.clientWidth / 2;
      this.container.scrollTop = newScrollCenterY - this.container.clientHeight / 2;
    }
  }
  
  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  private zoom(delta: number) {
    const newScale = Math.min(this.MAX_SCALE, Math.max(this.MIN_SCALE, this.currentScale * delta));
    
    if (newScale !== this.currentScale) {
      this.currentScale = newScale;
      this.applyTransform();
    }
  }
  
  private applyTransform() {
    this.svg.style.transform = `scale(${this.currentScale})`;
    
    // For center-based transforms, we need to adjust positioning
    // to keep the content properly positioned within the scrollable area
    const scale = this.currentScale;
    const originalWidth = 1200; // SVG viewBox width
    const originalHeight = 1000; // SVG viewBox height
    
    // Calculate the scaled dimensions
    const scaledWidth = originalWidth * scale;
    const scaledHeight = originalHeight * scale;
    
    // Get container dimensions
    const containerRect = this.container.getBoundingClientRect();
    
    // Set explicit dimensions to create proper scroll area
    this.svg.style.width = `${scaledWidth}px`;
    this.svg.style.height = `${scaledHeight}px`;
    
    // Center the SVG if it's smaller than container
    if (scaledWidth < containerRect.width) {
      this.svg.style.marginLeft = `${(containerRect.width - scaledWidth) / 2}px`;
      this.svg.style.marginRight = 'auto';
    } else {
      this.svg.style.marginLeft = '0';
      this.svg.style.marginRight = '0';
    }
    
    if (scaledHeight < containerRect.height) {
      this.svg.style.marginTop = `${(containerRect.height - scaledHeight) / 2}px`;
      this.svg.style.marginBottom = 'auto';
    } else {
      this.svg.style.marginTop = '0';
      this.svg.style.marginBottom = '0';
    }
  }
  
  // Public methods for external control
  public zoomIn() {
    // Store current scroll center before zoom
    const scrollCenterX = this.container.scrollLeft + this.container.clientWidth / 2;
    const scrollCenterY = this.container.scrollTop + this.container.clientHeight / 2;
    const scrollRatioX = scrollCenterX / this.container.scrollWidth;
    const scrollRatioY = scrollCenterY / this.container.scrollHeight;
    
    this.zoom(1.2);
    
    // Restore scroll center after zoom
    const newScrollCenterX = this.container.scrollWidth * scrollRatioX;
    const newScrollCenterY = this.container.scrollHeight * scrollRatioY;
    this.container.scrollLeft = newScrollCenterX - this.container.clientWidth / 2;
    this.container.scrollTop = newScrollCenterY - this.container.clientHeight / 2;
  }
  
  public zoomOut() {
    // Store current scroll center before zoom
    const scrollCenterX = this.container.scrollLeft + this.container.clientWidth / 2;
    const scrollCenterY = this.container.scrollTop + this.container.clientHeight / 2;
    const scrollRatioX = scrollCenterX / this.container.scrollWidth;
    const scrollRatioY = scrollCenterY / this.container.scrollHeight;
    
    this.zoom(0.8);
    
    // Restore scroll center after zoom
    const newScrollCenterX = this.container.scrollWidth * scrollRatioX;
    const newScrollCenterY = this.container.scrollHeight * scrollRatioY;
    this.container.scrollLeft = newScrollCenterX - this.container.clientWidth / 2;
    this.container.scrollTop = newScrollCenterY - this.container.clientHeight / 2;
  }
  
  public resetZoom() {
    this.currentScale = 1;
    this.applyTransform();
    this.centerContent();
  }
  
  public fitToContainer() {
    const containerRect = this.container.getBoundingClientRect();
    const svgElement = this.svg as SVGSVGElement;
    const svgViewBox = svgElement.viewBox.baseVal;
    
    // If no viewBox, try to get dimensions from width/height attributes
    let svgWidth = svgViewBox.width || 1200;
    let svgHeight = svgViewBox.height || 1000;
    
    const scaleX = containerRect.width / svgWidth;
    const scaleY = containerRect.height / svgHeight;
    
    // Use the smaller scale to ensure entire map fits without scrollbars
    // This shows the complete map with padding on sides or top/bottom
    const scale = Math.min(scaleX, scaleY);
    this.currentScale = Math.min(this.MAX_SCALE, Math.max(this.MIN_SCALE, scale));
    this.applyTransform();
    
    // Center the content in the viewport
    this.centerContent();
  }
  
  public fillWidth() {
    const containerRect = this.container.getBoundingClientRect();
    const svgElement = this.svg as SVGSVGElement;
    const svgViewBox = svgElement.viewBox.baseVal;
    
    // If no viewBox, try to get dimensions from width/height attributes
    let svgWidth = svgViewBox.width || 1200;
    
    const scaleX = containerRect.width / svgWidth;
    
    // Fill the width, allowing vertical scrolling if needed
    this.currentScale = Math.min(this.MAX_SCALE, Math.max(this.MIN_SCALE, scaleX));
    this.applyTransform();
    
    // Center the content in the viewport
    this.centerContent();
  }
  
  public centerContent() {
    // Center the scrollable area on the content
    const containerRect = this.container.getBoundingClientRect();
    const svgRect = this.svg.getBoundingClientRect();
    
    // Calculate center positions
    const scrollWidth = this.container.scrollWidth;
    const scrollHeight = this.container.scrollHeight;
    const viewportWidth = containerRect.width;
    const viewportHeight = containerRect.height;
    
    // Set scroll to center the content
    if (scrollWidth > viewportWidth) {
      this.container.scrollLeft = (scrollWidth - viewportWidth) / 2;
    }
    
    if (scrollHeight > viewportHeight) {
      this.container.scrollTop = (scrollHeight - viewportHeight) / 2;
    }
  }
}