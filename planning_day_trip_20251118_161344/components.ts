interface NeighborhoodComparisonDashboardProps {
  // City context and currency for calculations and labels
  cityName: string; // e.g., "Lisbon"
  tripDurationDays: number; // e.g., 5
  currency: "EUR" | "USD" | "GBP" | string; // ISO 4217 code, defaults handled by app logic

  // Primary data: two or more neighborhoods to compare side-by-side
  neighborhoods: NeighborhoodCostItem[]; // Expect at least ["Alfama", "Bairro Alto"] for initial view

  // Optional user budget to show fit indicators and color scales on bars/cards
  userBudgetPerDay?: number; // e.g., 120 (in currency above)

  // Visual behavior of the bar chart portion
  chartVariant?: "totalRange" | "categoryStacked"; 
  // "totalRange": show min–max daily total per neighborhood
  // "categoryStacked": stack average category costs (lodging/food/transport/misc) per day

  // Map configuration (markers are derived from neighborhoods[].coordinates)
  map?: {
    provider: "mapbox" | "osm" | "google";
    center?: Coordinates; // Defaults to centroid of provided neighborhoods
    zoom?: number; // e.g., 13
  };

  // Current interaction state (controlled by parent)
  selectedNeighborhoodId?: string; // The neighborhood currently "selected" (locks highlight, syncs card/map/chart)
  highlightedNeighborhoodId?: string; // Transient hover highlight (card, marker, or bar)

  // Recommendation badge displayed atop the better-value card
  recommendation?: {
    neighborhoodId: string; // e.g., "alfama"
    label: string; // e.g., "Best Value"
    reason?: string; // e.g., "Lower lodging + easy transit access"
    iconUrl?: string; // Optional badge icon
    valueScore?: number; // 0–100 normalized score to display in badge or tooltip
  };

  // Action objects emitted on interactions (no function callbacks)
  // Implementations should dispatch these with neighborhoodId filled in by the component at runtime
  onSelectAction?: { type: "select_neighborhood"; neighborhoodId?: string }; // Triggered on card click, bar click, or marker click
  onHoverAction?: { type: "hover_neighborhood"; neighborhoodId?: string | null }; // Fired on mouse enter/leave across any subcomponent
  onRecommendAction?: { type: "apply_recommendation"; neighborhoodId: string }; // Fired when user accepts the recommendation badge/CTA
}

/* ----- Supporting Types ----- */

interface NeighborhoodCostItem {
  id: string; // slug/id, e.g., "alfama"
  name: string; // display name, e.g., "Alfama"
  imageUrl?: string; // header image for card
  coordinates: Coordinates; // used for map marker
  // Daily cost ranges in the target currency; values are per person per day unless noted
  dailyCosts: {
    lodging: CostRange; // e.g., hostel/hotel average per person share; or per room if app-standard
    food: CostRange; // meals + coffee/snacks
    transport: CostRange; // local transport passes/tickets or rideshares
    misc?: CostRange; // attractions, nightlife, tips (optional)
  };
  notes?: string; // short descriptor, e.g., "Historic district with fado venues"
}

interface CostRange {
  min: number; // minimum expected daily spend
  max: number; // maximum expected daily spend
  // Note: All values should be in the 'currency' specified in the root props
}

interface Coordinates {
  lat: number; // e.g., 38.711
  lng: number; // e.g., -9.126
}

interface NeighborhoodCostCardProps {
  // Unique identifier for linking card interactions to map/chart selections
  // Example: "alfama", "bairro_alto"
  id: string;

  // Internal/slug name for the neighborhood (no spaces is fine)
  // Example: "Alfama"
  name: string;

  // Display title for the card header
  // Example: "Alfama Neighborhood"
  title: string;

  // Per-day cost breakdown for this neighborhood
  // All values should be in the specified currency (see `currency`)
  // Example:
  // {
  //   lodgingPerDay: 95.5,   // average nightly accommodation cost
  //   foodPerDay: 38,        // meals, snacks, coffee
  //   transportPerDay: 6.5   // public transit, rideshare share
  // }
  costBreakdown: {
    lodgingPerDay: number;
    foodPerDay: number;
    transportPerDay: number;
  };

  // Sum of the above per-day costs, after any adjustments or rounding rules
  // Example: 140.0
  totalEstimatedDailyCost: number;

  // ISO 4217 currency code for all monetary fields
  // Example: "EUR" (Lisbon), "USD", "GBP"
  currency: string;

  // Whether this neighborhood is the recommended option (shows a badge/variant)
  // Example: true if Alfama is recommended for a 5-day trip
  isRecommended?: boolean;

  // Action object dispatched when the card is selected (click/tap/keyboard)
  // Use this to sync selection state with map markers and bar chart
  // Example:
  // {
  //   type: "select_neighborhood",
  //   payload: { id: "alfama" }
  // }
  onSelectAction: {
    type: "select_neighborhood";
    payload: {
      id: string;
      // Optional extra context if needed by the consumer
      name?: string;
    };
  };
}

interface CostRangeBarChartProps {
  // Primary data for each neighborhood's expected daily cost range
  items: CostRangeItem[]; 
  // Currency code for all values (ISO 4217), e.g., "EUR", "USD"
  currency: string; 

  // Visual variant of the range bar:
  // - "minMaxBar": a single bar showing min–max
  // - "rangeWithSegments": shows min–max plus internal segments from breakdown when available
  variant?: "minMaxBar" | "rangeWithSegments";

  // Controls numeric formatting in axis/labels/tooltips
  // - "currency": uses the provided `currency`
  // - "number": plain number (no currency symbol)
  // - { type: "custom", pattern: "€0,0" } for custom patterns (implementation-dependent)
  valueFormat?: "currency" | "number" | { type: "custom"; pattern: string };

  // Currently selected neighborhood id to highlight and sync with cards/map (e.g., "alfama")
  selectedId?: string | null;

  // Currently hovered neighborhood id for soft highlight (e.g., "bairro_alto")
  hoveredId?: string | null;

  // Action dispatched when a user selects a bar (component fills neighborhoodId on interaction)
  // Example emitted action: { type: "select_neighborhood", neighborhoodId: "alfama" }
  onBarSelectAction?: { type: "select_neighborhood"; neighborhoodId?: string };

  // Action dispatched when a user hovers/unhovers a bar
  // Example emitted actions:
  // - hover: { type: "hover_neighborhood", neighborhoodId: "bairro_alto" }
  // - unhover: { type: "hover_neighborhood", neighborhoodId: null }
  onBarHoverAction?: { type: "hover_neighborhood"; neighborhoodId?: string | null };

  // Optional horizontal reference line for a target or budget (daily amount in same currency)
  // Example: 140 draws a line at €140/day
  referenceDailyBudget?: number;

  // Sorting of bars:
  // - "inputOrder": preserves given order
  // - "asc"/"desc": sorts by mid-point of range
  // - "byMin"/"byMax": sorts by min or max value respectively
  sorting?: "inputOrder" | "asc" | "desc" | "byMin" | "byMax";

  // Accessible title/description for screen readers (e.g., "Daily cost ranges by neighborhood in Lisbon")
  accessibilityTitle: string;

  // Enables tooltips on hover/tap showing min–max and optional breakdown
  showTooltips?: boolean;
}

// Data item representing one neighborhood’s daily cost range
interface CostRangeItem {
  // Unique stable id used for selection/hover sync across components
  id: string; // e.g., "alfama"
  // Display name
  label: string; // e.g., "Alfama"
  // Inclusive expected minimum daily cost for the stay (same currency as props.currency)
  minDaily: number; // e.g., 95
  // Inclusive expected maximum daily cost for the stay (same currency as props.currency)
  maxDaily: number; // e.g., 160

  // Optional small icon for the neighborhood (map pin, crest, or photo thumbnail)
  iconUrl?: string;

  // Optional emphasis tag to visually badge the bar or tooltip
  // "recommended": preferred choice; "budget": most affordable; "premium": higher-end area
  emphasisTag?: "recommended" | "budget" | "premium";

  // Optional median/typical daily breakdown used in tooltips or segment rendering
  // Values should sum approximately to a representative daily total (not strictly enforced)
  breakdown?: {
    lodging?: number;   // e.g., 70
    food?: number;      // e.g., 45
    transport?: number; // e.g., 12
  };
}

interface NeighborhoodMapProps {
  neighborhoods: NeighborhoodItem[]; 
  // Primary data. Example: 
  // [{ id: "alfama", name: "Alfama", centroid: { lat: 38.712, lng: -9.130 }, 
  //    averageDailyCost: 145, cost: { lodgingPerNight: 95, foodPerDay: 35, transportPerDay: 15 },
  //    markerIconUrl: "https://cdn.example.com/icons/alfama.png", photoUrl: "https://cdn.example.com/photos/alfama.jpg" }]

  currencyCode: string; 
  // ISO 4217 currency (e.g., "EUR", "USD"). All numeric costs are interpreted in this currency.

  compareIds?: [string, string]; 
  // Exactly two neighborhood IDs to emphasize in side-by-side cards and the bar chart. 
  // Example: ["alfama", "bairro_alto"]

  initialSelectedId?: string; 
  // Neighborhood ID to pre-select on first render (highlights marker, card, and chart bar). 
  // Should match one of the neighborhoods[].id

  budgetPerDay?: number; 
  // Optional user budget used to compute a simple recommendation badge (e.g., "within budget"). 
  // Interpreted in currencyCode.

  mapStyle?: MapStyle; 
  // Visual map base layer. Examples: "streets" for OSM/standard, "satellite" for imagery.

  tileProviderUrl?: string; 
  // Tile URL template for the base map. Example: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  // Use if the app wants to control the map provider.

  showRecommendationBadge?: boolean; 
  // If true, show a badge highlighting the neighborhood with the lowest expected daily cost (or within budget).

  onSelectAction?: SelectNeighborhoodAction; 
  // Emitted when a marker/bar/card is clicked. Component sets neighborhoodId with the selected ID.
  // { type: "select_neighborhood", neighborhoodId?: string }

  onHoverAction?: HoverNeighborhoodAction; 
  // Emitted on marker/bar hover start and end. On hover start: neighborhoodId is set; on hover end: neighborhoodId may be undefined.
  // { type: "hover_neighborhood", neighborhoodId?: string }

  onMapLoadedAction?: MapLoadedAction; 
  // Fired after initial render with currently visible neighborhood IDs (useful for analytics or lazy-loading details).
  // { type: "map_loaded", visibleNeighborhoodIds: string[] }
}

type MapStyle = "streets" | "light" | "dark" | "satellite";

interface NeighborhoodItem {
  id: string; 
  // Stable identifier (slug). Example: "alfama"

  name: string; 
  // Display name. Example: "Alfama"

  centroid: { lat: number; lng: number }; 
  // Marker position (WGS84). Example: { lat: 38.712, lng: -9.130 }

  boundaryGeoJsonUrl?: string; 
  // Optional polygon outline for highlighting the neighborhood. URL to a GeoJSON file.

  averageDailyCost: number; 
  // Aggregate per-day cost for an average traveler (food + transport + proportion of lodging).

  cost: NeighborhoodCostBreakdown; 
  // Detailed breakdown to power the bar chart and cards.

  markerIconUrl?: string; 
  // Optional custom marker icon for the neighborhood.

  photoUrl?: string; 
  // Optional representative image for the neighborhood card.
}

interface NeighborhoodCostBreakdown {
  lodgingPerNight: number; 
  // Average nightly lodging cost for 1 room. Example: 95

  foodPerDay: number; 
  // Average daily spend on meals. Example: 35

  transportPerDay: number; 
  // Average daily local transportation cost (metro, tram, rideshare). Example: 15

  miscPerDay?: number; 
  // Optional daily extras (attractions, coffee, SIM card, etc.). Example: 10
}

interface SelectNeighborhoodAction {
  type: "select_neighborhood";
  neighborhoodId?: string; 
  // Component fills this when dispatching.
}

interface HoverNeighborhoodAction {
  type: "hover_neighborhood";
  neighborhoodId?: string; 
  // Set on hover enter; may be undefined on hover leave.
}

interface MapLoadedAction {
  type: "map_loaded";
  visibleNeighborhoodIds: string[]; 
  // IDs visible in initial viewport.
}

interface TripAssumptionsFormProps {
  // Unique component instance id (e.g., "trip-assumptions-lisbon-01")
  id: string;

  // Short form name for display in headers (e.g., "Trip Assumptions")
  name: string;

  // Contextual title (e.g., "Lisbon Cost Assumptions")
  title: string;

  // Total trip length in days (e.g., 5 for a 5-day trip)
  days: number;

  // Number of travelers included in estimates (e.g., 2 for a couple)
  travelers: number;

  // Meal preference tier guiding food cost assumptions
  // Allowed: "frugal" (groceries/street food), "local_eats" (cafes/tascas),
  // "midrange" (mix of cafes + 1 sit-down/day), "foodie" (frequent sit-downs/tasting menus)
  mealStyle: "frugal" | "local_eats" | "midrange" | "foodie";

  // Lodging choice guiding nightly rate assumptions
  // Allowed: "hostel", "budget_hotel", "apartment", "boutique_hotel", "business_hotel"
  lodgingType: "hostel" | "budget_hotel" | "apartment" | "boutique_hotel" | "business_hotel";

  // Primary in-destination transport preference guiding daily transport costs
  // Allowed: "walk_metro" (walk + metro/tram), "public_transit", "rideshare_taxi",
  // "rental_car", "mixed" (blend based on itinerary)
  transportChoice: "walk_metro" | "public_transit" | "rideshare_taxi" | "rental_car" | "mixed";

  // Dispatched when the user updates assumptions (on change or submit)
  // The UI should send the full current assumption set for deterministic recalculation
  onUpdateAssumptionsAction: {
    type: "update_trip_assumptions";
    payload: {
      id: string; // should match the component id
      days: number;
      travelers: number;
      mealStyle: "frugal" | "local_eats" | "midrange" | "foodie";
      lodgingType: "hostel" | "budget_hotel" | "apartment" | "boutique_hotel" | "business_hotel";
      transportChoice: "walk_metro" | "public_transit" | "rideshare_taxi" | "rental_car" | "mixed";
      // Optional: include destination context if needed by reducers (e.g., "Lisbon")
      destinationName?: string;
      // Optional: currency context for downstream cost components (e.g., "EUR")
      currencyCode?: string;
    };
  };
}