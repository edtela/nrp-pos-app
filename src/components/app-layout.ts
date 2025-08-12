/**
 * App Layout Styles
 * Defines the overall layout structure for pages with fixed header and bottom bar
 * Following Material Design 3 guidelines
 */

import './app-layout.css';

/**
 * App Layout Class Names
 */
export const classes = {
  pageContainer: 'app-layout-page-container',
  header: 'app-layout-header',
  content: 'app-layout-content',
  bottomBar: 'app-layout-bottom-bar'
} as const;

// Export as styles for backward compatibility
export const styles = classes;