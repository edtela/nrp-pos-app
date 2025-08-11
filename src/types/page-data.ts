/**
 * Page Data Types for Static Generation
 */

import { DisplayMenu } from "@/model/menu-model";
import { OrderPageData } from "@/model/order-model";

/**
 * Static data that can be preloaded or fetched
 */
export type PageStaticData = 
  | { type: "order"; data: OrderPageData }
  | { type: "menu"; data: DisplayMenu };

/**
 * Global window type for preloaded data
 */
declare global {
  interface Window {
    __PRELOADED_DATA__?: PageStaticData;
  }
}