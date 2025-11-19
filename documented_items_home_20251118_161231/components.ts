interface CoverageOverviewDashboardProps {
  // Aggregated category totals for the pie/donut chart and underinsurance checks
  // Example: [{ categoryId: "electronics", name: "Electronics", totalInsuredValue: 22000, estimatedReplacementCost: 28000, coverageLimit: 20000, iconUrl: "https://..." }]
  categories: CategorySummary[];

  // High-value items table, typically top N by replacementCost/appraisedValue
  // Example: [{ itemId: "it_123", name: "MacBook Pro 16\"", categoryId: "electronics", appraisedValue: 3200, replacementCost: 3500, photoUrl: "https://..." }]
  highValueItems: InventoryItem[];

  // Risk scorecard summary with factor breakdown (e.g., underinsured categories, missing documentation)
  risk: RiskRating;

  // Recommended coverage changes/cards (e.g., increase category limit, schedule items)
  recommendations: CoverageRecommendationCard[];

  // Display currency, ISO code preferred (e.g., "USD", "EUR"); symbol also supported (e.g., "$")
  currency: string;

  // Valuation basis for estimates
  valuationStrategy: "replacement_cost" | "actual_cash_value";

  // Thresholds used for highlighting/flagging risk and high-value items
  // highValueItemMin: items above this replacement/appraised value appear in the table
  // underinsuredCategoryPercent: category is flagged if estimatedReplacementCost exceeds coverageLimit by this percent
  thresholds?: {
    highValueItemMin: number;
    underinsuredCategoryPercent: number; // e.g., 10 means >10% underinsured
  };

  // Pie chart style variant
  chartVariant?: "pie" | "donut";

  // Action descriptors to be dispatched by the host app on user interactions
  // paramKeys list indicates which dynamic fields will be injected when dispatching (e.g., itemId, categoryId)
  interactions?: {
    selectCategoryAction: ActionDescriptor; // type: "select_category", paramKeys: ["categoryId"]
    selectItemAction: ActionDescriptor;     // type: "select_item", paramKeys: ["itemId"]
    requestQuoteAction?: ActionDescriptor;  // type: "request_quote", paramKeys?: ["providerId"]
    adjustCoverageAction?: ActionDescriptor; // type: "adjust_coverage", paramKeys?: ["categoryId","targetAmount"]
  };

  // Optional current policy context shown alongside recommendations (for comparison)
  policySnapshot?: {
    carrierName?: string;
    policyNumber?: string;
    personalPropertyLimit?: number; // current Coverage C limit
    deductible?: number;
    renewalDateIso?: string; // ISO 8601 date string
  };
}

/* Supporting Types */

interface CategorySummary {
  categoryId: string;
  name: string;
  totalInsuredValue: number; // Sum of currently insured values for items in this category
  estimatedReplacementCost: number; // Estimated full replacement for the category
  coverageLimit?: number; // Current policy category sublimit (if any)
  iconUrl?: string; // Category icon
}

interface InventoryItem {
  itemId: string;
  name: string;
  categoryId: string;
  appraisedValue: number; // If available; otherwise 0
  replacementCost: number; // Estimated new-for-old cost
  photoUrl?: string;
  flagged?: "high_value" | "missing_docs" | "needs_appraisal";
  lastUpdated?: string; // ISO 8601
}

interface RiskRating {
  score: number; // 0-100 aggregate risk score
  level: "low" | "medium" | "high" | "critical";
  // Example factor: { id: "underinsured_electronics", label: "Electronics underinsured by 18%", impact: "negative", weight: 0.3 }
  factors: Array<{
    id: string;
    label: string;
    impact: "positive" | "negative";
    weight: number; // 0..1 relative importance
    details?: string;
  }>;
  notes?: string;
}

interface CoverageRecommendationCard {
  id: string;
  title: string; // e.g., "Increase Electronics Limit"
  type: "increase_category_limit" | "schedule_item" | "add_rider" | "bundle_discount" | "verify_receipts";
  subtitle?: string;
  iconUrl?: string;
  // Display estimated premium change if applied
  estimatedPremiumChange?: { amount: number; frequency: "monthly" | "annual" };
  // Suggested target or scope for the recommendation
  suggestedCoverage?: { categoryId?: string; itemId?: string; targetAmount?: number };
  rationale?: string; // Why this is recommended
  // Optional card-specific action
  ctaAction?: ActionDescriptor; // e.g., { type: "open_recommendation", paramKeys: ["id"] }
}

interface ActionDescriptor {
  type:
    | "select_category"
    | "select_item"
    | "request_quote"
    | "adjust_coverage"
    | "open_recommendation"
    | "view_policy";
  // Names of dynamic parameters that the host app will inject on dispatch, e.g., ["itemId"]
  paramKeys?: string[];
}

interface CategoryBreakdownChartProps {
  // Primary data: one slice per inventory category
  categories: CategorySlice[]; 
  // Chart style variant
  variant?: "pie" | "donut"; // default: "donut"
  // How slice colors are assigned
  colorBy?: "status" | "category" | "risk"; // "status" groups by coverageStatus, "category" gives each category its own color
  // Currency formatting (affects labels, tooltips, totals)
  currencyCode: string; // e.g., "USD", "EUR"
  // Optional locale for number/currency formatting
  locale?: string; // e.g., "en-US", "de-DE"
  // Display a legend mapping colors to categories or statuses
  showLegend?: boolean; // default: true
  // If provided, categories beyond this rank are grouped into an "Others" slice by totalReplacementValue
  maxCategories?: number; // e.g., 6
  // Tooltip information density
  tooltipMode?: "basic" | "detailed"; // "detailed" shows insured value and coverage gap if available
  // Fired when a user selects a slice (the charting system will populate categoryId for the selected slice)
  onSelectAction?: { type: "select_category"; categoryId: string };
  // Fired when a user requests a deeper view for a slice (e.g., double-click or context action)
  onDrilldownAction?: { type: "drilldown_category"; categoryId: string };
  // Optional CTA to guide users toward coverage adjustments (categoryId may be filled by the runtime when invoked from a slice)
  onRecommendCoverageAction?: { type: "recommend_coverage"; categoryId?: string };
}

/**
 * One category represented in the chart.
 * All monetary values should be in major currency units matching currencyCode (e.g., 1999.5 for $1,999.50).
 */
interface CategorySlice {
  id: string; // stable unique ID, e.g., "electronics"
  name: string; // human label, e.g., "Electronics"
  iconUrl?: string; // optional icon for legend/tooltips, e.g., "https://.../icons/electronics.png"
  totalReplacementValue: number; // total to replace all items in this category
  insuredValue?: number; // current coverage allocated to this category (if known)
  coverageStatus: "adequate" | "underinsured" | "uninsured"; // derived from insuredValue vs. totalReplacementValue
  riskLevel?: "low" | "medium" | "high"; // optional risk indicator used when colorBy="risk"
  itemCount?: number; // optional count of items in the category for tooltips
}

// High-level, minimal props for a sortable table of highest-value or highest-risk items.
// Domain: Home Inventory Insurance Estimator

interface HighValueItemsTableProps {
  // Title displayed above the table, e.g., "High-Value Items" or "Items With Largest Coverage Gaps"
  title: string;

  // Rows to render. Provide only the top N items (or use maxRows to limit).
  // Values should be in major currency units (e.g., USD as 1999.99).
  items: HighValueItem[];

  // Dispatched when a row is clicked or its quick action is invoked.
  // Example payload when a user selects item "it_123":
  // { type: "select_item", itemId: "it_123" }
  onRowAction: { type: "select_item"; itemId: string };

  // Optional configuration:

  // Sorting the table. Default: "replacementCost".
  // - replacementCost: highest value items first
  // - riskScore: highest risk first (0–100 scale)
  // - coverageGap: largest (replacementCost - insuredValue) first
  sortBy?: "replacementCost" | "riskScore" | "coverageGap";

  // Maximum number of rows to display. Default: 10
  maxRows?: number;

  // Visual emphasis mode to guide attention. Default: "value"
  // - "value": emphasize by replacement cost
  // - "risk": emphasize by risk score or coverage gap
  emphasizeBy?: "value" | "risk";
}

// Core item row.
// Keep fields minimal for the table: identity, a few key display metrics, and an optional thumbnail.
interface HighValueItem {
  // Stable unique identifier for actions and keying (e.g., "it_12345")
  id: string;

  // Human-readable item name (e.g., "65\" OLED TV")
  name: string;

  // Category tag used elsewhere in the dashboard (e.g., "Electronics", "Jewelry")
  category: string;

  // Estimated replacement cost in major currency units (e.g., 2499.99)
  replacementCost: number;

  // Currently insured amount in major currency units (e.g., 1500)
  insuredValue: number;

  // Composite risk score on a 0–100 scale (higher = riskier), e.g., based on theft/fire susceptibility or underinsurance
  riskScore: number;

  // Optional small thumbnail or icon URL for the item
  imageUrl?: string;

  // Optional short note (e.g., "Purchased 2022; receipt on file")
  notes?: string;
}

interface RiskRatingScorecardProps {
  id: string;
  // Unique identifier for this scorecard instance (e.g., "risk-card-001")

  name: string;
  // Name of the household or inventory profile this scorecard summarizes
  // Example: "The Parkers' Home", "Apartment 3B"

  title: string;
  // Short heading for the card
  // Example: "Overall Risk Rating"

  overallRiskScore: number;
  // 0–100 normalized score where higher = higher risk
  // Example: 72

  riskLevel: "Low" | "Moderate" | "High" | "Severe";
  // Bucketed risk level derived from the score
  // Example: "High"

  topFactors: RiskFactor[];
  // Top contributors to the current risk level, ordered by impact (most impactful first)
  // Provide 2–5 items for compact display
  // Example:
  // [
  //   { id: "cat_jewelry", label: "Jewelry undervalued", contributionPct: 28 },
  //   { id: "no_photos", label: "Missing item photos", contributionPct: 18 },
  //   { id: "high_item_variance", label: "High-value outliers", contributionPct: 12 }
  // ]

  guidance: string;
  // One or two concise sentences with next best actions
  // Example: "Upload photos for high-value items and increase jewelry category coverage by ~$3,500."

  onViewDetailsAction: {
    type: "view_risk_details";
    payload: { id: string };
  };
  // Action object dispatched when the card is selected or "Learn more" is triggered
  // Example: { type: "view_risk_details", payload: { id: "risk-card-001" } }
}

interface RiskFactor {
  id: string;
  // Stable identifier for the factor (e.g., "cat_electronics", "missing_receipts")

  label: string;
  // Human-readable description shown in the card
  // Example: "Electronics coverage gap"

  contributionPct: number;
  // Relative contribution to the overall risk score (0–100 for the listed factors)
  // Higher values indicate stronger impact on risk for this profile
}

interface CoverageEstimateCardProps {
  // Unique identifier for this recommendation card (e.g., UUID from backend)
  id: string;

  // Short machine-friendly name or code (e.g., "PersonalProperty", "ValuablesRider", "ElectronicsRider")
  name: string;

  // Human-readable title displayed on the card (e.g., "Personal Property Coverage")
  title: string;

  // Suggested coverage limit in currency units (assume USD unless your app specifies otherwise)
  // Example: 125000 for $125,000
  suggestedLimit: number;

  // Suggested deductible in currency units
  // Example: 1000 for $1,000
  suggestedDeductible: number;

  // Brief description of identified gaps or underinsured areas driving this recommendation
  // Example: "High-value jewelry exceeds base policy limits by ~$8,500."
  gapSummary: string;

  // Optional icon or image representing the coverage type (URL or app asset path)
  // Example: "/icons/valuables-rider.svg"
  imageUrl?: string;

  // Primary interaction for selecting/applying this recommendation
  // Consumers dispatch this action instead of passing callbacks
  // Example:
  // { type: "select_coverage_recommendation", payload: { id: "rec-123", selectedLimit: 150000, selectedDeductible: 1000 } }
  onSelectAction: {
    type: "select_coverage_recommendation";
    payload: {
      // ID should match the card's id
      id: string;
      // Optionally include the user's chosen adjustments if the UI allows simple controls
      selectedLimit?: number;
      selectedDeductible?: number;
    };
  };
}