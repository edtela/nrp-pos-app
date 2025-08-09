/**
 * Page Model Types
 * Common data structures used across different pages
 */

export type BottomBarData = {
  left: {
    value: string | number;
    label: string;
  };
  action: {
    onClick?: any;
    label: string;
  };
  right: {
    value: string | number;
    label: string;
  };
};