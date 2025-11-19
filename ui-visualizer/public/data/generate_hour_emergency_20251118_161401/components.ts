interface EmergencyKitChecklistProps {
  // Unique identifier for this checklist instance (useful for analytics/persistence)
  id: string;

  // Display title, e.g., "72-hour Emergency Kit (Family of 4 + 1 infant)"
  title: string;

  // Tab labels (restrict to known categories for consistent visuals)
  categories: ItemCategory[]; // e.g., ["food","water","medical","shelter","tools","hygiene"]

  // Current active category tab; if omitted, the first category is shown
  activeCategory?: ItemCategory;

  // Primary data: items to display across tabs
  items: EmergencyKitItem[];

  // Number of days to provision for; default is 3 if omitted
  days?: number; // Default: 3

  // Optional precomputed totals; if omitted, component may compute on the fly
  totals?: {
    totalWeightKg: number; // Sum of qty * weightPerUnitKg (unchecked items may be included depending on app logic)
    totalItems: number; // Count of distinct items (or sum of quantities, per app logic)
  };

  // Optional view variant to adjust density/layout
  variant?: "compact" | "full"; // Default: "full"

  // Single action object template. The component will dispatch copies of this with a populated payload
  // whenever the user interacts (e.g., change qty, toggle, export PDF, open purchase link).
  // Example dispatch:
  // { ...onUserAction, payload: { type: "change_qty", itemId: "water-1", qty: 12 } }
  onUserAction: {
    type: "emergency_kit_interaction";
    payload?: EmergencyKitInteraction; // Component will fill this on dispatch
  };
}

/* ----- Supporting types ----- */

// Standardized categories for tabs and filtering
type ItemCategory = "food" | "water" | "medical" | "shelter" | "tools" | "hygiene";

// A single checklist line item
interface EmergencyKitItem {
  id: string; // Stable ID, e.g., "water-1"
  name: string; // e.g., "Bottled Water (1L)"
  category: ItemCategory;

  // Desired quantity for the kit; can be changed by the user
  qty: number;

  // Unit label shown next to qty, e.g., "bottles", "packs", "pcs"
  unit: string;

  // Weight per single unit in kilograms; used for total weight meter
  weightPerUnitKg: number;

  // Current check state for completion tracking
  checked: boolean;

  // Optional direct purchase URL for quick sourcing
  purchaseUrl?: string;

  // Optional thumbnail or icon for quick visual scanning
  imageUrl?: string;
}

// All user interactions the component may emit through onUserAction
type EmergencyKitInteraction =
  | { type: "change_qty"; itemId: string; qty: number }
  | { type: "toggle_checked"; itemId: string; checked: boolean }
  | { type: "switch_category"; category: ItemCategory }
  | { type: "open_purchase_link"; itemId: string; url: string }
  | { type: "export_pdf"; kitId: string }
  | { type: "check_all_in_category"; category: ItemCategory; checked: boolean }
  | { type: "change_days"; days: number }
  | { type: "change_variant"; variant: "compact" | "full" };

interface HouseholdProfileFormProps {
  // Primary identifiers
  id: string; // Unique component instance id (e.g., "household-form-001")
  title: string; // e.g., "Build Your 72-Hour Emergency Kit"
  description?: string; // Short helper text shown above the form

  // Key household parameters (core inputs used to tailor recommendations)
  adultsCount: number; // >=0; e.g., 2
  childrenCount: number; // >=0; ages 1–12; e.g., 1
  infantsCount: number; // >=0; <1 year; e.g., 1
  petsCount?: number; // >=0; e.g., 1 (optional)

  days?: number; // Default: 3 (72 hours). Accepts 1–14 typically.

  climate: "cold" | "temperate" | "hot"; // Primary climate for sizing water/calories (e.g., "temperate")

  specialNeeds?: SpecialNeed[]; 
  // Examples:
  // [
  //   { type: "medication", note: "Insulin for 5 days + cooling pack" },
  //   { type: "mobility", note: "Wheelchair ramps; spare batteries" },
  //   { type: "diet", note: "Nut-free + lactose-free" }
  // ]

  locationZip?: string; // Optional US ZIP for regional guidance, e.g., "98109"

  imageUrl?: string; // Optional icon/illustration for the form header

  // Single action object for interaction (dispatch-style)
  onAction: HouseholdFormAction;
  // Typical usage:
  // { 
  //   type: "submit_profile",
  //   payload: {
  //     profile: { adultsCount: 2, childrenCount: 1, infantsCount: 1, petsCount: 1, days: 3, climate: "temperate", specialNeeds: [], locationZip: "98109" }
  //   }
  // }

  // Optional configuration
  liveUpdate?: boolean; // If true, recalc kit on field change; otherwise waits for submit. Default: false
}

/**
 * Special needs considerations that affect kit contents/weights.
 */
interface SpecialNeed {
  type: "medication" | "mobility" | "diet";
  note: string; // Free-text detail, e.g., "Gluten-free, pack separate snacks"
}

/**
 * Action object to communicate user intents to the host app.
 * Host should handle the action and update state/props as needed.
 */
interface HouseholdFormAction {
  type:
    | "submit_profile"   // User submits to recalc the checklist
    | "reset_profile"    // Reset counts and settings to sensible defaults
    | "validate_profile" // Request validation (e.g., show errors/missing fields)
    | "change_field";    // Field-level change intent (for live updates)

  payload?: {
    // When submitting or validating, provide the full profile for processing
    profile?: {
      adultsCount: number;
      childrenCount: number;
      infantsCount: number;
      petsCount?: number;
      days?: number;
      climate: "cold" | "temperate" | "hot";
      specialNeeds?: SpecialNeed[];
      locationZip?: string;
    };

    // For granular changes (optional)
    fieldChange?: {
      field:
        | "adultsCount"
        | "childrenCount"
        | "infantsCount"
        | "petsCount"
        | "days"
        | "climate"
        | "locationZip"
        | "specialNeeds";
      value: unknown; // New value for the field; host should coerce/validate
    };

    // Optional correlation id for analytics/tracking
    requestId?: string; // e.g., UUID
  };
}

interface ItemDetailDrawerProps {
  // Unique identifier of the checklist item (used for state and actions)
  id: string;

  // Human-readable item name shown as the drawer title
  name: string;

  // Category tabs context; use standardized categories for Disaster Prep Kit UIs
  // e.g., "food" | "water" | "med" | "tools" | "shelter" | "hygiene" | "documents" | "other"
  category: string;

  // Quantity block for this item. value is the target count; unit is a short label (e.g., "bottles", "packs")
  // weightPerUnitKg is optional per-unit weight for computing total kit weight.
  quantity: {
    value: number; // Example: 12
    unit: string; // Example: "bottles"
    weightPerUnitKg?: number; // Example: 1.0 for 1L water bottle ≈ 1 kg
  };

  // Optional commerce/vendor link shown as a primary CTA in the drawer
  // Example: "https://www.example.com/products/water-bottle-1l"
  purchaseUrl?: string;

  // Optional image or icon representing the item
  // Example: CDN URL for a product image or a category icon
  imageUrl?: string;

  // Optional structured guidance: rich details for substitutions and safety
  details?: {
    // Short guidance or description to help the user choose/spec the item
    // Example: "Use 1L BPA-free bottles. Rotate every 6–12 months."
    description?: string;

    // Quick, actionable tips displayed as bullets
    // Example: ["Label purchase date", "Store in a cool, dark place"]
    tips?: string[];

    // Safety warnings or usage caveats
    // Example: ["Do not use for infant formula if seal is broken"]
    safetyNotes?: string[];

    // Substitution suggestions with optional links for alternatives
    // Example: [{ name: "Water purification tablets", link: "https://..." }]
    substitutes?: { name: string; link?: string }[];
  };

  // Single action channel for all interactions from the drawer
  // Dispatch when: adjusting quantity, marking purchased, opening vendor link, or closing the drawer.
  onAction: ItemDetailDrawerAction;
}

/**
 * Action object union dispatched by the ItemDetailDrawer.
 *
 * Examples:
 * { type: "adjust_qty", payload: { id: "item_123", value: 16 } }
 * { type: "mark_purchased", payload: { id: "item_123", purchased: true } }
 * { type: "open_vendor_link", payload: { id: "item_123", url: "https://..." } }
 * { type: "close", payload: { id: "item_123" } }
 */
type ItemDetailDrawerAction =
  | {
      type: "adjust_qty";
      payload: {
        id: string;
        value: number; // New desired quantity (integer)
      };
    }
  | {
    type: "mark_purchased";
    payload: {
      id: string;
      purchased: boolean; // true when user marks item as acquired
    };
  }
  | {
    type: "open_vendor_link";
    payload: {
      id: string;
      url: string; // Resolved purchaseUrl at time of click
    };
  }
  | {
    type: "close";
    payload: {
      id: string; // Item whose drawer is closing
    };
  };

// Props for the top-level readiness summary banner in a Disaster Prep Kit flow.
// Shows key totals, budget estimate, and alerts; supports unit toggling and alert-driven filtering.
interface SupplySummaryBannerProps {
  id: string; // Unique identifier for this banner instance (e.g., "kit-72hr-family4")
  title: string; // Display title (e.g., "72‑Hour Kit Summary")

  // Aggregated readiness metrics for the entire kit.
  totals: {
    totalWeightKg: number; // Total packed weight in kilograms (e.g., 28.4). Use with unitPreference for display.
    totalItems: number; // Count of distinct items or line entries (e.g., 57)
    totalWaterLiters: number; // Total water volume in liters across the kit (e.g., 48)
    caloriesPerDayPerPerson: number; // Daily kcal per person (e.g., 2300). Useful for adequacy checks.
    medsCount: number; // Number of medication-related items (e.g., 5)
  };

  // Rough cost to assemble the kit. Interpreted as a currency amount (e.g., USD 325.50).
  budgetEstimate: number;

  // System-generated readiness alerts. Clicking an alert should focus/filter the checklist.
  alerts: Array<{
    id: string; // Unique per alert (e.g., "alert-low-water")
    type: "lowWater" | "lowCalories" | "missingMeds" | "overWeight";
    message: string; // Human-readable guidance (e.g., "Water below 12L per person for 72 hours")
    severity?: "info" | "warning" | "critical"; // Optional visual weight (default can be "warning")
  }>;

  // Optional: preferred display units for weight/volume. If omitted, defaults to metric (kg, L).
  unitPreference?: {
    weight: "kg" | "lb"; // Default: "kg"
    volume: "L" | "gal"; // Default: "L"
  };

  // Optional: icon or emblem for the banner (e.g., kit/first-aid icon URL).
  iconUrl?: string;

  // Single action channel for all interactions from the banner.
  // Examples:
  // - { type: "filter_checklist_by_alert", payload: { alertType: "lowWater" } }
  // - { type: "toggle_units", payload: { weight: "lb", volume: "gal" } }
  // - { type: "view_pdf_export", payload: { format: "Letter" } }
  onAction:
    | {
        type: "filter_checklist_by_alert";
        payload: { alertType: "lowWater" | "lowCalories" | "missingMeds" | "overWeight" };
      }
    | {
        type: "toggle_units";
        payload: { weight: "kg" | "lb"; volume: "L" | "gal" };
      }
    | {
        type: "view_pdf_export";
        payload?: { format?: "A4" | "Letter" }; // Optional print format selection
      };
}

// VendorPriceFinderProps: Inline price comparison for a single disaster-prep item
// Scenario example: comparing prices for "Water Purification Tablets (50 ct)"
interface VendorPriceFinderProps {
  // Primary item identifiers
  itemId: string; // e.g., "water-tabs-50ct"
  itemTitle: string; // e.g., "Water Purification Tablets (50 count)"

  // Optional item image/icon for quick recognition
  itemImageUrl?: string; // e.g., CDN URL to product photo or icon

  // Vendor offers to compare. Rendered as a list or simple table.
  vendors: VendorOffer[]; // At least one vendor; out-of-stock entries may be shown/hidden

  // Sorting preference for the vendor list
  sortBy?: "price" | "eta"; // Default: "price"

  // Optional display/config
  hideOutOfStock?: boolean; // Default: false (show all offers, but mark unavailable)
  autoRefreshSeconds?: number; // e.g., 300 (5 min). If set, UI may auto-refresh prices periodically.

  // Single action channel for all interactions (select vendor, change sort, refresh)
  onAction: VendorPriceFinderAction;
}

// A single vendor's offer for the item
interface VendorOffer {
  id: string; // e.g., "amazon", "rei", "home-depot"
  name: string; // e.g., "Amazon"
  price: number; // numeric price in the listed currency
  currency: "USD" | "EUR" | "GBP" | "CAD" | "AUD"; // Extend as needed
  shipEtaDays: number; // Estimated delivery time in days (e.g., 2, 5, 10)
  link: string; // Direct purchase URL; opened when user selects the vendor
  inStock: boolean; // If false, vendor row may be disabled or placed at end
  logoUrl?: string; // Optional small logo/icon for the vendor
  // Optional: last updated timestamp, helpful for user trust
  lastUpdatedIso?: string; // e.g., "2025-11-19T14:32:00Z"
}

// All user interactions are emitted through a single action object.
// Examples:
// - { type: "select_vendor", payload: { itemId: "water-tabs-50ct", vendorId: "rei", link: "https://..." } }
// - { type: "change_sort", payload: { sortBy: "eta" } }
// - { type: "refresh_prices", payload: { itemId: "water-tabs-50ct" } }
type VendorPriceFinderAction =
  | {
      type: "select_vendor";
      payload: { itemId: string; vendorId: string; link: string };
    }
  | {
      type: "change_sort";
      payload: { sortBy: "price" | "eta" };
    }
  | {
      type: "refresh_prices";
      payload: { itemId: string };
    };