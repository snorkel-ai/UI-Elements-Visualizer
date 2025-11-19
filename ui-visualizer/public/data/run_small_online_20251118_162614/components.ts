interface ProfitabilityDashboardProps {
  // ISO date strings; timezone optional for consistency in aggregations
  dateRange: {
    start: string; // e.g., "2025-01-01"
    end: string;   // e.g., "2025-01-31"
    timezone?: string; // e.g., "America/Los_Angeles"
  };

  // Currency code used for all monetary display (ISO 4217)
  currency: string; // e.g., "USD", "EUR"

  // Active filters applied to products/channels
  selectedFilters: Filter[]; // e.g., [{ key: "channel", values: ["amazon", "shopify"] }]

  // Action describing the desired next filter state
  onFilterChangeAction: {
    type: "filter_change";
    nextFilters: Filter[];
  };

  // Action describing the desired next date range
  onDateRangeChangeAction: {
    type: "date_range_change";
    dateRange: {
      start: string;
      end: string;
      timezone?: string;
    };
  };

  // Primary data for the four visuals: products, channels, summary, and trends
  data: {
    products: ProductProfit[]; // powers product profitability bar chart
    channels: ChannelPerformance[]; // powers channel comparison
    trendSeries: TrendSeries[]; // expect two series: "revenue" and "cost"
    lastUpdatedIso?: string; // e.g., "2025-11-18T15:04:05Z"
  };

  // How to compare values across charts
  comparisonMode?: "absolute" | "percentage" | "margin"; 
  // "absolute" => raw currency values, "percentage" => growth %, "margin" => gross margin %

  // Toggle revenue vs. cost trend lines visibility
  showTrendlines?: boolean; // default true

  // Optional selection intents (e.g., drilling into a product/channel detail view)
  onSelectProductAction?: { type: "select_product"; productId: string };
  onSelectChannelAction?: { type: "select_channel"; channelId: string };

  // Optional summary KPI cards shown at top (e.g., Revenue, Costs, Gross Margin, AOV)
  summaryCards?: SummaryCard[]; 
}

/* ---------- Supporting Types ---------- */

interface Filter {
  // Common filter keys for this dashboard
  key: "product" | "channel" | "tag" | "inventory_status" | "fulfillment";
  values: string[]; // selected values for the key
}

interface ProductProfit {
  productId: string;
  name: string;
  imageUrl?: string; // thumbnail for quick visual ID
  revenue: number; // in 'currency'
  cost: number;    // in 'currency'
  unitsSold: number;
  grossMarginPct: number; // 0-100
}

interface ChannelPerformance {
  channelId: string; // e.g., "amazon", "shopify", "etsy"
  name: string; 
  iconUrl?: string; // channel logo
  revenue: number; // in 'currency'
  cost: number;    // in 'currency'
  orders: number;
  grossMarginPct: number; // 0-100
}

// Two possible series for the revenue vs. cost trend lines
type TrendSeries = RevenueSeries | CostSeries;

interface RevenueSeries {
  type: "revenue";
  points: TimePoint[]; // ordered by date asc
}

interface CostSeries {
  type: "cost";
  points: TimePoint[]; // ordered by date asc
}

interface TimePoint {
  date: string; // ISO date, e.g., "2025-01-05"
  value: number; // in 'currency' for revenue/cost series
}

interface SummaryCard {
  id: string;
  label: string; // e.g., "Revenue", "Costs", "Gross Margin", "AOV"
  value: string; // preformatted display value, e.g., "$12,450" or "42%"
  deltaPct?: number; // change vs previous period (e.g., 12.3 for +12.3%)
  iconUrl?: string; // optional icon for the card
  intent?: "neutral" | "positive" | "negative"; // color/semantic hint selection logic (internal)
}

interface ProductProfitabilityBarChartProps {
  // Primary dataset: one record per product
  products: ProductProfitRecord[]; 
  // Which metric to visualize on the bar length
  // - "profit": uses currency formatting (see `currency`)
  // - "marginPct": shown as percentage (0–100%)
  metric: "profit" | "marginPct";
  // Currency code for monetary values (ISO 4217), e.g., "USD", "EUR"
  // Used for axis/labels when metric = "profit"
  currency: string;

  // Limit the chart to the top N products after sorting (default: 10)
  topN?: number;
  // Sorting configuration controlling ranking of bars
  // Example: { by: "profit", order: "desc" }
  sort?: SortConfig;

  // Show value labels at the end of each bar (default: true)
  showValues?: boolean;
  // Short, descriptive title used for accessibility/announcements
  // Example: "Top products by profit"
  chartTitle?: string;

  // Interaction: dispatched when a bar is clicked
  // The component will populate `productId` with the clicked product's id.
  // Example emitted action: { type: "select_product", productId: "sku_123" }
  onBarClickAction?: { type: "select_product"; productId: string };

  // Interaction: dispatched when the user switches the displayed metric
  // Example emitted action: { type: "change_metric", nextMetric: "marginPct" }
  onMetricChangeAction?: { type: "change_metric"; nextMetric: "profit" | "marginPct" };

  // Interaction: dispatched when the user changes sorting (field or order)
  // Example emitted action:
  // { type: "change_sort", sort: { by: "marginPct", order: "desc" } }
  onSortChangeAction?: { type: "change_sort"; sort: SortConfig };
}

// Individual product record expected by the chart
interface ProductProfitRecord {
  id: string;    // Stable unique id, e.g., "sku_123"
  name: string;  // Display name, e.g., "Premium Hoodie"
  revenue: number;   // Total revenue for the period, e.g., 12950.25
  cost: number;      // Total cost for the period, e.g., 8450.10
  profit: number;    // revenue - cost, e.g., 4500.15
  marginPct: number; // Profit margin percentage (0–100), e.g., 34.75
  imageUrl?: string; // Optional product image for tooltips/legends
}

// Sorting configuration for ranking bars before topN is applied
interface SortConfig {
  by: "profit" | "marginPct" | "revenue" | "cost";
  order: "asc" | "desc";
}

interface ChannelPerformanceComparisonProps {
  // Optional heading shown above the chart
  // Example: "Channel Performance (Last 30 Days)"
  title?: string;

  // Core dataset to compare across channels.
  // All monetary values should be in the same currency and major units (e.g., 1234.56 USD).
  channels: {
    id: string; // Unique identifier for the channel (e.g., "shopify", "etsy", "instagram")
    name: string; // Human-readable name (e.g., "Shopify")
    revenue: number; // Total sales amount for the period
    cost: number; // Total costs attributable to the channel for the period
    profit: number; // revenue - cost
    // Optional: if omitted, the component can compute marginPct = profit / revenue
    marginPct?: number; // 0.0 - 1.0 (e.g., 0.32 for 32%)
  }[];

  // Initial metric used for bar heights/ordering
  // - "profit": emphasizes bottom-line performance
  // - "revenue": emphasizes gross sales
  // - "marginPct": profit as a percentage of revenue
  compareMetric: "profit" | "revenue" | "marginPct";

  // ISO 4217 currency code used for formatting (e.g., "USD", "EUR", "GBP")
  currency: string;

  // Optional visual style for bars:
  // - "grouped": separate bars for revenue, cost, profit per channel
  // - "stacked": stacked bars to show composition
  // Default: "grouped"
  chartType?: "grouped" | "stacked";

  // Optional sorting of channels in the chart
  // Default: same as compareMetric
  sortBy?: "profit" | "revenue" | "marginPct";

  // Optionally emphasize a specific channel (e.g., to sync with other components)
  highlightChannelId?: string;

  // Single action entry-point for user interactions.
  // The component will dispatch this action with a populated payload when:
  // - type: "toggle_channel" -> payload: { channelId: string }  // show/hide a channel in the chart
  // - type: "change_metric"  -> payload: { metric: "profit" | "revenue" | "marginPct" }
  onUserAction: {
    type: "toggle_channel" | "change_metric";
    payload?: unknown;
  };
}

interface MarginSummaryCardsProps {
  // Unique identifiers to track this component instance in your app
  id: string; // e.g., "margin-cards-001"
  name: string; // e.g., "Margin Summary"
  title: string; // e.g., "Profitability Summary"

  // Currency to display monetary values (ISO 4217 code)
  currencyCode: string; // e.g., "USD", "EUR", "GBP"

  // Core KPIs shown as small summary cards
  metrics: {
    totalRevenue: number; // e.g., 25432.75
    totalCost: number; // e.g., 17110.35
    totalProfit: number; // e.g., 8322.40
    avgMarginPct: number; // 0-100; e.g., 32.7 for 32.7%
    topProductName: string; // e.g., "Eco Bamboo Toothbrush"
    topChannelName: string; // e.g., "Shopify Online Store"
  };

  // Single interaction: fired when a KPI card is clicked to drill in
  onCardClickAction: {
    type: "kpi_card_click";
    payload: {
      // Which KPI was clicked
      kpiKey:
        | "total_revenue"
        | "total_cost"
        | "total_profit"
        | "avg_margin_pct"
        | "best_product"
        | "best_channel";
      // Optional: pass through an ID to help routing/analytics
      contextId?: string; // e.g., the dashboard or shop ID
    };
  };

  // Optional small brand or header image to show above or beside the cards
  imageUrl?: string; // e.g., "https://cdn.example.com/brand/logo.png"

  // Optional numeric formatting configuration for currency values (default: 2)
  precision?: number; // e.g., 2 for $1,234.57
}

interface RevenueCostTrendLinesProps {
  // Unique identifier for this chart instance (used for analytics or action payload enrichment)
  id: string;

  // Short, human-readable heading shown above the chart
  // Example: "Revenue vs. Cost (Last 90 Days)"
  title: string;

  // Time series data. Each point represents the totals for a single bucket (day/week/month).
  // - dateISO: ISO 8601 date string. For daily: "2025-03-15"; for weekly/monthly use a representative date like period start.
  // - revenue/cost: numbers in the smallest display unit for the chosen currency (e.g., 1234.56 for USD)
  points: RevenueCostPoint[];

  // ISO 4217 currency code used for labeling and formatting
  // Example: "USD", "EUR", "GBP"
  currency: string;

  // Current aggregation bucket applied to the series
  // - "day": daily points
  // - "week": weekly points (e.g., Monday-start or locale default)
  // - "month": calendar months
  granularity: "day" | "week" | "month";

  // If true, a computed profit line (revenue - cost) is drawn
  // Default: false
  showProfitLine?: boolean;

  // Enables hover tooltips and crosshair
  // Default: true
  enableHover?: boolean;

  // Dispatched when user changes the granularity control in the UI.
  // The renderer should emit this action with payload { granularity, sourceId: id } when selection changes.
  // Example emitted action:
  // { type: "change_granularity", payload: { granularity: "week", sourceId: "rev-cost-trend-1" } }
  onGranularityChangeAction: {
    type: "change_granularity";
    // Runtime will fill payload when the user selects a new option
    payload?: {
      granularity: "day" | "week" | "month";
      sourceId?: string;
    };
  };
}

interface RevenueCostPoint {
  // ISO date string representing the bucket (e.g., "2025-05-01")
  dateISO: string;
  // Total revenue for the bucket
  revenue: number;
  // Total cost for the bucket
  cost: number;
  // Optional count of transactions/orders in the bucket (used for tooltips or density hints)
  // Example: 42
  count?: number;
}