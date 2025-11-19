type NeighborhoodId = string;
type CategoryId = "walkability" | "crime" | "parks" | "coffeeShops";
type MapLayerId = "crime_heatmap" | "parks" | "cafes";

interface NeighborhoodSummary {
  id: NeighborhoodId;
  name: string; // e.g., "Capitol Hill"
  imageUrl?: string; // Optional header image for the scorecard
  tagline?: string; // Short descriptor, e.g., "Lively, transit-rich, dense cafés"
}

interface CategoryDefinition {
  id: CategoryId;
  label: string; // Display name, e.g., "Walkability"
  // Direction clarifies how to interpret scores. For crime, lower_is_better with normalized score.
  direction: "higher_is_better" | "lower_is_better";
  maxScore?: number; // Optional cap; scores typically normalized 0–100
}

interface NeighborhoodCategoryScores {
  neighborhoodId: NeighborhoodId;
  // Scores keyed by category; numbers are typically 0–100 (normalized)
  scores: Record<CategoryId, number>;
}

interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  name?: string; // e.g., "Volunteer Park" or "Espresso Vivace"
  value?: number; // Optional metric (e.g., rating, size)
}

interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number; // e.g., crime incident density weight
}

interface MapData {
  crimeHeatmap?: HeatmapPoint[]; // Used when layer = "crime_heatmap"
  parks?: MapPoint[]; // Used when layer = "parks"
  cafes?: MapPoint[]; // Used when layer = "cafes"
}

interface MapLayerDefinition {
  id: MapLayerId;
  label: string; // e.g., "Crime heatmap", "Parks", "Cafés"
  type: "heatmap" | "points";
  iconUrl?: string; // Small icon for the layer toggle
  initiallyVisible?: boolean;
}

interface GuideLink {
  id: string;
  title: string; // e.g., "Capitol Hill coffee guide"
  url: string; // Absolute URL to article or city page
  iconUrl?: string; // Source/site icon
  source?: "city" | "community" | "blog";
  neighborhoodId?: NeighborhoodId; // If specific to one neighborhood
}

interface MapViewport {
  center: { lat: number; lng: number };
  zoom: number; // e.g., 10–16 for city-scale
  // Optional bounding box if you want the component to fit content first:
  bounds?: { north: number; south: number; east: number; west: number };
}

interface NeighborhoodDashboardActions {
  // Dispatched when a layer toggle is clicked.
  // The component will add { layerId: MapLayerId, nextSelected: boolean } at runtime.
  toggleLayerAction: { type: "toggle_map_layer" };

  // Dispatched when a neighborhood is focused/highlighted across views.
  // The component will add { neighborhoodId: NeighborhoodId } at runtime.
  focusNeighborhoodAction: { type: "focus_neighborhood" };

  // Dispatched on score hover in the radar chart or scorecards.
  // The component will add { neighborhoodId?: NeighborhoodId, categoryId?: CategoryId, hovering: boolean } at runtime.
  hoverScoreAction?: { type: "hover_category_score" };

  // Dispatched when a guide card is clicked.
  // The component will add { guideId: string, url: string } at runtime.
  openGuideAction?: { type: "open_guide" };

  // Dispatched when a map item (park/café) is clicked.
  // The component will add { layerId: MapLayerId, itemId: string } at runtime.
  openMapItemAction?: { type: "open_map_item" };
}

interface NeighborhoodComparisonDashboardProps {
  // Two neighborhoods to compare, e.g., [{ id: "capitol_hill", name: "Capitol Hill" }, { id: "ballard", name: "Ballard" }]
  neighborhoods: NeighborhoodSummary[];

  // Definitions for categories shown in scorecards and radar chart (walkability, crime, parks, coffeeShops)
  categories: CategoryDefinition[];

  // Scores per neighborhood keyed by category. Example: { walkability: 92, crime: 28, parks: 80, coffeeShops: 88 }
  categoryScores: NeighborhoodCategoryScores[];

  // Spatial datasets powering map layers (crime heatmap, parks, cafés)
  mapData: MapData;

  // Layer toggles available to users (with type: heatmap | points)
  availableMapLayers: MapLayerDefinition[];

  // Currently selected/visible layers in the map. Example: ["crime_heatmap", "parks"]
  selectedLayerIds: MapLayerId[];

  // Curated guides for deeper exploration (can be neighborhood-specific or general)
  guideLinks: GuideLink[];

  // Optional: which neighborhood is initially highlighted across map and charts
  focusNeighborhoodId?: NeighborhoodId;

  // Optional: initial or controlled map viewport (center/zoom or bounds)
  mapViewport?: MapViewport;

  // Action templates describing what to dispatch on interactions (the component fills in dynamic fields at runtime)
  actions: NeighborhoodDashboardActions;
}

interface NeighborhoodScorecardProps {
  id: string; // Unique identifier for this scorecard instance (e.g., "capitol-hill")
  neighborhoodName: string; // Display name (e.g., "Capitol Hill")
  overallScore: number; // 0–100 composite score (e.g., 82)

  // Key category scores supporting quick comparison
  categoryScores: {
    walkability: number; // 0–100 (e.g., Walk Score normalized)
    safety: number; // 0–100 (higher = safer; derived from crime rates)
    parks: number; // 0–100 (park access/acreage proximity)
    cafes: number; // 0–100 (density/quality of coffee shops)
  };

  // Optional accent color for highlighting selection/group (e.g., "#3B82F6")
  highlightColor?: string;

  // Optional trend indicator to show recent movement or sparkline
  trendInfo?: {
    direction: "up" | "down" | "flat"; // Arrow/indicator direction
    sparkline?: number[]; // Optional mini-series for last N periods (e.g., [78,79,80,82])
    periodLabel?: string; // Human label for the sparkline window (e.g., "30d")
  };

  // Optional neighborhood image or icon (e.g., hero image or emblem)
  imageUrl?: string;

  // Primary interaction: selecting this neighborhood as the dashboard's main focus
  // Example:
  // {
  //   type: "set_primary_focus",
  //   payload: { neighborhoodId: "capitol-hill" }
  // }
  onSelectAction: {
    type: "set_primary_focus";
    payload: { neighborhoodId: string };
  };
}

interface AmenitiesMapProps {
  // Initial or controlled map viewport. Use either a center/zoom or a bounding box.
  viewport:
    | { type: "center_zoom"; center: [longitude: number, latitude: number]; zoom: number } // e.g., { type: "center_zoom", center: [-122.319, 47.620], zoom: 12 }
    | { type: "bounds"; bounds: [[westLng: number, southLat: number], [eastLng: number, northLat: number]] }; // e.g., { type: "bounds", bounds: [[-122.405, 47.58], [-122.28, 47.70]] }

  // Available map layers to show. The component renders toggles in this order and uses label for UI.
  availableLayers: Array<{
    id: LayerId; // "crime_heatmap" | "parks_pins" | "cafes_pins"
    label: string; // e.g., "Crime heatmap", "Parks", "Coffee shops"
    defaultVisible?: boolean; // For uncontrolled defaults; selectedLayers is the source of truth when provided
    legendImageUrl?: string; // Optional legend image per layer
  }>;

  // Currently selected (visible) layers. The component reads this to show/hide layers.
  // Example: ["crime_heatmap", "cafes_pins"]
  selectedLayers: LayerId[];

  // Primary data payload for all layers. Arrays can be empty when layer is not used.
  data: {
    // Individual police/crime incidents aggregated into a heatmap.
    crimePoints: CrimePoint[]; // e.g., [{ id: "c123", coordinates: [-122.315, 47.622], severity: 3, category: "theft", timestamp: 1711920000000 }]
    // Public parks, playfields, green spaces.
    parkLocations: ParkLocation[]; // e.g., [{ id: "p1", name: "Volunteer Park", coordinates: [-122.315, 47.630], sizeAcres: 48.3, imageUrl: "https://..." }]
    // Cafes and coffee shops.
    cafeLocations: CafeLocation[]; // e.g., [{ id: "cafe_42", name: "Analog Coffee", coordinates: [-122.319, 47.615], rating: 4.6, priceTier: "$$", iconUrl: "https://..." }]
    // Optional neighborhood boundaries used to draw outlines and support selection/highlight.
    neighborhoods?: NeighborhoodBoundary[]; // e.g., [{ id: "capitol_hill", name: "Capitol Hill", polygon: [[[-122.33,47.61],...]] }]
  };

  // The neighborhood that should be visually emphasized (outline + fill highlight).
  // Example: "capitol_hill" | "ballard"
  activeNeighborhoodId?: string;

  // Optional cross-component sync: highlight a single entity, e.g., when hovering a scorecard row.
  // Example: { kind: "park", id: "p1" }
  highlightedEntity?: { kind: "crime" | "park" | "cafe" | "neighborhood"; id: string } | null;

  // Enable clustering for point layers ("parks_pins", "cafes_pins") at lower zooms.
  clusteringEnabled?: boolean;

  // Emitted when a layer is toggled by the user. Use this to update selectedLayers in app state.
  // Example payload: { type: "toggle_layer", layerId: "parks_pins", nextSelected: ["crime_heatmap","parks_pins"] }
  onToggleLayerAction?: {
    type: "toggle_layer";
    layerId: LayerId;
    nextSelected: LayerId[];
  };

  // Emitted on hover enter/leave over a map entity (marker/polygon). Null entity clears hover.
  // Example payload: { type: "hover_entity", entity: { kind: "cafe", id: "cafe_42" } }
  onItemHoverAction?: {
    type: "hover_entity";
    entity: { kind: "crime" | "park" | "cafe" | "neighborhood"; id: string } | null;
  };

  // Emitted on click/tap of a map entity. Use to filter list views, open detail panels, etc.
  // Example payload: { type: "select_entity", entity: { kind: "park", id: "p1" } }
  onItemClickAction?: {
    type: "select_entity";
    entity: { kind: "crime" | "park" | "cafe" | "neighborhood"; id: string };
  };

  // Emitted when the viewport changes due to user pan/zoom or fit-to-bounds.
  // Example payload: { type: "viewport_change", viewport: { type: "center_zoom", center: [-122.32,47.62], zoom: 13 } }
  onViewportChangeAction?: {
    type: "viewport_change";
    viewport:
      | { type: "center_zoom"; center: [number, number]; zoom: number }
      | { type: "bounds"; bounds: [[number, number], [number, number]] };
  };

  // Emitted when a neighborhood polygon is clicked or selected from within the map UI.
  // Example payload: { type: "select_neighborhood", neighborhoodId: "ballard" }
  onNeighborhoodSelectAction?: {
    type: "select_neighborhood";
    neighborhoodId: string;
  };
}

/* Supporting types */

type LayerId = "crime_heatmap" | "parks_pins" | "cafes_pins";

interface CrimePoint {
  id: string;
  coordinates: [longitude: number, latitude: number];
  severity: 1 | 2 | 3 | 4 | 5; // 1=low to 5=high
  category?: string; // e.g., "theft", "assault"
  timestamp?: number; // epoch ms
}

interface ParkLocation {
  id: string;
  name: string;
  coordinates: [longitude: number, latitude: number];
  sizeAcres?: number; // e.g., 48.3
  imageUrl?: string; // representative park photo
}

interface CafeLocation {
  id: string;
  name: string;
  coordinates: [longitude: number, latitude: number];
  rating?: number; // e.g., 4.6
  priceTier?: "$" | "$$" | "$$$";
  iconUrl?: string; // brand or generic coffee icon
}

interface NeighborhoodBoundary {
  id: string; // e.g., "capitol_hill"
  name: string; // e.g., "Capitol Hill"
  // Polygon or MultiPolygon in [lng, lat]. For MultiPolygon, provide multiple outer rings.
  // Example (Polygon): [[[-122.33,47.61], [-122.30,47.61], [-122.30,47.63], [-122.33,47.63], [-122.33,47.61]]]
  polygon: number[][][] | number[][][][];
}

interface CategoryRadarChartProps {
  // Categories compared on the radar chart (e.g., walkability, safety, parks, cafes)
  // id: stable key used to map scores; label: human-readable name
  // iconUrl: optional small icon for legend/tooltip; guideUrl: deep link to local guide for that category
  categories: CategoryItem[];

  // Scores for neighborhood A by category id (0-100 recommended)
  // Example: { walkability: 92, safety: 68, parks: 80, cafes: 88 }
  scoresA: Record<string, number>;

  // Scores for neighborhood B by category id (0-100 recommended)
  // Keys must match categories[].id
  scoresB: Record<string, number>;

  // Display configuration for neighborhood A (label and color used for legend and polygon stroke/fill)
  neighborhoodA: NeighborhoodSeries;

  // Display configuration for neighborhood B
  neighborhoodB: NeighborhoodSeries;

  // Optional value domain for the radial scale; defaults to { min: 0, max: 100 }
  valueRange?: {
    min: number; // e.g., 0
    max: number; // e.g., 100
  };

  // Optionally emphasize a specific category slice (e.g., "safety") to align with other views
  highlightedCategoryId?: string;

  // Show or hide legend; if shown, users may toggle series visibility (if actions.toggleNeighborhoodVisibility provided)
  showLegend?: boolean;

  // User interaction intents emitted as action objects (no callbacks).
  // Framework will dispatch these with runtime-filled fields such as categoryId or seriesId.
  actions?: {
    // Fired when a user clicks/taps a category slice or axis label
    // Framework fills categoryId with the selected categories[].id
    selectCategory?: {
      type: "filter_category";
      categoryId?: string;
    };
    // Fired when legend toggle changes visibility of a neighborhood
    // seriesId is "A" or "B"; visible indicates the target visibility state
    toggleNeighborhoodVisibility?: {
      type: "toggle_series";
      seriesId?: "A" | "B";
      visible?: boolean;
    };
    // Fired on hover/focus of a category to allow coordinated highlight in other components
    hoverCategory?: {
      type: "highlight_category";
      categoryId?: string;
    };
  };

  // Tooltip configuration for displaying exact values on hover/focus
  tooltip?: {
    show: boolean; // default true
    valueFormat?: "raw" | "percent" | "score_0_100"; // how to label values
    decimals?: number; // number of decimal places to show (e.g., 0 or 1)
  };

  // Accessibility metadata
  accessibility?: {
    title: string; // e.g., "Capitol Hill vs Ballard: Neighborhood Score Comparison"
    description?: string; // brief summary for screen readers
  };
}

// Category definition for the radar axes
interface CategoryItem {
  id: string; // e.g., "walkability" | "safety" | "parks" | "cafes"
  label: string; // e.g., "Walkability"
  iconUrl?: string; // small icon representing the category (optional)
  guideUrl?: string; // link to local guide/details for this category (optional)
}

// Series metadata for each neighborhood
interface NeighborhoodSeries {
  id: string; // e.g., "capitol_hill" or "ballard"
  label: string; // e.g., "Capitol Hill"
  color: string; // HEX/RGB string, used for stroke/fill (e.g., "#3B82F6")
}

interface GuideLinkCardsProps {
  // Curated guide links to show as cards
  // Example:
  // [
  //   {
  //     id: "capitol-hill-safety-guide",
  //     title: "Capitol Hill: Safety & Late-Night Tips",
  //     neighborhood: "Capitol Hill",
  //     url: "https://example.com/guides/capitol-hill-safety",
  //     iconType: "crime",
  //     summary: "Crime heatmap overview, safe routes, and emergency contacts."
  //   },
  //   {
  //     id: "ballard-parks-cafes",
  //     title: "Ballard: Parks, Trails & Coffee Map",
  //     neighborhood: "Ballard",
  //     url: "https://example.com/guides/ballard-parks-cafes",
  //     iconType: "parks",
  //     summary: "Top parks, off-leash areas, and the best third-wave roasters."
  //   }
  // ]
  items: GuideLinkCardItem[];

  // Visual arrangement of cards. "row" for horizontal list, "grid" for tiled layout. Default: "row"
  layout?: "row" | "grid";

  // Optional filter to only show guides for a specific neighborhood.
  // Use "all" or leave undefined to show everything.
  // Example: "Capitol Hill" | "Ballard" | "all"
  filterNeighborhood?: string;

  // Maximum number of cards to render (useful to cap the row length). Example: 4
  maxItems?: number;

  // Fired when a card is clicked/tapped to open a guide.
  // Implementers should handle navigation with payload.url or lookup via payload.id.
  onOpenGuideAction: {
    type: "open_guide";
    payload: {
      id: string;      // Guide id from items[i].id
      url: string;     // Guide URL from items[i].url
    };
  };
}

interface GuideLinkCardItem {
  id: string;               // Stable identifier, e.g., "capitol-hill-parks"
  title: string;            // Short, scannable title for the guide card
  neighborhood: string;     // Neighborhood name, e.g., "Capitol Hill" or "Ballard"
  url: string;              // Absolute URL to the guide
  iconType?: GuideIconType; // Icon to convey guide focus (e.g., "crime", "parks", "cafes")
  summary?: string;         // 1–2 sentence hover/tooltip summary shown on hover/focus
}

type GuideIconType =
  // Common domains for Neighborhood Safety & Amenities
  | "crime"
  | "parks"
  | "cafes"
  | "transit"
  | "walkability"
  | "family"
  | "general"
  // Allow custom tokens if needed by the design system
  | (string & {});

interface CoffeeShopListProps {
  // Neighborhood context for the list (e.g., "Capitol Hill" or "Ballard")
  neighborhood: string;

  // Coffee shops to render. Keep this list pre-filtered to the neighborhood.
  items: CoffeeShopItem[];

  // Sorting applied by the parent. "rating" (default) or "distance" (nearest first).
  sortBy: "rating" | "distance";

  // Maximum number of items to display. Default: 10
  maxItems?: number;

  // Display unit for distance values. Default rendering can assume "mi".
  showDistanceUnit?: "mi" | "km";

  // Single action channel for user interactions within the list
  // Supported types:
  // - { type: "view_on_map"; payload: { id: string } }        // user selects a shop to center/preview on map
  // - { type: "save_favorite"; payload: { id: string } }      // user saves a shop to favorites
  // - { type: "change_sort"; payload: { sortBy: "rating" | "distance" } } // user toggles sort mode
  onAction: CoffeeShopListAction;
}

interface CoffeeShopItem {
  // Unique ID for the coffee shop, used for actions and selection
  id: string;

  // Display name (e.g., "Caffe Vita")
  name: string;

  // Average rating from 0–5 (e.g., 4.5)
  rating: number;

  // Price tier: 1=$, 2=$$, 3=$$$, 4=$$$$
  priceTier: 1 | 2 | 3 | 4;

  // Straight-line or walking distance from the neighborhood center or user location, in meters
  // Convert to mi/km for display based on showDistanceUnit
  distanceMeters: number;

  // Short human-readable address (e.g., "1005 E Pike St, Seattle, WA")
  address: string;

  // True if currently open (based on local time)
  openNow: boolean;

  // Optional logo or storefront image for thumbnail display
  imageUrl?: string;
}

type CoffeeShopListAction =
  | { type: "view_on_map"; payload: { id: string } }
  | { type: "save_favorite"; payload: { id: string } }
  | { type: "change_sort"; payload: { sortBy: "rating" | "distance" } };