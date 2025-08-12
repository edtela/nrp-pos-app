/**
 * Item List Styles
 * Shared styles for list containers and items across the application
 * Following Material Design 3 guidelines
 * 
 * @see /component-guidelines.md for component patterns and conventions
 */

import "./item-list.css";

/**
 * CSS class names
 */
export const classes = {
  container: "item-list-container",
  scrollContainer: "item-list-scroll-container",
  items: "item-list-items",
  item: "item-list-item",
  emptyContainer: "item-list-empty-container",
  emptyIcon: "item-list-empty-icon",
  emptyTitle: "item-list-empty-title",
  emptyMessage: "item-list-empty-message",
  emptyAction: "item-list-empty-action",
} as const;

// Export for backward compatibility
export const styles = classes;