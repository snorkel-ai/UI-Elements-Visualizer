interface SavingsGoalOverviewProps {
  // Unique identifier for the savings goal (e.g., "goal_emer_fund_001")
  goalId: string;

  // Display name of the goal (e.g., "Emergency Fund")
  goalName: string;

  // Target amount for the goal in major currency units (e.g., 10000 for $10,000)
  targetAmount: number;

  // Current saved amount in major currency units (e.g., 2500 for $2,500)
  currentSavings: number;

  // Optional currency code for display formatting (default: "USD")
  // Examples: "USD", "EUR", "GBP"
  currencyCode?: string;

  // Optional icon for the goal; displayed alongside the goal name
  // Example: "https://cdn.example.com/icons/emergency-fund.png"
  iconUrl?: string;

  // Scenario options to compare timelines and contributions
  scenarios: SavingsScenario[];

  // The scenario currently highlighted/selected in the UI
  // Example: "baseline"
  selectedScenarioId?: string;

  // Action dispatched when a scenario is selected by the user
  // Component will dispatch with the chosen scenarioId
  // Example payload: { type: "select_scenario", payload: { scenarioId: "aggressive" } }
  selectScenarioAction: {
    type: "select_scenario";
    payload: { scenarioId: string };
  };

  // Optional sorting preference for the scenarios panel
  // "months" sorts by fastest completion; "contribution" sorts by lowest monthly contribution
  // Default: "months"
  sortBy?: "months" | "contribution";
}

interface SavingsScenario {
  // Unique scenario id (e.g., "baseline", "aggressive", "custom_1")
  id: string;

  // Label shown in the UI (e.g., "Baseline", "Aggressive", "Custom Plan")
  label: string;

  // Planned monthly contribution in major currency units (e.g., 400 for $400/month)
  monthlyContribution: number;

  // Number of months needed to reach the goal under this scenario (integer)
  monthsToGoal: number;

  // ISO 8601 date string representing projected completion date (e.g., "2026-03-01")
  completionDate: string;

  // Data series for the comparison chart
  // Points should be ordered by time (ascending)
  seriesPoints: SavingsSeriesPoint[];
}

interface SavingsSeriesPoint {
  // Month identifier for the data point
  // Prefer "YYYY-MM" (e.g., "2025-01"). Full ISO date is also acceptable.
  month: string;

  // Projected balance at this point in time in major currency units
  balance: number;
}

interface ScenarioComparisonChartProps {
  // Overall goal target used for the horizontal goal line and contextual tooltips
  // Example: 10000
  targetAmount: number;

  // ISO 4217 code used for currency formatting on the y-axis and tooltips
  // Example: "USD"
  currencyCode: string;

  // Multiple contribution scenarios to compare over time
  scenarios: ScenarioSeries[];

  // Optional initial/persisted zoom window in months (x-axis is months from start: 0,1,2,...)
  // Example: { startMonth: 0, endMonth: 36 }
  xDomain?: {
    startMonth: number;
    endMonth: number;
  };

  // Toggle showing the horizontal goal target line
  // Default assumed true if omitted
  showGoalLine?: boolean;

  // Toggle showing legend with scenario labels and color swatches
  // Default assumed true if omitted
  showLegend?: boolean;

  // Scenario that is currently pinned/selected for emphasis and reference lines
  // Example: "aggressive_plan" or null
  pinnedScenarioId?: string | null;

  // Scenario that is currently hovered for preview highlighting
  // Example: "baseline_plan" or null
  highlightedScenarioId?: string | null;

  // Action dispatched when user hovers a scenario (line or legend item)
  // Component sets scenarioId to a concrete id or null on mouse leave
  // Example emitted: { type: "hover_scenario", scenarioId: "baseline_plan" }
  onHoverScenarioAction?: {
    type: "hover_scenario";
    scenarioId: string | null;
  };

  // Action dispatched when user selects (pins) a scenario
  // Component sets scenarioId to the selected id
  // Example emitted: { type: "select_scenario", scenarioId: "aggressive_plan" }
  onSelectScenarioAction?: {
    type: "select_scenario";
    scenarioId: string;
  };

  // Action dispatched when the visible month window changes (e.g., via zoom/pan)
  // Example emitted: { type: "change_viewport", startMonth: 0, endMonth: 24 }
  onViewportChangeAction?: {
    type: "change_viewport";
    startMonth: number;
    endMonth: number;
  };

  // Short, user-visible purpose label for screen readers
  // Example: "Savings scenarios comparison chart"
  accessibilityLabel: string;
}

// A single scenario's time series describing balance growth over months
interface ScenarioSeries {
  // Unique id used for interactions and linking with legend
  // Example: "baseline_plan"
  id: string;

  // Human-readable label shown in legend and tooltips
  // Example: "Baseline: $250/mo"
  label: string;

  // Optional hex color for the scenario line and legend swatch
  // Example: "#3B82F6"
  colorHex?: string;

  // Monthly balances; month is an integer offset from start (0 = current month)
  // Example point: { month: 6, balance: 1750 }
  seriesPoints: ScenarioPoint[];

  // Optional month (0-based) when this scenario first reaches or exceeds targetAmount
  // Used to render completion markers and date callouts
  // Example: 22
  projectedCompletionMonth?: number;
}

// A single data point on the time series
interface ScenarioPoint {
  // Integer month index from the start of the plan (0, 1, 2, ...)
  month: number;

  // Projected balance at the end of this month
  balance: number;
}

interface MonthlyContributionTableProps {
  // Unique identifier of the savings goal for analytics/syncing with other components
  // Example: "goal_emergency_fund_2025"
  goalId: string;

  // Target amount for the goal, in the specified currency units (not cents)
  // Example: 10000 means $10,000 if currencyCode is "USD"
  goalAmount: number;

  // Default currency for rendering monetary values
  // Example: "USD" | "EUR" | "JPY"
  currencyCode?: string;

  // Rows representing different contribution scenarios to compare
  scenarios: MonthlyContributionScenario[];

  // Initial sort configuration for the table
  // If omitted, implementations may default to sorting by monthsToGoal ascending
  defaultSort?: {
    by: "monthlyContribution" | "monthsToGoal";
    direction?: "asc" | "desc"; // Default: "asc"
  };

  // Optional: which scenario is currently selected (to sync with charts/cards)
  selectedScenarioId?: string;

  // Action dispatched when a row is selected in the table
  // Example payload: { scenarioId: "s1" }
  onSelectAction: {
    type: "select_scenario";
    payload: { scenarioId: string };
  };

  // If true, show a Total Contributed column when provided in scenarios
  // Default: false (only show when explicitly enabled)
  showTotalContributed?: boolean;
}

// A single scenario row for the table
interface MonthlyContributionScenario {
  // Unique scenario identifier
  // Example: "s1"
  id: string;

  // User-facing label for the scenario
  // Example: "Aggressive", "Balanced", "Conservative", or "Auto-calculated"
  label: string;

  // Monthly contribution amount in currency units (not cents)
  // Example: 500 means $500/month
  monthlyContribution: number;

  // Number of months required to reach the goal with this scenario
  // Example: 20
  monthsToGoal: number;

  // ISO 8601 date string for the projected completion
  // Example: "2026-04-01"
  completionDate: string;

  // Optional: total amount contributed by completion (can differ from goalAmount due to rounding/scheduling)
  // Example: 10000 or 9950
  totalContributed?: number;
}

interface CompletionDateCardsProps {
  // List of scenario summaries to render as completion-date cards.
  // Example: [{ id: "balanced", label: "Balanced Plan", completionDate: "2026-09-01", monthsToGoal: 18, monthlyContribution: 550 }]
  scenarios: ScenarioSummary[];

  // Presentation density. "compact" shows essentials; "detailed" can include months and contribution details.
  // Default: "compact"
  variant?: "compact" | "detailed";

  // ISO 4217 currency code for monthlyContribution display.
  // Default: "USD"
  currencyCode?: string;

  // Optional scenario id to pre-select/focus when the component mounts.
  // Example: "balanced"
  initialSelectedId?: string;
}

interface ScenarioSummary {
  // Unique id for the scenario. Used for selection/pinning actions.
  // Example: "aggressive_1"
  id: string;

  // Short label for the scenario.
  // Examples: "Aggressive", "Balanced", "Conservative"
  label: string;

  // When this scenario is projected to hit the goal.
  // ISO 8601 date string (YYYY-MM-DD). Example: "2026-03-01"
  completionDate: string;

  // Number of months from now to reach the goal.
  // Example: 18
  monthsToGoal: number;

  // Monthly contribution required for this scenario.
  // Example: 550 (interpreted with currencyCode)
  monthlyContribution: number;

  // Optional icon for the card (e.g., scenario badge).
  // Example: "https://cdn.example.com/icons/rocket.png"
  iconUrl?: string;

  // Primary interaction to focus/select a scenario card.
  // Frameworks can dispatch this action when the card is clicked.
  // Example: { type: "select_scenario", payload: { id: "aggressive_1" } }
  selectAction: {
    type: "select_scenario";
    payload: { id: string };
  };

  // Optional secondary interaction to pin/favorite a scenario.
  // Example: { type: "pin_favorite_scenario", payload: { id: "aggressive_1" } }
  pinAction?: {
    type: "pin_favorite_scenario";
    payload: { id: string };
  };
}

interface TimelineAdjusterProps {
  // Total savings goal (e.g., 10000 for $10,000). Assumed in the currency below.
  targetAmount: number;

  // Amount already saved toward the goal (e.g., 2500).
  currentSavings: number;

  // ISO 4217 currency code used for display and calculations (e.g., "USD", "EUR").
  currencyCode: string;

  // Determines which input the user controls:
  // - "date": user sets a target completion date; component computes monthly contribution
  // - "budget": user sets a monthly budget; component computes completion date
  inputMode: "date" | "budget";

  // When inputMode = "date", this is the target completion date (inclusive).
  // ISO 8601 date string (YYYY-MM-DD), e.g., "2026-12-01".
  selectedDate?: string;

  // When inputMode = "budget", this is the intended monthly contribution (e.g., 400).
  monthlyBudget?: number;

  // Optional list of precomputed scenarios to compare/apply.
  // Useful to show a comparison chart or cards (e.g., conservative vs. aggressive plans).
  scenarios?: ScenarioItem[];

  // Validation and guardrails for inputs. Helps the component enforce feasible ranges.
  validation?: ValidationConfig;

  // Emitted when user requests computation of the counterpart value.
  // If inputMode = "date", component emits compute_monthly_contribution with the chosen date.
  // If inputMode = "budget", component emits compute_completion_date with the chosen budget.
  // The host app should perform/confirm the calculation and update state as needed.
  computeAction: ComputeAction;

  // Emitted when user applies one of the provided scenarios as the active plan.
  // Typically triggers updating the main planner state and refreshing projections.
  applyScenarioAction?: ApplyScenarioAction;

  // Emitted when user selects (highlights) a scenario for comparison (without applying it).
  // Useful for syncing selection across charts/tables.
  selectScenarioAction?: SelectScenarioAction;

  // If true, component shows projected completion date cards and progress summary.
  // If false, keeps the UI minimal (input + key result).
  showProjectionCards?: boolean;
}

/* ----- Supporting Types ----- */

// Represents a single scenario option to compare/apply.
interface ScenarioItem {
  id: string; // Unique identifier (e.g., "fast_track", "baseline")
  label: string; // Display name (e.g., "Baseline", "Aggressive", "Stretch")
  monthlyContribution: number; // Planned monthly contribution for this scenario
  projectedCompletionDate: string; // ISO date the goal is expected to complete
  iconUrl?: string; // Optional icon representing the scenario
  // Example:
  // { id: "baseline", label: "Baseline", monthlyContribution: 350, projectedCompletionDate: "2026-11-01" }
}

// Input guardrails and stepping for the component.
interface ValidationConfig {
  // Minimum/maximum allowed monthly contribution (e.g., 50 to 5000).
  minMonthly?: number;
  maxMonthly?: number;

  // Earliest/latest allowed completion date (ISO date). Helps bound the date picker.
  earliestDate?: string; // e.g., "2025-01-01"
  latestDate?: string;   // e.g., "2030-12-31"

  // Optional increment for budget adjustments (e.g., step of 25).
  stepMonthly?: number;
}

// Action emitted to request or confirm computation of the counterpart value.
// The host app can treat this as:
// - a command to compute and update state, or
// - a notification that the component computed locally and is sharing results.
type ComputeAction =
  | {
      type: "compute_monthly_contribution";
      payload: {
        targetAmount: number;
        currentSavings: number;
        completionDate: string; // ISO date
        currencyCode: string;
      };
    }
  | {
      type: "compute_completion_date";
      payload: {
        targetAmount: number;
        currentSavings: number;
        monthlyBudget: number;
        currencyCode: string;
      };
    };

// Action emitted when the user applies a chosen scenario to become the active plan.
interface ApplyScenarioAction {
  type: "apply_savings_scenario";
  payload: {
    scenarioId: string;
  };
}

// Action emitted when the user selects a scenario for comparison/highlight (not applied).
interface SelectScenarioAction {
  type: "select_scenario_for_comparison";
  payload: {
    scenarioId: string;
  };
}