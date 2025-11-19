interface RenovationBudgetDashboardProps {
  // Overall budget context
  totalBudget: number; // Total planned budget for the renovation (e.g., 45000)
  totalActual?: number; // Optional overall actual spend; if omitted, component may sum from lineItems/payments
  currency: string; // ISO 4217 code (e.g., "USD", "EUR", "GBP")

  // Primary data feeds
  lineItems: LineItem[]; // Budget vs actual bars by line item (e.g., "Cabinets", "Appliances")
  payments: Payment[]; // Payment schedule table rows
  contractors: Contractor[]; // Contractor cards with status summaries

  // Display/config variants
  chartMode?: "by_line_item" | "by_contractor"; // Default "by_line_item" if omitted
  dateFormat?: "iso" | "local"; // "iso" => YYYY-MM-DD; "local" => browser/locale-aware formatting
  overdueThresholdDays?: number; // Highlight payments due within N days as "upcoming" and past due as "overdue" (e.g., 7)

  // Interaction: action descriptors (component dispatches with payloads)
  // The component will emit events with these types and payloads.
  // Example dispatch for selectLineItemAction:
  // { type: selectLineItemAction.type, lineItemId: "li_123" }
  selectLineItemAction?: { type: "select_line_item" };

  // Payment create/update. Example dispatches:
  // { type: paymentAction.type, action: "record_payment", payment: { id: "p_new", contractorId: "c1", amount: 1200, dueDate: "2025-01-15", status: "scheduled" } }
  // { type: paymentAction.type, action: "update_payment", paymentId: "p_123", patch: { status: "paid" } }
  paymentAction?: { type: "record_payment" | "update_payment" };

  // Contractor status changes. Example dispatch:
  // { type: updateContractorStatusAction.type, contractorId: "c1", status: "on_hold" }
  updateContractorStatusAction?: { type: "update_contractor_status" };
}

/* ----- Supporting Types ----- */

interface LineItem {
  id: string; // Stable identifier (e.g., "li_cabinets")
  name: string; // Display name (e.g., "Cabinets")
  estimate: number; // Planned amount for this line item
  actual?: number; // Actual spend to date for this line item
  // Optional linkage for detail views
  contractorId?: string; // If primarily associated with a contractor
}

type PaymentStatus = "scheduled" | "paid" | "overdue" | "pending_approval";

interface Payment {
  id: string; // Unique payment id
  contractorId: string; // Must match a Contractor.id
  dueDate: string; // ISO date string (YYYY-MM-DD)
  amount: number; // Amount in the given currency
  status: PaymentStatus;
  memo?: string; // Optional note (e.g., "50% deposit", "Inspection passed")
}

type ContractorStatus = "active" | "on_hold" | "completed" | "cancelled";

interface Contractor {
  id: string; // Unique contractor id
  name: string; // Contractor or company name
  status: ContractorStatus;
  allocatedBudget?: number; // Budget allocated to this contractor
  spentToDate?: number; // Actual spend attributed to this contractor
  nextPaymentDue?: string; // ISO date for next scheduled payment
  logoUrl?: string; // Optional contractor logo/avatar image URL
}

interface BudgetVsActualBarChartProps {
  // Primary data for the chart. Each item represents a line item in the renovation budget.
  // Example:
  // [
  //   { id: "cabinets", name: "Cabinets", estimate: 4500, actual: 5200, contractorName: "ABC Woodworks", paymentStatus: "partial" },
  //   { id: "appliances", name: "Appliances", estimate: 3500, actual: 3100 }
  // ]
  items: BudgetLineItem[];

  // ISO 4217 currency code used for formatting numbers (no symbol customization here).
  // Example: "USD", "EUR", "GBP", "CAD"
  currencyCode: string;

  // Presentation variant of the bar series:
  // - "grouped": estimate and actual appear as two side-by-side bars
  // - "stacked": estimate as baseline, actual stacked to show over/under visually
  variant?: "grouped" | "stacked";

  // Sorting configuration for items displayed along the axis.
  // - "variance" = actual - estimate (positive means over budget)
  // - "overUnder" = absolute difference |actual - estimate|
  sortBy?: "name" | "estimate" | "actual" | "variance" | "overUnder";
  sortOrder?: "asc" | "desc";

  // Show a variance label per item (e.g., "+$700 over" or "-$250 under").
  showVariance?: boolean;

  // Highlights items considered over budget. When true, bars that exceed the threshold get emphasized.
  highlightOverBudget?: boolean;

  // Percentage (0–100) by which actual can exceed estimate before being considered "over budget".
  // Example: 0 means any amount over is highlighted; 5 means allow up to +5% slack.
  overBudgetThresholdPct?: number;

  // Cap how many items to render at once (for readability/performance). Excess items are omitted by the component.
  maxVisibleItems?: number;

  // Tooltip detail level:
  // - "auto": chooses based on available width
  // - "compact": minimal fields (estimate, actual, variance)
  // - "detailed": includes contractor/payment info if available
  tooltipMode?: "auto" | "compact" | "detailed";

  // Locale used for number formatting (fallbacks to environment if not provided).
  // Example: "en-US", "fr-FR"
  locale?: string;

  // Action dispatched when a user selects/clicks a bar for a specific line item.
  // The component will append { itemId: string } of the clicked item when dispatching.
  // Example provided action: { type: "select_line_item" } or { type: "open_item_detail" }
  onItemSelectAction?: {
    type: "select_line_item" | "open_item_detail";
  };
}

// Represents a single budget line item used by the chart.
interface BudgetLineItem {
  id: string; // unique key, e.g., "cabinets"
  name: string; // display label, e.g., "Cabinets"
  estimate: number; // planned cost in currency units (not cents)
  actual: number; // actual cost to date in currency units
  contractorName?: string; // optional metadata shown in detailed tooltip
  paymentStatus?: "unpaid" | "partial" | "paid"; // optional payment indicator for context
}

interface PaymentScheduleTableProps {
  // List of scheduled/completed payments to render in the table
  // Example:
  // [
  //   {
  //     id: "pay_101",
  //     contractorId: "ctr_1",
  //     contractorName: "Bright Kitchens Co.",
  //     dueDate: "2025-12-05",
  //     amount: 3500,
  //     status: "pending",
  //     markPaidAction: { type: "mark_paid", payload: { id: "pay_101" } },
  //     editPaymentAction: { type: "edit_payment", payload: { id: "pay_101" } }
  //   }
  // ]
  payments: PaymentScheduleItem[];

  // ISO 4217 currency code used for displaying amounts (e.g., "USD", "EUR", "GBP")
  currency: string;

  // Initial sorting configuration for the table
  // Default: { by: "dueDate", direction: "asc" }
  defaultSort?: {
    by: "dueDate" | "amount" | "status" | "contractorName";
    direction?: "asc" | "desc";
  };

  // If true, visually emphasize overdue rows (e.g., red text/badge)
  // Default: true
  highlightOverdue?: boolean;

  // Show a totals row (e.g., sum of pending vs. paid)
  // Default: true
  showTotalsRow?: boolean;
}

interface PaymentScheduleItem {
  // Unique payment id
  id: string;

  // Contractor identifiers (name is optional if you only want to show ID)
  contractorId: string;
  contractorName?: string;

  // Optional contractor avatar/logo for quick visual identification
  contractorAvatarUrl?: string;

  // Due date in ISO 8601 format (YYYY-MM-DD) for consistent parsing
  // Example: "2025-12-05"
  dueDate: string;

  // Amount in major currency units (e.g., 3500 = $3,500.00)
  amount: number;

  // Current status of the payment
  status: "pending" | "paid" | "overdue";

  // Primary actions represented as action objects (no callbacks)
  // Invoked by the UI when the user clicks "Mark Paid" or "Edit"
  // Note: Include only those actions that make sense for the row status.
  // For example, omit markPaidAction if status === "paid".
  markPaidAction?: { type: "mark_paid"; payload: { id: string } };
  editPaymentAction?: { type: "edit_payment"; payload: { id: string } };
}

// Home Renovation Budget Tracker - Contractor summary card
// Use this to render a compact card with key budget/status info and a single primary action.
// Notes:
// - Currency amounts are numbers in the project currency (e.g., 25000.5 represents $25,000.50 if USD).
// - Dates should be ISO 8601 strings (e.g., "2025-12-01") for easy serialization.

type ContractorStatus = "active" | "pending" | "paused" | "completed";

type ContractorCardAction =
  | {
      type: "open_contractor_details";
      payload: { id: string }; // e.g., { id: "ctr_123" }
    }
  | {
      type: "update_contractor_status";
      payload: {
        id: string; // contractor id
        status: ContractorStatus; // new status to apply
      };
    };

interface ContractorCardProps {
  id: string; // Unique contractor id (e.g., "ctr_123")
  name: string; // Display name (e.g., "Acme Cabinets, LLC")
  status: ContractorStatus; // Current lifecycle status

  allocatedBudget: number; // Total budget allocated to this contractor (e.g., 25000)
  spentToDate: number; // Amount already paid/spent (e.g., 12000.75)

  nextPaymentDue?: string; // ISO date for the next scheduled payment (e.g., "2025-11-30"); omit if none
  imageUrl?: string; // Optional logo/avatar URL for the contractor

  action?: ContractorCardAction; // Primary interaction for the card (open details or update status)
}

interface RemainingBudgetIndicatorProps {
  totalBudget: number; // Total planned budget for the renovation (major currency units). Example: 25000
  totalActual: number; // Total actual spend to date (major currency units). Example: 18250
  remaining: number; // Remaining budget = totalBudget - totalActual. Example: 6750
  currency: string; // ISO 4217 currency code. Examples: "USD", "EUR", "GBP"
  trend: "up" | "down" | "flat"; // Budget health trend: "up" = improving (spending slowing), "down" = worsening, "flat" = steady
}