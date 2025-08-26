/**
 * HTML Template - Facade Module
 * 
 * Maintains backward compatibility by re-exporting from the new modular structure.
 * This file acts as a bridge during the migration to the new architecture.
 */

// Re-export template functionality
export {
  html,
  render,
  buildHTML,
  classMap,
  styleMap,
  dataAttr,
  toClassSelectors,
  replaceElement,
  replaceElements,
  reconcileChildren,
  type Template,
} from "./template";

// Re-export event functionality
export {
  CLICK_EVENT,
  STATE_UPDATE_EVENT,
  onClick,
  updateOnClick,
  setDataAttribute,
  initializeGlobalClickHandler,
  addEventHandler,
  type AppEventHandler,
} from "./events";

// Re-export dom update functionality  
export { domUpdate } from "./dom-update";

