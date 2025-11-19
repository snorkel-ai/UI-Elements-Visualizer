interface VendorResultsViewProps {
  // Shortlisted vendors to display alongside the map and availability matrix
  vendors: VendorListItem[];

  // Single date to highlight/check (ISO 8601, e.g., "2025-10-04")
  selectedDate: string;

  // Optional inclusive range for quick availability sweeps (ISO 8601)
  // Example: { start: "2025-10-01", end: "2025-10-07" }
  dateRange?: { start: string; end: string };

  // Sorting applied to the visible list/map
  // "price" = ascending by startingPrice, "rating" = desc, "distance" = nearest to mapCenter
  sortBy?: "price" | "rating" | "distance";

  // Optional map center override; if omitted, component centers based on vendor cluster (NYC by default for this scenario)
  mapCenter?: { lat: number; lng: number };

  // Single action object used for interactions from list or map
  // The component will emit this action with a payload including the vendorId and intent
  // Example emitted action at runtime:
  // { type: "vendor_results_interaction", payload: { intent: "open_contact", vendorId: "ven_123" } }
  interactionAction: VendorResultsInteractionAction;
}

// Minimal vendor item for cards + map markers
interface VendorListItem {
  id: string; // Stable unique id (e.g., "ven_123")
  name: string; // Display name (e.g., "Jane Doe Photography")
  startingPrice: number; // In USD; lowest advertised package (e.g., 2500)
  rating?: number; // 0–5, optional if not available
  styles: string[]; // e.g., ["documentary", "candid"]
  location: VendorLocation; // For map marker and neighborhood label
  // Keyed by ISO date string, e.g., { "2025-10-04": "available" }
  availabilityByDate: Record<string, AvailabilityStatus>;
  imageUrl: string; // Representative portfolio image (cover) for the card
}

// Basic geographic + neighborhood info for the map and card subtitle
interface VendorLocation {
  lat: number;
  lng: number;
  neighborhood?: string; // e.g., "Williamsburg"
}

type AvailabilityStatus = "available" | "waitlist" | "booked";

// Action object pattern (no callbacks). The component will dispatch this with runtime payload.
// Consumers listen to app-level actions and route accordingly.
interface VendorResultsInteractionAction {
  type: "vendor_results_interaction";
  // The component fills these when a user interacts (selects, hovers, or opens contact)
  // intent:
  // - "select_vendor": selecting a card/marker
  // - "open_contact": pressing the contact CTA on a card
  // - "hover_vendor": hovering a card/marker to sync highlight with the map
  payload?: {
    intent: "select_vendor" | "open_contact" | "hover_vendor";
    vendorId?: string;
  };
}

interface VendorCardProps {
  id: string; // Unique vendor ID, e.g., "ven_abc123"
  name: string; // Display name, e.g., "Light & Grain Photography"

  // Price chip: "From $2,800". Provide numeric amount and currency code.
  // Use whole currency units (not cents). Example: startingPrice: 2800, currency: "USD"
  startingPrice: number;
  currency?: string; // Default: "USD". Example: "USD", "GBP"

  // Style chips shown on the card, e.g., ["Documentary", "Candid"]
  styles: string[];

  // Neighborhood or short location text, e.g., "Williamsburg" or "Upper West Side"
  neighborhood?: string;

  // Rating snippet. value: 0–5 (decimals ok). count: number of reviews.
  rating?: {
    value: number; // Example: 4.8
    count?: number; // Example: 112
  };

  // Portfolio carousel images (3–6 URLs). First image is used as the lead.
  // Example: ["https://cdn.example.com/p1.jpg", "https://.../p2.jpg"]
  portfolioImages: string[];

  // Availability by ISO date string for the requested comparison window.
  // Keys: "YYYY-MM-DD". Values: availability status.
  // Example: { "2025-10-04": "available", "2025-10-05": "unavailable" }
  availabilityByDate?: Record<string, "available" | "unavailable" | "limited">;

  // Dates the user is comparing (drives the AvailabilityMatrix columns).
  // Example: ["2025-10-04", "2025-10-05", "2025-10-06"]
  requestedDates?: string[];

  // Optional date to visually emphasize (e.g., the target wedding date: "2025-10-04").
  primaryDate?: string;

  // Primary CTA as an action object (opens contact link/modal).
  // Include vendorId and optionally a preferred date to prefill inquiry context.
  onContactAction: {
    type: "open_contact";
    vendorId: string; // Should match id
    preferredDate?: string; // ISO date, e.g., "2025-10-04"
  };
}

// Reusable image carousel for vendor cards and galleries in the Wedding Vendor Tracker.
// Shows portfolio images, supports swipe, next/prev, and opening a lightbox via action objects.

interface ImageCarouselProps {
  images: ImageItem[]; 
  // Primary data. Example:
  // [{ imageUrl: "/imgs/photog-a/01.jpg", alt: "Candid couple laughing", caption: "Documentary style" }]

  initialIndex?: number; 
  // Starting image index (0-based). Default: 0

  fit?: "cover" | "contain" | "natural"; 
  // How images should fit their frame in cards: 
  // - "cover" for edge-to-edge crops (recommended for vendor cards)
  // - "contain" to letterbox/pillarbox
  // - "natural" to show original size within bounds

  showThumbnails?: boolean; 
  // If true, renders a small thumbnail strip for quick navigation. Default: false

  showIndicators?: boolean; 
  // If true, shows dot indicators for the number of images. Default: true

  loop?: boolean; 
  // If true, next from last returns to first (and prev from first goes to last). Default: true

  swipeDirection?: "horizontal" | "vertical" | "none"; 
  // Touch/trackpad gesture direction. Default: "horizontal"

  autoplayMs?: number; 
  // Auto-advance interval in ms (e.g., 4000). Omit or set to 0 to disable. Default: disabled

  // Actions (dispatched on user interactions). These are objects, not callbacks.
  nextAction?: NextImageAction; 
  // Dispatched when the user requests the next image (button, swipe end).

  prevAction?: PrevImageAction; 
  // Dispatched when the user requests the previous image.

  selectAction?: SelectImageAction; 
  // Dispatched when a specific image is selected (e.g., via thumbnail or indicator).

  imageClickAction?: OpenLightboxAction; 
  // Dispatched when the main image is clicked/tapped (commonly to open a lightbox).
}

// Typed data items for the carousel

interface ImageItem {
  imageUrl: string; 
  // Absolute or relative URL to the image asset

  alt: string; 
  // Required accessible text, e.g., "Couple exits City Hall with confetti"

  caption?: string; 
  // Optional short caption, e.g., "NYC documentary set"

  thumbnailUrl?: string; 
  // Optional URL for a smaller/faster thumbnail (used when showThumbnails=true)

  sourceAttribution?: string; 
  // Optional credit, e.g., "Photo: Studio Lumiere"
}

// Action objects (not functions)

type ImageCarouselAction = NextImageAction | PrevImageAction | SelectImageAction | OpenLightboxAction;

interface NextImageAction {
  type: "next_image";
  // Optional context for analytics/routing
  vendorId?: string; 
  // e.g., "vendor_123" to attribute the action to the specific photographer card
}

interface PrevImageAction {
  type: "prev_image";
  vendorId?: string;
}

interface SelectImageAction {
  type: "select_image";
  index: number; 
  // Target image index to navigate to
  vendorId?: string;
}

interface OpenLightboxAction {
  type: "open_lightbox";
  imageIndex?: number; 
  // If omitted, use currently active index
  vendorId?: string;
  // Optional deep-link or context for lightbox
  lightboxId?: string; 
  // e.g., "vendor_123_portfolio"
}

interface AvailabilityDay {
  // ISO 8601 date string (YYYY-MM-DD). Example: "2025-10-04"
  dateISO: string;
  // Booking status for the date
  status: "available" | "waitlist" | "booked";
}

interface AvailabilityMatrixProps {
  // Unique vendor identifier (e.g., photographer ID)
  id: string;

  // Display name for the vendor shown alongside the matrix
  vendorName: string;

  // Starting package/collection price in USD (used for quick comparison like "under $3k")
  // Example: 2500
  startingPriceUSD: number;

  // Compact list of dates and their availability for this vendor
  // Typically 7–30 days, but can be any small range relevant to the user’s query
  // Example: [{ dateISO: "2025-10-03", status: "waitlist" }, { dateISO: "2025-10-04", status: "available" }]
  availability: AvailabilityDay[];

  // Emphasize a specific date in the grid (e.g., wedding date Oct 4)
  // Example: "2025-10-04"
  highlightDateISO?: string;

  // If true, only show dates where status === "available" when a date is selected upstream
  // Parent can toggle this to implement the "show only vendors available on selected date" quick filter
  // Default: false
  showOnlyAvailableOnSelected?: boolean;

  // Optional labels used for tooltips/legend per status; if omitted, sensible defaults may be used
  // Example: { available: "Open to book", waitlist: "Limited – inquire", booked: "Not available" }
  statusLabels?: {
    available: string;
    waitlist: string;
    booked: string;
  };

  // Fired when a date cell is selected in the matrix
  // The renderer should dispatch this action to the host/controller
  // Example: { type: "select_date", payload: { vendorId: "v_123", dateISO: "2025-10-04" } }
  onSelectDateAction: {
    type: "select_date";
    payload: {
      vendorId: string;
      dateISO: string; // ISO 8601 date string
    };
  };
}

interface VendorMapProps {
  vendors: VendorMapItem[]; 
  // Array of vendors to plot as markers.
  // Example:
  // [
  //   { id: "v1", name: "Lens & Love", lat: 40.7128, lng: -74.0060, startingPrice: 2500, primaryStatusForSelectedDate: "available", logoUrl: "https://..." },
  //   { id: "v2", name: "Candid Co.", lat: 40.7306, lng: -73.9352, startingPrice: 2900, primaryStatusForSelectedDate: "limited" }
  // ]

  selectedVendorId?: string | null; 
  // If set, highlights the corresponding marker and ensures its tooltip content is shown.

  selectedDate?: string; 
  // ISO date (YYYY-MM-DD). Used for labeling tooltips/legend.
  // Note: availability for this date should be provided on each vendor as primaryStatusForSelectedDate.

  mapProvider: "mapbox" | "google" | "leaflet" | "custom"; 
  // Which map backend to use. "custom" for internally wired providers.

  initialCenter?: { lat: number; lng: number }; 
  // Starting map center. If omitted, derived from vendors' bounding box.

  initialZoom?: number; 
  // Starting zoom level (e.g., 10 for city-level).

  enableClustering?: boolean; 
  // Default true for dense vendor sets; clusters markers and supports expand-on-click.

  disableScrollZoom?: boolean; 
  // If true, map will not zoom on wheel/trackpad (useful for scroll-heavy pages).

  markerHoverAction?: { type: "hover_vendor_marker" }; 
  // Dispatched when a marker is hovered or unhovered.
  // Component augments with: { vendorId: string } on hover and { vendorId: null } on leave.

  markerClickAction?: { type: "select_vendor" }; 
  // Dispatched when a marker is clicked.
  // Component augments with: { vendorId: string } to focus/open matching VendorCard.

  viewportChangeAction?: { type: "map_viewport_change" }; 
  // Dispatched on pan/zoom.
  // Component augments with: { center: {lat:number; lng:number}, zoom: number, bounds?: MapBounds }

  clusterExpandAction?: { type: "expand_cluster" }; 
  // Dispatched when a cluster is expanded.
  // Component augments with: { clusterId?: string | number, center?: {lat:number; lng:number}, zoom?: number }
}

/* Supporting types */

type AvailabilityStatus = "available" | "limited" | "unavailable" | "unknown";
// "available"   -> green chip on hover
// "limited"     -> amber chip
// "unavailable" -> red chip
// "unknown"     -> gray chip (no data)

interface VendorMapItem {
  id: string;              // Unique vendor id; used to link with VendorCard
  name: string;            // Display name in tooltip
  lat: number;             // WGS84 latitude
  lng: number;             // WGS84 longitude
  startingPrice: number;   // Minimum package price (assumed in USD unless your app sets a global currency)
  primaryStatusForSelectedDate: AvailabilityStatus; // Availability for the selected date
  logoUrl?: string;        // Optional small logo/avatar used in tooltip
}

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface SearchFiltersBarProps {
  // Primary identifiers
  id: string; // Unique ID for this filter bar instance (e.g., "filters-photographers-nyc")
  name: string; // Short label for analytics/telemetry (e.g., "Search Filters")
  title: string; // Visible heading if rendered (e.g., "Refine Photographers")

  // Key filter fields
  selectedDate: string; // ISO date string; default expected: "2025-10-04" (Oct 4). Example: "2025-10-04"
  budgetMax: number; // Max budget in minor units of 'currency'? No—use major units. Default: 3000 (USD)
  style:
    | "Any"
    | "Documentary"
    | "Editorial"
    | "Traditional"
    | "Fine Art"
    | "Photojournalistic"
    | "Candid"
    | "Lifestyle"; // Default: "Documentary" per scenario
  borough: "Any" | "Manhattan" | "Brooklyn" | "Queens" | "Bronx" | "Staten Island"; // Default: "Any"
  sortBy: "price" | "rating" | "distance"; // Sort order for results

  // Single action object for all interactions (apply/clear/auto changes)
  onFiltersChangeAction: {
    type: "update_search_filters";
    // Payload mirrors current filter state; 'source' indicates user intent
    payload: {
      selectedDate: string; // e.g., "2025-10-04"
      budgetMax: number; // e.g., 3000
      style:
        | "Any"
        | "Documentary"
        | "Editorial"
        | "Traditional"
        | "Fine Art"
        | "Photojournalistic"
        | "Candid"
        | "Lifestyle";
      borough: "Any" | "Manhattan" | "Brooklyn" | "Queens" | "Bronx" | "Staten Island";
      sortBy: "price" | "rating" | "distance";
      source: "apply" | "clear" | "auto"; // "apply" when user confirms, "clear" when user resets, "auto" for immediate updates (e.g., slider/date)
    };
  };

  // Optional configuration
  currency?: "USD" | "EUR" | "GBP" | "CAD" | "AUD"; // Display currency for budget; default: "USD"
  maxBudgetLimit?: number; // Upper bound for the budget control (e.g., 10000)
}