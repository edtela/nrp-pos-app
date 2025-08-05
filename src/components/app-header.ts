/**
 * App Header Component
 * Material Design 3 Top App Bar with navigation, search, and menu
 * 
 * @see /component-guidelines.md for component patterns and conventions
 */

import { css } from '@linaria/core';
import { html, Template } from '@/lib/html-template';
import { mdColors, mdTypography, mdSpacing, mdShape } from '@/styles/theme';

/**
 * Header data interface
 */
export interface HeaderData {
  showBack?: boolean;
  searchPlaceholder?: string;
}

/**
 * Header template - Material Design 3 Top App Bar
 */
export function template(data: HeaderData = {}): Template {
  const { searchPlaceholder = "Search Menu" } = data;
  
  return html`
    <button class="${styles.iconButton} ${styles.backButton}">
      <span class="material-icons">arrow_back</span>
    </button>
    
    <div class="${styles.searchContainer}">
      <span class="material-icons ${styles.searchIcon}">search</span>
      <input 
        type="text" 
        class="${styles.searchInput}"
        placeholder="${searchPlaceholder}"
      />
    </div>
    
    <button class="${styles.iconButton} ${styles.menuButton}">
      <span class="material-icons">menu</span>
    </button>
  `;
}

/**
 * App Header Styles
 */
export const styles = {
  iconButton: css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: transparent;
    border: none;
    cursor: pointer;
    color: ${mdColors.onSurface};
    transition: background-color 200ms ease;
    
    &:hover {
      background-color: ${mdColors.onSurface}14;
    }
    
    &:active {
      background-color: ${mdColors.onSurface}1F;
    }
    
    .material-icons {
      font-size: 24px;
    }
  `,
  
  backButton: css`
    margin-left: ${mdSpacing.xs};
  `,
  
  menuButton: css`
    margin-right: ${mdSpacing.xs};
  `,
  
  searchContainer: css`
    flex: 1;
    display: flex;
    align-items: center;
    background-color: ${mdColors.surfaceContainerHighest};
    border-radius: ${mdShape.corner.full};
    padding: 0 ${mdSpacing.md};
    height: 48px;
    margin: 0 ${mdSpacing.xs};
  `,
  
  searchIcon: css`
    color: ${mdColors.onSurfaceVariant};
    margin-right: ${mdSpacing.sm};
    font-size: 24px;
  `,
  
  searchInput: css`
    flex: 1;
    border: none;
    background: none;
    outline: none;
    font-size: ${mdTypography.bodyLarge.fontSize};
    line-height: ${mdTypography.bodyLarge.lineHeight};
    color: ${mdColors.onSurface};
    
    &::placeholder {
      color: ${mdColors.onSurfaceVariant};
    }
  `,
} as const;