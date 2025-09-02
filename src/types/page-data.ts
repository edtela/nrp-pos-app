/**
 * Page Data Types for Static Generation
 */

import { DisplayMenu } from "@/model/menu-model";
import { OrderPageData } from "@/model/order-model";

/**
 * Tables page data structure
 */
export interface TablesPageData {
  id: string;
  name: string;
  svgContent: string;  // Full SVG as string
}

/**
 * Static data that can be preloaded or fetched
 */
export type PageStaticData = 
  | { type: "order"; data: OrderPageData }
  | { type: "menu"; data: DisplayMenu }
  | { type: "tables"; data: TablesPageData };

/**
 * Global window type for preloaded data
 */
declare global {
  interface Window {
    __PRELOADED_DATA__?: PageStaticData;
  }
}