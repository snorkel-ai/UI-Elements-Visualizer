interface VehicleCarouselProps {
  title: string; // e.g., "Recommended Mid‑Size SUVs"
  items: SuvCard[]; // Cards rendered in the carousel; order determines slide order
  initialIndex?: number; // Starting slide index (0-based). Default: 0
  loop?: boolean | "clamp" | "wrap"; 
  // true/"wrap": continue from end to start; "clamp": stop at ends; false: no looping. Default: "clamp"

  snapAlign?: "center" | "start"; 
  // How each card snaps in the viewport. "center" recommended for galleries

  lazyLoadImages?: boolean; 
  // If true, images in cards should be loaded lazily (defer offscreen). Default: true

  navigation?: {
    arrows?: boolean; // Show previous/next arrows. Default: true on desktop, false on touch
    dots?: boolean; // Pagination dots. Default: false
    swipe?: boolean; // Touch/trackpad swipe support. Default: true
  };

  // Actions emitted by interactions (use action objects, not callbacks)
  onSlideChangeAction?: { type: "carousel_slide_change"; index: number }; 
  // Emitted when the active slide changes

  onReachEndAction?: { type: "carousel_reach_end" }; 
  // Emitted when user scrolls to last item (useful to trigger loading more)

  onSelectVehicleAction?: { type: "select_vehicle"; vehicleId: string }; 
  // Emitted when user selects a card (e.g., taps it or presses a primary button)

  onRequestMoreAction?: { type: "request_more_results" }; 
  // Emitted when a "See more" affordance is activated or end is reached and more are needed

  ariaLabel?: string; 
  // Accessibility label for the carousel region, e.g., "Mid-size SUV recommendations"
}

/**
 * Represents a single SUV card shown in the carousel.
 * Keep fields focused on shopping context: seats, cargo, MPG, price, reviews, and purchase paths.
 */
interface SuvCard {
  id: string; // Stable unique id, e.g., "toyota-rav4-2025-xle-awd"
  name: string; // Display name, e.g., "2025 Toyota RAV4 XLE (AWD)"
  imageUrl: string; // Primary hero image for the card (3:2 or 16:9 preferred)
  galleryImageUrls?: string[]; // Optional additional images shown when the card is focused

  seats: number; // Total seating capacity, e.g., 5
  cargoVolumeCuFt: number; // Rear cargo volume in cubic feet, seats up, e.g., 37.6
  mpg: {
    city: number; // e.g., 27
    highway: number; // e.g., 35
    combined: number; // e.g., 30
  };

  priceUSD: number; // MSRP or typical market price in USD, e.g., 31990
  priceDisclaimer?: string; // e.g., "MSRP shown; excludes destination, taxes, and fees"

  reviewSummary?: {
    rating: number; // Average rating 0–5 (half steps allowed), e.g., 4.6
    reviewCount: number; // Total number of user reviews, e.g., 1243
    source?: "platform" | "edmunds" | "kbb" | "cars_com" | "dealer"; // Optional provenance
  };

  powertrain?: "gas" | "hybrid" | "plug_in_hybrid" | "electric"; // For quick badges
  drivetrain?: "fwd" | "rwd" | "awd" | "4wd";
  availability?: "in_stock" | "limited" | "preorder"; // For CTA states

  ctas?: {
    buyNewUrl?: string; // Deep-link to purchase flow
    buildAndPriceUrl?: string; // OEM configurator
    findDealerUrl?: string; // Dealer locator
    detailsUrl?: string; // Full model details/specs page
  };
  // Optional quick tags that can be rendered as small badges or metadata lines
  tags?: string[]; // e.g., ["Top Safety Pick", "Wireless CarPlay"]
}

interface SuvCardProps {
  // Unique identifier for the specific model/trim shown in this card.
  // Example: "rav4-2025-xle-awd"
  id: string;

  // Marketing/display name of the model.
  // Example: "Toyota RAV4"
  modelName: string;

  // Optional trim or package label shown under/next to the model name.
  // Example: "XLE AWD"
  trim?: string;

  // HTTPS URL for the primary image of the SUV (ideally 3:2 or 4:3 aspect).
  // Example: "https://cdn.example.com/cars/rav4-2025-xle.jpg"
  imageUrl: string;

  // Number of seats available in this configuration.
  // Example: 5 or 7
  seats: number;

  // Cargo volume in cubic feet with rear seats up (manufacturer stated).
  // Example: 37.5
  cargoVolumeCuFt: number;

  // EPA combined MPG (or WLTP equivalent where applicable).
  // Range example: 15–50; decimals allowed (e.g., 30.5).
  mpgCombined: number;

  // Starting MSRP in USD for this configuration (before taxes/fees).
  // Example: 28995
  priceFromUSD: number;

  // Average user rating on a 0–5 scale. Clamp to [0, 5]. Decimals allowed (e.g., 4.6).
  rating: number;

  // Total count of user reviews contributing to the rating.
  // Example: 1243
  reviewCount: number;

  // Optional density for layout. "compact" reduces text lines/margins;
  // default is "standard" if omitted.
  variant?: "compact" | "standard";

  // Primary CTA: dispatch this action when the user taps "Purchase" / "Buy Now".
  // The consumer of this component should handle routing, checkout, etc.
  // Example:
  // { type: "purchase_vehicle", payload: { modelId: "rav4-2025-xle-awd" } }
  onPurchaseAction: {
    type: "purchase_vehicle";
    payload: { modelId: string };
  };
}

interface PreferenceFilterValues {
  // Minimum number of seats desired (e.g., 5 or 7). Whole numbers only.
  minSeats?: number;

  // Minimum cargo capacity in cubic feet (e.g., 30 for 30 cu ft behind 2nd row).
  minCargoCuFt?: number;

  // Minimum combined MPG (e.g., 28). Use whole number or one decimal place.
  minMpg?: number;

  // Price range in USD as [min, max]. Example: [30000, 55000].
  // Use 0 or undefined min/max to represent open-ended bounds if needed.
  priceRangeUSD?: [number, number];
}

type PreferenceSortBy = "relevance" | "price" | "mpg" | "seats" | "cargo";

interface PreferenceFiltersProps {
  // Unique identifier for this filter instance (e.g., session or component ID).
  id: string;

  // Short internal/display name for the filter set (e.g., "SUV Filters").
  name: string;

  // Title shown to the user (e.g., "Refine SUVs").
  title: string;

  // Current filter values. Omit fields the user has not set yet.
  filters: PreferenceFilterValues;

  // Sorting applied to results. Default: "relevance".
  sortBy: PreferenceSortBy;

  // Dispatch-style action emitted when filters or sort change (live updates after debounce).
  // Example:
  // {
  //   type: "update_filters",
  //   payload: {
  //     filters: { minSeats: 5, minCargoCuFt: 30, minMpg: 28, priceRangeUSD: [30000, 55000] },
  //     sortBy: "mpg",
  //     source: "live"
  //   }
  // }
  onChangeAction: {
    type: "update_filters";
    payload: {
      filters: PreferenceFilterValues;
      sortBy?: PreferenceSortBy;
      // Optional origin of the update (e.g., user typing vs. clearing all).
      source?: "live" | "clear_all";
    };
  };

  // Optional action to clear all filters back to defaults.
  // Example: { type: "clear_all_filters" }
  clearAllAction?: { type: "clear_all_filters" };

  // Debounce interval in milliseconds for live updates. Typical: 250–400ms. Default: 300.
  debounceMs?: number;
}

interface CompareModalProps {
  // The list of vehicles to compare side-by-side (2–4 items recommended).
  vehicles: CompareVehicle[];

  // Fired when the user taps/clicks a vehicle row to see more details.
  // Example: { type: "open_vehicle_details", payload: { modelId: "crv-2025-exl-awd" } }
  onViewDetailsAction: {
    type: "open_vehicle_details";
    payload: { modelId: string };
  };

  // Fired when the user removes a vehicle from the comparison.
  // Example: { type: "remove_vehicle_from_compare", payload: { modelId: "rav4-2025-xle" } }
  onRemoveVehicleAction: {
    type: "remove_vehicle_from_compare";
    payload: { modelId: string };
  };

  // Fired when the user closes the compare modal (e.g., Close button or backdrop).
  // Example: { type: "close_compare_modal" }
  onCloseAction?: {
    type: "close_compare_modal";
  };

  // Optional: Which metrics to visually emphasize for this user.
  // Defaults: ["seats", "cargoVolumeCuFt", "mpgCombined"]
  highlightMetrics?: Array<"seats" | "cargoVolumeCuFt" | "mpgCombined">;

  // Optional: Currency code for price display (affects label/formatting only).
  // Default: "USD"
  // Example: "USD", "CAD"
  currencyCode?: string;

  // Optional: Upper bound for how many vehicles can be compared at once.
  // Default: 4
  maxItems?: number;
}

interface CompareVehicle {
  // Unique identifier for the model+trim to enable actions and removal.
  // Example: "crv-2025-exl-awd"
  modelId: string;

  // Human-readable model name.
  // Example: "Honda CR‑V"
  modelName: string;

  // Optional trim/package designation.
  // Example: "EX-L AWD"
  trim?: string;

  // Starting price in whole currency units (e.g., 32995 means $32,995).
  // Use currencyCode in props to format for display.
  priceFrom: number;

  // Key comparison metrics for this shopping flow:
  // Total seating capacity (e.g., 5 or 7).
  seats: number;

  // Cargo volume in cubic feet (max configuration, behind first row if applicable).
  // Example: 76.5
  cargoVolumeCuFt: number;

  // EPA combined MPG.
  // Example: 30
  mpgCombined: number;

  // Average user rating on a 0–5 scale.
  // Example: 4.6
  rating?: number;

  // Optional image for quick visual identification of the vehicle.
  // Example: "https://cdn.example.com/vehicles/crv-2025-exl.jpg"
  imageUrl?: string;
}

interface PurchaseOptionsSheetProps {
  // Unique identifier for the vehicle model
  // Example: "crv-2025-ex"
  modelId: string;

  // Human-readable model name
  // Example: "2025 Honda CR-V EX"
  modelName: string;

  // Starting price (USD). Use whole number cents avoided; decimals permitted if needed.
  // Example: 28995
  priceFromUSD: number;

  // Short sentence describing current offers/rebates.
  // Example: "Up to $1,000 loyalty cash + $500 college grad bonus"
  incentivesSummary?: string;

  // Annual Percentage Rate for financing, as a percentage (not decimal fraction).
  // Example: 2.9 means 2.9% APR
  financingAPR?: number;

  // Current availability state for this model/trim
  availability: 'in-stock' | 'preorder' | 'custom-order';

  // Optional hero image for the sheet
  // Example: "https://cdn.example.com/vehicles/crv-2025-ex-blue.png"
  imageUrl?: string;

  // Primary actions rendered as buttons in the sheet.
  // Provide 1–3 actions in priority order.
  // Each action carries enough payload for the consumer app to route/handle the flow.
  primaryActions: PurchaseAction[];

  // Optional: currency display override. Defaults to "USD".
  // Use ISO 4217 codes. Example: "USD", "CAD"
  currencyCode?: string;
}

// Action objects for the primary actions in the sheet.
type PurchaseAction =
  | {
      type: 'buy-now';
      // Minimal payload to initiate a purchase flow
      payload: {
        modelId: string; // Should match props.modelId
        trimId?: string; // Optional: specific trim/variant
        dealerId?: string; // Optional: preselected dealer
      };
    }
  | {
      type: 'contact-dealer';
      // Route to dealer contact form or handoff to chat/call
      payload: {
        modelId: string; // Should match props.modelId
        dealerId?: string;
        preferredContact?: 'phone' | 'email';
        zip?: string; // Optional: for dealer matching
      };
    }
  | {
      type: 'schedule-test-drive';
      // Start a scheduler flow for a test drive
      payload: {
        modelId: string; // Should match props.modelId
        dealerId?: string;
        zip?: string;
        // Optionally pre-fill scheduling constraints
        earliestDateISO?: string; // Example: "2025-03-15"
      };
    };

interface RatingBadgeProps {
  // Average user rating for the vehicle/listing.
  // Range: 0 to 5 (decimals allowed, e.g., 4.5)
  // Example: 4.3
  rating: number;

  // Total number of user reviews that the rating is based on.
  // Non-negative integer.
  // Example: 128
  reviewCount: number;

  // Size of the badge for use inside cards/lists.
  // Default: 'md'
  // 'sm' for tight list rows, 'lg' for prominent cards.
  size?: 'sm' | 'md' | 'lg';

  // Action to open the reviews section when the badge is clicked/tapped.
  // Include the associated listingId to route to the correct vehicle's reviews.
  // Example: { type: "open_reviews", listingId: "suv-outback-2025-premium", source: "card" }
  onOpenReviewsAction?: {
    type: 'open_reviews';
    listingId: string; // e.g., "suv-forester-2025-limited"
    source?: 'card' | 'list' | 'details'; // Optional analytics/context
  };
}