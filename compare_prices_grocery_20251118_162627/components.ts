interface StoreComparisonPanelProps {
  // List of grocery items to compare across stores.
  // Example: [{ id: "milk-1", name: "Whole Milk", qty: 2, unit: "gallon" }]
  items: {
    id: string;
    name: string;
    qty: number; // quantity requested by the user
    unit?: string; // e.g., "lb", "gallon", "ct"
  }[];

  // Stores included in the comparison.
  // Include a small logo URL if available for visual identity.
  // Example: [{ id: "store-a", name: "FreshMart", logoUrl: "/logos/freshmart.png" }]
  stores: {
    id: string;
    name: string;
    logoUrl?: string;
  }[];

  // Price matrix: prices[itemId][storeId] = unit price for one item (not multiplied by qty).
  // Use null to indicate unavailable/out-of-stock at that store for that item.
  // Example: { "milk-1": { "store-a": 3.49, "store-b": 3.29, "store-c": null } }
  prices: Record<string, Record<string, number | null>>;

  // Per-store totals for the full list (qty multiplied by unit price, excluding unavailable items).
  // If an item is unavailable at a store, the total should reflect that it cannot fulfill the full list
  // OR be omitted depending on your upstream logic. Include a consistent policy in your data.
  // Example: [{ storeId: "store-a", total: 42.37 }]
  totals: {
    storeId: string;
    total: number;
  }[];

  // The store ID recommended as the best single-store option (lowest feasible total).
  // Example: "store-b"
  bestStoreId: string;

  // Optional mixed-store cheapest cart breakdown, showing the cheapest store per item.
  // If provided, the panel can display the cross-store "cheapest possible cart".
  // Example:
  // {
  //   items: [
  //     { itemId: "milk-1", storeId: "store-b", price: 3.29 },
  //     { itemId: "eggs-1", storeId: "store-a", price: 2.19 }
  //   ],
  //   total: 39.85,
  //   savingsVsBestSingleStore: 2.52
  // }
  mixedCart?: {
    items: {
      itemId: string;
      storeId: string;
      price: number; // unit price used for this item
    }[];
    total: number; // sum of item price * qty
    savingsVsBestSingleStore?: number; // positive number indicating extra savings vs bestStoreId total
  };

  // Single primary interaction as an action object:
  // Triggered when the user confirms the recommended best store selection.
  // Provide the target storeId in the action so the container can route/handle it.
  // Example: { type: "select_best_store", storeId: "store-b" }
  onSelectBestStoreAction: {
    type: "select_best_store";
    storeId: string;
  };

  // Optional display configuration.

  // Currency code for price formatting. Default: "USD"
  // Example: "USD", "EUR", "GBP"
  currencyCode?: string;

  // If true, the panel initially shows the mixed-store cheapest-cart breakdown (when mixedCart is provided).
  // Default: false
  showMixedCartDefault?: boolean;
}

interface GroceryListEditorProps {
  items: GroceryItem[]; 
  // Current editable list.
  // Example:
  // [
  //   { id: "it_1", name: "Bananas", qty: 6, unit: "ct", notes: "ripe" },
  //   { id: "it_2", name: "Milk", qty: 1, unit: "gal" }
  // ]

  unitOptions: UnitOption[];
  // Allowed units for quantities, shown in unit pickers.
  // Example: [{ value: "ct", label: "count", iconUrl: "/icons/count.svg" }, { value: "lb", label: "pound" }]

  suggestionsEnabled?: boolean;
  // If true, the editor can surface autosuggest/autocomplete for item names
  // based on common groceries or prior history.

  quantityMode?: "integer" | "decimal";
  // Controls quantity input behavior:
  // - "integer": for discrete items (e.g., eggs)
  // - "decimal": allows decimals (e.g., 1.5 lb apples)

  dedupeStrategy?: "none" | "merge_by_name";
  // "merge_by_name": when importing/adding duplicates, merge and sum qty
  // Case-insensitive, trims whitespace.

  addItemAction: { type: "add_item" };
  // Dispatched when user adds an item.
  // Payload example: { type: "add_item", text: "tomatoes", unit?: "lb", qty?: 2, notes?: "roma" }

  updateItemAction: { type: "update_item" };
  // Dispatched when user edits an existing item.
  // Payload example: { type: "update_item", id: "it_2", patch: { qty: 2, unit: "gal" } }
  // patch may include: Partial<GroceryItem> excluding 'id'

  removeItemAction: { type: "remove_item" };
  // Dispatched when an item is deleted.
  // Payload example: { type: "remove_item", id: "it_1" }

  reorderAction: { type: "reorder_item" };
  // Dispatched when drag-and-drop changes order.
  // Payload example: { type: "reorder_item", sourceId: "it_3", targetId: "it_1", position: "before" | "after" }

  importAction: { type: "import_items" };
  // Dispatched when user imports a list (paste text/CSV or file).
  // Payload examples:
  // - Text: { type: "import_items", text: "milk 1 gal\nbananas 6 ct" }
  // - CSV:  { type: "import_items", csv: "name,qty,unit,notes\nMilk,1,gal,\nBananas,6,ct,ripe" }

  autosaveAction?: { type: "autosave_draft" };
  // Optional periodic dispatch with the whole list for persistence.
  // Payload example: { type: "autosave_draft", items: GroceryItem[] }
}

interface GroceryItem {
  id: string;     // Stable client id (e.g., "it_123")
  name: string;   // Item name (e.g., "Tomatoes")
  qty: number;    // Quantity (integer or decimal based on quantityMode)
  unit?: string;  // Must match one of unitOptions.value (e.g., "lb", "ct", "gal")
  notes?: string; // Optional freeform details (e.g., "roma", "organic")
  pinned?: boolean; // If true, item stays at top; used for common staples
}

interface UnitOption {
  value: string;   // Canonical unit key (e.g., "ct", "lb", "oz", "gal", "kg")
  label: string;   // Display label (e.g., "count", "pound")
  iconUrl?: string; // Optional icon for the unit picker
}

interface StoreRadiusSelectorProps {
  // Current user location used as the center for distance/radius filtering.
  // Example: { lat: 37.776, lng: -122.417, label: "San Francisco, CA" }
  userLocation?: {
    lat: number;
    lng: number;
    label?: string; // Optional human-readable label for display
  };

  // Active search radius in kilometers.
  // Example: 5 means show/select stores within 5 km of userLocation.
  radiusKm: number;

  // Candidate stores to display and allow selection from (up to selectionLimit).
  // distanceKm should be computed relative to userLocation.
  stores: Array<{
    id: string; // Unique store identifier
    name: string; // Display name, e.g., "Safeway - Elm St"
    brand?: string; // Brand/chain, e.g., "Safeway"
    distanceKm: number; // Distance from userLocation in km, e.g., 3.2
    isSelected: boolean; // Whether this store is currently selected
    logoUrl?: string; // Optional store or brand logo for quick recognition
  }>;

  // Maximum number of stores the user can select for comparison.
  // Default: 3
  selectionLimit?: number;

  // Optional predefined radius choices (in km) to present as quick-select options.
  // Example: [2, 5, 10, 20]
  radiusOptionsKm?: number[];

  // Single action object for all interactions. The component will emit one of the
  // following action shapes when the user interacts (change radius, toggle store,
  // use current location, or search by address).
  // Examples:
  // - { type: "change_radius", payload: { radiusKm: 10 } }
  // - { type: "toggle_store", payload: { storeId: "store_123", selected: true } }
  // - { type: "use_current_location" }
  // - { type: "search_address", payload: { query: "1600 Amphitheatre Pkwy" } }
  onInteractAction:
    | { type: "change_radius"; payload: { radiusKm: number } }
    | { type: "toggle_store"; payload: { storeId: string; selected: boolean } }
    | { type: "use_current_location"; payload?: {} }
    | { type: "search_address"; payload: { query: string } };
}

interface PriceAssumptionsBannerProps {
  // Unique identifier for this banner instance (e.g., to correlate actions)
  id: string;

  // Short heading shown in the banner (e.g., "Pricing assumptions")
  title: string;

  // Human-friendly label for the pricing data source (e.g., "Weekly circular + in-app prices")
  dataSourceLabel: string;

  // When the pricing assumptions take effect.
  // ISO 8601 string, e.g., "2025-11-19T09:30:00-05:00"
  effectiveDateTime: string;

  // Whether displayed prices include estimated taxes/fees in totals
  includesTax: boolean;

  // Memberships/club cards assumed in pricing, e.g., ["Safeway Club", "Costco Member"]
  membershipTypes: string[];

  // Substitution policy assumed when exact items unavailable.
  // - "no_substitutions": exact items only
  // - "same_brand": same brand, similar size
  // - "same_category": same category, closest size/price
  // - "best_match": any reasonable alternative chosen by store/app
  substitutionPolicy: "no_substitutions" | "same_brand" | "same_category" | "best_match";

  // Action to open a full details view of all assumptions and constraints
  // Example: { type: "view_details", payload: { contextId: "compare-session-123" } }
  viewDetailsAction?: {
    type: "view_details";
    payload?: {
      // ID to maintain context (e.g., comparison session or user flow)
      contextId?: string;
    };
  };

  // Action to open settings to change assumptions (tax inclusion, memberships, substitutions)
  // Example: { type: "change_settings", payload: { contextId: "compare-session-123" } }
  changeSettingsAction?: {
    type: "change_settings";
    payload?: {
      // ID to maintain context (e.g., comparison session or user flow)
      contextId?: string;
    };
  };
}

interface SavingsSummaryCardProps {
  // Unique identifier for analytics/telemetry correlation
  id: string;

  // Best single-store option the system found
  // Example: { storeId: "store_123", storeName: "FreshMart", total: 86.42, logoUrl: "https://cdn.example.com/freshmart.png" }
  singleStoreBest: {
    storeId: string;
    storeName: string; // Display name for the store
    total: number; // Total price for buying everything at this store
    logoUrl?: string; // Optional logo/icon for the store
  };

  // Total price if the user buys items across multiple stores for the absolute cheapest basket
  // Example: 79.10
  mixedCartTotal: number;

  // Summarized savings data
  // Example: { amount: 7.32, percent: 8.47 } where percent is 0-100 (not 0-1)
  savings: {
    amount: number; // Absolute savings = singleStoreBest.total - mixedCartTotal
    percent: number; // Percentage savings relative to singleStoreBest.total (0-100)
  };

  // How many unique stores are involved in the cheapest mixed cart
  // Example: 2 or 3
  storesInvolvedCount: number;

  // Optional: Estimated extra travel time required to pick up from multiple stores (in minutes)
  // Example: 18 means ~18 minutes additional travel vs single-store
  estTravelTimeMinutes?: number;

  // Optional: Currency code for all monetary values; default can be assumed as "USD" if omitted
  // Example: "USD", "EUR", "GBP"
  currency?: string;

  // Action objects (no callbacks) for key interactions
  actions: {
    // Trigger to show the detailed mixed-cart breakdown (which items at which store)
    // payload can include optional context for routing/telemetry
    viewBreakdown: {
      type: "view_breakdown";
      payload?: {
        source?: "savings_card" | string;
        id?: string; // can mirror the card id
      };
    };

    // User chooses a purchasing strategy; UI should dispatch with the selected strategy
    // Example dispatch payload: { strategy: "mixed" }
    chooseStrategy: {
      type: "choose_strategy";
      payload: {
        strategy: "single" | "mixed";
      };
    };
  };
}