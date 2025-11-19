interface EnergyUsageOverviewProps {
  // Unique identifier for this overview instance (e.g., a household or dataset ID)
  id: string;

  // Display title for the component, e.g., "Energy Usage Overview"
  title: string;

  // Month labels in order; length should match all series (typically 12).
  // Example: ["Jan", "Feb", ..., "Dec"] or ISO months ["2024-01", ...]
  months: string[];

  // Total electricity usage per month in kWh.
  // Must align 1:1 with `months`.
  // Example: [720, 680, 650, 610, 590, 610, 800, 820, 700, 660, 640, 710]
  usageSeries: number[];

  // Total cost per month in currency units (before/after taxes as provided).
  // Must align 1:1 with `months`.
  // Example: [110.5, 103.2, 98.0, 94.3, 92.0, 95.1, 125.0, 130.2, 112.4, 105.0, 100.3, 112.9]
  costSeries: number[];

  // Stacked area breakdown estimate by appliance; each series must align to `months`.
  // Include only the listed appliance categories; values are in kWh per month for that appliance.
  applianceSeries: ApplianceBreakdown[];

  // Optional callouts for spikes/dips or billing anomalies.
  // Example: [{ monthIndex: 6, label: "AC spike during heatwave", severity: "warn" }]
  anomalies?: AnomalyCallout[];

  // Actionable savings ideas with projected impact.
  // Example: [{ id: "seal_ducts", title: "Seal duct leaks", annualSavings: 85, monthlySavings: 7, confidence: "high" }]
  recommendations: RecommendationCard[];

  // Exportable checklist for user follow-up.
  // Example: [{ id: "swap_filters", label: "Replace HVAC filters quarterly", completed: false, annualSavings: 25 }]
  checklistItems: SavingsChecklistItem[];

  // Single action channel for all interactions (season change, range select, export, apply recommendation).
  // Dispatch one at a time as needed.
  action?: EnergyUsageOverviewAction;

  // Optional currency code for costs; defaults to "USD" if omitted.
  // Example: "USD", "EUR", "GBP"
  currencyCode?: string;
}

type Season = "All" | "Winter" | "Spring" | "Summer" | "Fall";

interface ApplianceBreakdown {
  // Appliance category used for stacking
  appliance: "HVAC" | "WaterHeat" | "Lighting" | "Refrigeration" | "Other";
  // kWh per month for this appliance category; length must match `months`
  data: number[];
  // Optional hex color override for this appliance area, e.g., "#2E86AB"
  colorHex?: string;
}

interface AnomalyCallout {
  // Index into `months`, 0-based (0 = first month in the provided array)
  monthIndex: number;
  // Short label explaining the anomaly, e.g., "Estimated bill" or "Heatwave spike"
  label: string;
  // Visual priority for the callout
  severity: "info" | "warn" | "critical";
}

interface RecommendationCard {
  // Stable identifier for applying/saving the recommendation
  id: string;
  // Short actionable title, e.g., "Tune up HVAC" or "Lower water heater to 120°F"
  title: string;
  // Estimated annual savings in currency units (matches `currencyCode`)
  annualSavings: number;
  // Optional monthly savings if available; if omitted, derive from annual/12
  monthlySavings?: number;
  // Confidence in the estimate based on data quality and heuristics
  confidence: "low" | "medium" | "high";
}

interface SavingsChecklistItem {
  // Stable identifier for tracking completion/export
  id: string;
  // User-facing label describing the task
  label: string;
  // Whether the user has completed this task
  completed: boolean;
  // Optional annual savings impact in currency units
  annualSavings?: number;
}

type EnergyUsageOverviewAction =
  | { type: "change_season"; season: Season } // Filter view to seasonal subset
  | { type: "select_range"; startIdx: number; endIdx: number } // Highlight subset of months [startIdx, endIdx]
  | { type: "export_checklist" } // Trigger export of current checklist state
  | { type: "apply_recommendation"; id: string }; // Apply a selected recommendation by id

interface TimeSeriesChartProps {
  // X-axis labels aligned to all data arrays.
  // Example: ["2024-01", "2024-02", ..., "2024-12"] or ["Jan 2024", "Feb 2024", ...]
  xLabels: string[];

  // Energy usage per period (left axis). Must match xLabels length.
  // Units should correspond to yLeftUnit (e.g., "kWh").
  kWhLine: number[];

  // Cost per period (right axis). Must match xLabels length.
  // Units should correspond to yRightUnit (e.g., "$").
  costLine: number[];

  // Stacked area series estimating usage by appliance. Each data array must match xLabels length.
  // Use "Other" for uncategorized/remaining usage.
  stackedAreas: StackedAreaItem[];

  // Optional anomaly callouts rendered as markers on the timeline.
  // index refers to xLabels index. Severity influences marker emphasis.
  anomalies?: AnomalyMarker[];

  // Axis unit labels (rendered on axes and tooltips).
  // Examples: yLeftUnit: "kWh", yRightUnit: "$"
  yLeftUnit: string;
  yRightUnit: string;

  // Show/hide legend for lines and stacked areas. Default: true
  showLegend?: boolean;

  // Action dispatched when a point (line or stacked area) is clicked.
  // The component will inject: { index, xLabel, value, series, appliance? }
  // Example provided action: { type: "select_point", series: "kWh" }
  onPointClickAction?: {
    type: "select_point";
    series: "kWh" | "cost" | "appliance";
    // If series is "appliance", optionally constrain to a specific appliance key.
    appliance?: ApplianceKey;
  };

  // Action dispatched after a brush/range selection on the x-axis.
  // The component will inject: { startIndex, endIndex, startLabel, endLabel }
  // Example: { type: "brush_select" }
  onBrushSelectAction?: {
    type: "brush_select";
  };

  // Optional action to export the visualization or its underlying series.
  // When invoked, the component will inject: { format, fileName?, range?: { startIndex, endIndex } }
  // Example: { type: "export_chart", format: "png" }
  onExportAction?: {
    type: "export_chart";
    format: "png" | "csv";
    // Suggested base filename without extension. Example: "home-energy-2024"
    fileName?: string;
  };
}

// Estimated appliance series for the stacked area.
interface StackedAreaItem {
  appliance: ApplianceKey; // e.g., "HVAC"
  data: number[]; // Must align with xLabels length; values should be in yLeftUnit (e.g., kWh)
  // Optional display name if you want a nicer legend label than the key.
  displayName?: string; // e.g., "Heating & Cooling"
  // Optional color per series (HEX). If omitted, a palette is used. Example: "#4F46E5"
  colorHex?: string;
}

// Marker for anomalies like spikes, outages, or data gaps.
interface AnomalyMarker {
  index: number; // xLabels index
  label: string; // Short description. Example: "Heat wave spike"
  severity: "info" | "warn" | "critical";
}

// Fixed set of appliance categories for Home Energy Savings.
type ApplianceKey = "HVAC" | "WaterHeat" | "Lighting" | "Refrigeration" | "Other";

interface RecommendationCardProps {
  // Unique identifiers
  id: string; // Unique ID for this recommendation (e.g., "rec-led-bulbs-2024")
  name: string; // Machine-friendly name/slug (e.g., "LED Bulb Swap")

  // Primary display fields
  title: string; // Short headline shown on the card (e.g., "Switch to LED Bulbs")
  summary: string; // One-sentence explanation (e.g., "Replace 12 incandescent bulbs with LEDs to cut lighting costs.")

  // Impact estimates (currency assumed USD unless your app specifies otherwise)
  monthlySavings: number; // Estimated monthly savings in USD (e.g., 12.5)
  annualSavings: number; // Estimated annual savings in USD (e.g., 150)
  costToImplement: number; // One-time implementation cost in USD (e.g., 40)

  // Data quality indicator for the estimate
  confidence: "low" | "medium" | "high"; // Based on seasonality/data coverage (e.g., "medium")

  // Primary call-to-action
  ctaLabel: string; // Button label (e.g., "Apply", "Add to Plan")

  // Action object dispatched when the primary CTA is pressed
  onApplyAction: {
    type: "apply_recommendation";
    payload: {
      id: string; // Should match the card's id
    };
  };
}

interface SavingsChecklistProps {
  // Title shown above the checklist (e.g., "Energy Savings Actions")
  // Optional, defaults to "Savings Checklist"
  title?: string;

  // Currency code used to display annualSavings (e.g., "USD", "EUR")
  // Optional, defaults to "USD"
  currency?: string;

  // Items to display in the checklist
  // Example:
  // [
  //   { id: "seal-ducts", label: "Seal ductwork leaks", completed: false, annualSavings: 85, season: "winter" },
  //   { id: "led-bulbs", label: "Replace bulbs with LEDs", completed: true, annualSavings: 60, season: "year-round", iconUrl: "/icons/led.svg" }
  // ]
  items: SavingsChecklistItem[];

  // Summary metrics for quick progress and impact
  // Example:
  // { completedCount: 1, totalCount: 5, totalAnnualSavings: 240 }
  summary: SavingsChecklistSummary;

  // Preferred export format for the checklist
  // Optional, defaults to "csv"
  exportFormat?: "csv" | "pdf";

  // Action dispatched when a user toggles an item.
  // The component will append payload: { id: string; nextCompleted: boolean }
  // Example dispatched object:
  // { type: "toggle_checklist_item", payload: { id: "led-bulbs", nextCompleted: false } }
  toggleItemAction: { type: "toggle_checklist_item" };

  // Action dispatched when a user exports the checklist.
  // The component will append payload: { format: "csv" | "pdf", items: SavingsChecklistItem[] }
  // Example dispatched object:
  // { type: "export_savings_checklist", payload: { format: "pdf", items: [...] } }
  exportAction: { type: "export_savings_checklist" };
}

interface SavingsChecklistItem {
  // Stable unique identifier for the action (e.g., "install-programmable-thermostat")
  id: string;

  // Short, user-facing label describing the action
  label: string;

  // Whether the action has been completed by the user
  completed: boolean;

  // Estimated annual utility bill savings in the specified currency
  // Example: 120 means "$120/year" if currency is "USD"
  annualSavings: number;

  // Optional season relevance to help users prioritize
  // Use "year-round" for actions with consistent impact
  season?: "winter" | "spring" | "summer" | "fall" | "year-round";

  // Optional icon representing the action (e.g., a lightbulb, thermostat)
  iconUrl?: string;
}

interface SavingsChecklistSummary {
  // Number of actions marked as completed
  completedCount: number;

  // Total number of actions available
  totalCount: number;

  // Sum of annualSavings for all items marked as completed
  totalAnnualSavings: number;
}

interface CsvUploaderProps {
  // Identity
  id: string; // Unique component instance ID
  title: string; // e.g., "Upload your 12‑month utility CSV"

  // Display/config
  helperText?: string; // e.g., "Upload a CSV with columns: date, kWh, cost"
  sampleTemplateUrl?: string; // Link to a sample CSV template
  accept?: string | string[]; // Default: ".csv" (e.g., ".csv" or [".csv", "text/csv"])
  iconUrl?: string; // Optional icon to visually represent CSV upload

  // Parsing state
  parseState: "idle" | "parsing" | "error" | "success"; // UI reflects current parsing lifecycle
  errorMessage?: string; // Shown when parseState === "error"

  // Actions (dispatched by the component; payload is attached at runtime)
  selectFileAction: {
    type: "csv_file_selected";
    // Runtime payload example (added by the component on dispatch):
    // {
    //   fileName: string;
    //   sizeBytes: number;
    //   mimeType?: string;
    //   file?: File; // raw File object if the host allows passing it through
    // }
  };

  parsedAction?: {
    type: "csv_parsed";
    // Emitted after successful parse.
    // Runtime payload example:
    // {
    //   rows: number;
    //   columns: string[]; // Expected domain columns: ["date","kWh","cost","notes?"]
    //   preview: Record<string, string | number | null>[]; // first N rows for display
    //   // Optional domain hints:
    //   // timeRange?: { start: string; end: string }; // ISO dates detected from "date" column
    // }
  };

  retryAction?: {
    type: "csv_retry";
    // Emitted when user chooses to try again (e.g., after an error)
  };

  // Optional domain-specific configuration
  expectedColumns?: string[]; // e.g., ["date", "kWh", "cost"] to validate incoming CSV
  maxFileSizeMB?: number; // e.g., 10 — reject larger files client-side
}