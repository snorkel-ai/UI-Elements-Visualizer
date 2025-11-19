interface BudgetDeviationDashboardProps {
  // Array of spending categories for the stacked bar comparison.
  // Example:
  // [
  //   { id: "groceries", name: "Groceries", budget: 400, actual: 520, variance: 120, status: "overspent" },
  //   { id: "transport", name: "Transport", budget: 150, actual: 130, variance: -20, status: "on_track" }
  // ]
  categories: CategoryItem[];

  // Three-month surplus/deficit trend used for the line chart.
  // Each point represents the net (budget total - actual total) for that month.
  // Example: [{ monthLabel: "Aug 2025", surplusOrDeficit: -85 }, { monthLabel: "Sep 2025", surplusOrDeficit: 40 }, ...]
  trend: TrendPoint[];

  // Currency code for labels and tooltips (ISO 4217).
  // Example: "USD", "EUR", "GBP"
  currency: string;

  // Labels for the compared months, typically last 3 months, in display order.
  // Example: ["Aug 2025", "Sep 2025", "Oct 2025"]
  comparisonMonths: string[];

  // Percentage threshold that triggers alert badges for overspend drift.
  // If undefined, component may infer from category.status or treat >0 variance as overspend.
  // Example: 10 means >10% over budget shows an alert badge.
  overspendThresholdPct?: number;

  // Toggles alert badges on overspent categories in the stacked bar view.
  // Default: true
  showAlertBadges?: boolean;

  // Controls numeric formatting for labels/tooltips.
  // "standard" shows full values; "compact" uses abbreviations (e.g., 1.2k).
  // Default: "standard"
  numberFormat?: "standard" | "compact";

  // Defines variance sign convention for category.variance.
  // - "actual_minus_budget": variance = actual - budget (positive means overspend).
  // - "budget_minus_actual": variance = budget - actual (positive means underspend).
  // Default: "actual_minus_budget"
  varianceBasis?: "actual_minus_budget" | "budget_minus_actual";

  // Dispatched when a category bar/legend item is clicked to drill into details.
  // Example: { type: "select_category", categoryId: "groceries" }
  onCategorySelectAction?: {
    type: "select_category";
    categoryId: string;
  };

  // Dispatched when a point on the trend line is focused/selected (e.g., click or keyboard).
  // Useful for syncing external views to a specific month.
  // Example: { type: "focus_month", monthLabel: "Sep 2025" }
  onMonthFocusAction?: {
    type: "focus_month";
    monthLabel: string;
  };
}

// Items used in the stacked bar comparison per category.
interface CategoryItem {
  id: string; // Stable unique key, e.g., "groceries"
  name: string; // Display name, e.g., "Groceries"
  budget: number; // Planned amount for the period (currency units)
  actual: number; // Actual spend for the period (currency units)
  variance: number; // See varianceBasis for sign semantics
  status: "on_track" | "approaching_limit" | "overspent"; // For badge coloring and sorting
  iconUrl?: string; // Optional icon for category (e.g., "https://cdn/.../groceries.svg")
}

// Points used for the surplus/deficit trend line over the comparison months.
interface TrendPoint {
  monthLabel: string; // Must match a value in comparisonMonths, e.g., "Sep 2025"
  surplusOrDeficit: number; // Positive = surplus, negative = deficit (currency units)
}

interface CategoryDriftItem {
  id: string; // Stable category identifier (e.g., "groceries")
  name: string; // Display name (e.g., "Groceries")
  variance: number; // Actual - Budget for the latest month (e.g., 45.23 means $45.23 over budget; negative means under)
  percentOver: number; // Percentage over budget (e.g., 18 for 18% over; can be 0–100+; use 0 for under-budget categories)
  status: "overspend" | "at_risk" | "ok"; // Used for severity badges; "overspend" > "at_risk" > "ok"
  iconUrl?: string; // Optional category icon (e.g., "https://cdn.example.com/icons/groceries.svg")
}

interface CategoryDriftAction {
  // Single action channel; component fills payload at runtime based on the interaction
  type: "category_drift_action";
  payload: {
    action: "select" | "dismiss" | "snooze"; // "select" = drill down, "dismiss" = clear alert, "snooze" = pause alert
    categoryId: string; // Injected by the component for the interacted item
    snoozeUntil?: string; // ISO date (YYYY-MM-DD) when action === "snooze" (e.g., "2025-12-01")
  };
}

interface CategoryDriftListProps {
  items: CategoryDriftItem[]; // Input list; typically filtered to categories drifting off track
  currency: string; // ISO 4217 code used for variance formatting (e.g., "USD", "EUR")
  sortBy?: "severity" | "name" | "variance"; // Default: "severity" (overspend > at_risk > ok, then variance desc)
  maxVisible?: number; // Max rows to show before truncation (Default: 8; reasonable range: 5–12)
  onItemAction: CategoryDriftAction; 
  // Example usage:
  // {
  //   type: "category_drift_action",
  //   payload: { action: "select", categoryId: "" } // component sets categoryId; action may be "select" | "dismiss" | "snooze"
  // }
}

interface CategoryDetailPanelProps {
  // Selected category context for the detail view
  category: {
    id: string; // Unique category ID (e.g., "cat_groceries")
    name: string; // Human-readable name (e.g., "Groceries")
    iconUrl?: string; // Optional small icon (24–40px) for the category
  };

  // Last 3 months of budget vs actual amounts for mini-bar comparison
  // Example: [{ monthLabel: "Aug 2025", budget: 300, actual: 342.15 }, ...]
  monthly: Array<{
    monthLabel: string; // Display label for month (e.g., "Aug 2025" or "Aug")
    budget: number; // Planned amount for the month (in minor or major units aligned with 'currency')
    actual: number; // Actual spend for the month (same units as 'budget')
  }>;

  // Recent transactions in this category (shown as a short list, e.g., last 5)
  // Amounts should align with 'currency'. Dates should be ISO 8601 for consistency.
  recentTransactions: Array<{
    id: string; // Transaction ID
    date: string; // ISO date string (e.g., "2025-08-14")
    merchant: string; // Merchant or payee name
    amount: number; // Positive for spend; negative for refund if applicable
    note?: string; // Optional short note or memo
  }>;

  // ISO 4217 currency code used for all amounts (e.g., "USD", "EUR")
  currency: string;

  // Primary interaction for this panel: open the full transaction list for the category
  // Triggered by "View All" CTA in the panel header or footer.
  viewAllAction: {
    type: "view_all_transactions";
    payload: { categoryId: string };
  };

  // Optional: Show/hide a compact 3-point trend line for surplus/deficit
  // Default: true (trend shown if data present)
  showTrendLine?: boolean;

  // Optional: Overspend alert threshold as a fraction of budget
  // Example: 0.1 means highlight when actual > budget * 1.10
  // Default: 0.0 (only flag when actual > budget)
  alertThresholdRatio?: number;
}

interface CardSourceOption {
  id: string; // Unique card/account id, e.g., "card_visa_123"
  label: string; // User-facing label, e.g., "Chase Sapphire"
  iconUrl?: string; // Optional small icon for the card brand
}

interface PeriodFilterBarProps {
  id: string; // Unique id for this filter bar instance, e.g., "budget-dev-filter"
  title: string; // Short header, e.g., "Filters" or "Time & Cards"

  monthsOptions: number[]; // Preset windows to choose from, e.g., [3, 6, 12]
  selectedMonths: number; // Currently active window, e.g., 3

  cardOptions: CardSourceOption[]; // Cards/accounts available to include in the comparison
  selectedCardIds: string[]; // Currently selected card ids; empty means "no cards" (caller may treat as "all" if desired)

  // Emitted when user changes months or toggles cards.
  // The host should refresh the dashboard using the provided payload.
  // Example payloads:
  // - { type: "update_filters", payload: { months: 6 } }
  // - { type: "update_filters", payload: { cardIds: ["card_visa_123", "card_mac_001"] } }
  // - { type: "update_filters", payload: { months: 12, cardIds: ["card_visa_123"] } }
  onChangeAction: {
    type: "update_filters";
    payload: {
      months?: number; // If provided, new selectedMonths value
      cardIds?: string[]; // If provided, new selectedCardIds
    };
  };

  // Optional configuration
  allowMultiCard?: boolean; // Default: true. If false, enforce single-select for cards.
  helpText?: string; // Optional helper text, e.g., "Select a time window and which cards to include."
}

interface BudgetAdjustmentPromptProps {
  // Unique category identifier (used for routing/analytics/actions)
  // Example: "cat_groceries_123"
  categoryId: string;

  // Human-readable category name
  // Example: "Groceries"
  categoryName: string;

  // Current budget amount for the category (major units)
  // Example: 350.00
  currentBudget: number;

  // Suggested new budget based on deviation analysis (major units)
  // Example: 420.00
  suggestedBudget: number;

  // ISO 4217 currency code
  // Example: "USD", "EUR", "JPY"
  currency: string;

  // Short rationale explaining why the suggestion was made
  // Example: "Spending has exceeded budget by 18% across the last 3 months."
  rationaleText?: string;

  // Optional icon for the category
  // Example: "https://cdn.app.com/icons/categories/groceries.png"
  iconUrl?: string;

  // Optional allowed edit range for validation and UI hints
  // Example: { min: 0, max: 2000 }
  limitRange?: { min: number; max: number };

  // Single action object to be dispatched on any interaction.
  // The UI will dispatch derived events by augmenting this action with a meta field.
  // Expected dispatched shapes:
  // - Accept suggested: { ...adjustAction, meta: { intent: "accept", amount: suggestedBudget } }
  // - Edit amount:      { ...adjustAction, meta: { intent: "edit", amount: number } }
  // - Dismiss:          { ...adjustAction, meta: { intent: "dismiss" } }
  // Note: amount is in major currency units.
  adjustAction: {
    type: "adjust_budget";
    payload: {
      // The category this adjustment applies to (should match categoryId)
      categoryId: string;
    };
  };
}