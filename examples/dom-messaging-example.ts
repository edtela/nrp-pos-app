/**
 * Example: Using the new DOM-based messaging architecture
 * 
 * This example demonstrates how to use DomNode and the messaging system
 * to replace singleton patterns with DOM event-based communication.
 */

import { DomNode, dom } from "@/lib/dom-node";
import { 
  MessageBus, 
  MessageChannels, 
  NavigationMessenger, 
  setupNavigationListener,
  dispatch,
  request,
  type NavigateMessage 
} from "@/lib/messaging";
import { html, render } from "@/lib/template";

// ============================================
// Example 1: Basic DomNode usage
// ============================================

function domNodeExample() {
  // Create a DomNode from various inputs
  const node1 = dom("#my-element");              // By ID selector
  const node2 = dom(".my-class");                // By class selector
  const node3 = dom(document.body);              // From element
  const node4 = DomNode.fromId("my-id");         // Direct ID lookup
  
  // Chain null-safe operations (no errors even if element doesn't exist)
  dom("#price-display")
    .setText("$99.99")
    .addClass("highlighted", "on-sale")
    .setStyle("font-weight", "bold")
    .setDataAttribute("price", 99.99);
  
  // Select child elements
  dom("#container")
    .select(".header")
    .setText("Welcome!")
    .parent()
    .select(".footer")
    .setVisibility(false);
  
  // Conditional operations
  dom("#optional-element")
    .ifExists(node => {
      console.log("Element exists, updating it");
      node.setText("Found it!");
    });
}

// ============================================
// Example 2: Replacing navigation singleton
// ============================================

// OLD WAY (with singleton):
// import { getNavigationService } from "./navigation-service";
// getNavigationService().goto.home();

// NEW WAY (with messaging):
function navigationExample() {
  // Option 1: Use NavigationMessenger helper
  const nav = new NavigationMessenger();
  nav.home();
  nav.menu("coffee-menu", { category: "hot-drinks" });
  nav.order();
  nav.back();
  
  // Option 2: Dispatch navigation messages directly
  dispatch(MessageChannels.NAVIGATE, {
    to: "menu",
    menuId: "coffee-menu",
    state: { category: "hot-drinks" }
  } as NavigateMessage);
  
  // Option 3: From any DomNode
  dom("#my-button")
    .onClick(() => {
      dom("#my-button").dispatchMessage(MessageChannels.NAVIGATE, {
        to: "home"
      });
    });
}

// ============================================
// Example 3: Setting up navigation listener
// ============================================

function setupNavigation() {
  // Set up the navigation handler at app level
  const unsubscribe = setupNavigationListener((message: NavigateMessage) => {
    switch (message.to) {
      case "home":
        console.log("Navigating to home");
        // navigate.toHome();
        break;
      case "menu":
        console.log(`Navigating to menu: ${message.menuId}`);
        // navigate.toMenu(message.menuId);
        break;
      case "order":
        console.log("Navigating to order");
        // navigate.toOrder();
        break;
      case "back":
        console.log("Going back");
        // navigate.back();
        break;
    }
  });
  
  // Later, if needed:
  // unsubscribe();
}

// ============================================
// Example 4: Request-Response pattern
// ============================================

async function requestResponseExample() {
  // Set up a request handler at document level
  const bus = new MessageBus();
  
  bus.onRequest("get-user-data", async (data: { userId: string }) => {
    // Simulate fetching user data
    return {
      id: data.userId,
      name: "John Doe",
      email: "john@example.com"
    };
  });
  
  // Make a request from anywhere
  try {
    const userData = await request("get-user-data", { userId: "123" });
    console.log("User data:", userData);
  } catch (error) {
    console.error("Request failed:", error);
  }
  
  // Or from a DomNode
  const node = dom("#user-profile");
  const data = await node.dispatchRequest("get-user-data", { userId: "456" });
  node.setText(`Welcome, ${data.name}`);
}

// ============================================
// Example 5: Component with messaging
// ============================================

class MenuComponent {
  private container: DomNode;
  private unsubscribers: (() => void)[] = [];
  
  constructor(element: Element) {
    this.container = dom(element);
    this.setupListeners();
    this.render();
  }
  
  private setupListeners() {
    // Listen for order events
    const bus = new MessageBus();
    
    this.unsubscribers.push(
      bus.onMessage(MessageChannels.ORDER_ADD, (data) => {
        this.handleOrderAdd(data);
      })
    );
    
    this.unsubscribers.push(
      bus.onMessage(MessageChannels.ORDER_UPDATE, (data) => {
        this.handleOrderUpdate(data);
      })
    );
  }
  
  private handleOrderAdd(data: any) {
    console.log("Order added:", data);
    this.updateBadge();
  }
  
  private handleOrderUpdate(data: any) {
    console.log("Order updated:", data);
    this.updateBadge();
  }
  
  private updateBadge() {
    this.container
      .select(".order-badge")
      .setText("5")
      .setVisibility(true);
  }
  
  private render() {
    const template = html`
      <div class="menu">
        <button class="add-to-order">Add to Order</button>
        <span class="order-badge">0</span>
      </div>
    `;
    
    this.container.setHTML(template);
    
    // Set up click handler
    this.container
      .select(".add-to-order")
      .onClick(() => {
        // Send order message
        this.container.dispatchMessage(MessageChannels.ORDER_ADD, {
          item: { id: "coffee-1", name: "Cappuccino", price: 4.50 }
        });
      });
  }
  
  destroy() {
    // Clean up listeners
    this.unsubscribers.forEach(unsub => unsub());
  }
}

// ============================================
// Example 6: Migrating from domUpdate
// ============================================

function migrationExample(container: Element) {
  // OLD WAY (using domUpdate):
  // domUpdate.setTextContent(container, ".price", "$10.00");
  // domUpdate.setVisibility(container, ".discount", true);
  // domUpdate.setStyle(container, ".button", "background", "red");
  
  // NEW WAY (using DomNode):
  const node = dom(container);
  
  node.select(".price").setText("$10.00");
  node.select(".discount").setVisibility(true);
  node.select(".button").setStyle("background", "red");
  
  // Or chain from container:
  dom(container)
    .select(".price").setText("$10.00")
    .parent()
    .select(".discount").setVisibility(true)
    .parent()
    .select(".button").setStyle("background", "red");
}

// ============================================
// Example 7: Benefits demonstration
// ============================================

function benefitsDemo() {
  // 1. NULL SAFETY - No errors even if elements don't exist
  dom("#non-existent")
    .setText("Hello")           // No error
    .addClass("active")          // No error  
    .setStyle("color", "red");   // No error
  
  // 2. NO SINGLETONS - Everything through DOM events
  // Instead of: getService().doSomething()
  dispatch("do-something", { data: "value" });
  
  // 3. TESTABILITY - Easy to mock
  const mockNode = {
    setText: jest.fn().mockReturnThis(),
    addClass: jest.fn().mockReturnThis(),
    dispatchMessage: jest.fn().mockReturnThis()
  };
  
  // 4. COMPOSABILITY - Any element can participate
  dom(".widget").dispatchMessage("widget-update", { value: 42 });
  dom(".panel").onMessage("widget-update", (data) => {
    console.log("Widget updated:", data.value);
  });
  
  // 5. DEBUGGING - All events visible in DevTools
  // Open Chrome DevTools > Elements > Event Listeners
  // You'll see all dom:message:* and dom:request:* events
}

// ============================================
// Initialize the app
// ============================================

export function initializeApp() {
  // Set up global message handlers
  setupNavigation();
  
  // Initialize components
  const menuElement = document.querySelector("#menu");
  if (menuElement) {
    new MenuComponent(menuElement);
  }
  
  // Examples
  domNodeExample();
  navigationExample();
  requestResponseExample();
  benefitsDemo();
}