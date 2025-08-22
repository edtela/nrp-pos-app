/**
 * Common Style Constants
 * Type-safe references to CSS classes defined in styles.css
 */

export const styles = {
  title: {
    large: 'title-large',
    medium: 'title-medium'
  },
  price: {
    primary: 'price-primary',
    secondary: 'price-secondary'
  },
  description: 'description',
  token: {
    base: 'token-base',
    remove: 'token-remove',
    add: 'token-add',
    modify: 'token-modify'
  }
} as const;

export type StyleClasses = typeof styles;