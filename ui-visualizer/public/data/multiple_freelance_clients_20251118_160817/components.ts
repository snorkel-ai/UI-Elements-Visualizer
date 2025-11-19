interface InvoiceOverviewDashboardProps {
  // Summary cards per client shown at the top of the dashboard
  clients: ClientSummary[]; // e.g., [{ id: "c_123", name: "Acme Co", avatarUrl: "...", totalOutstanding: 12500, lastInvoiceDate: "2025-10-03" }]

  // Full invoice list used for the status table and cash-flow timeline
  invoices: InvoiceRow[]; // Include all relevant invoices for the selected dateRange (component will filter by `filter`)

  // Current high-level filter applied to invoices
  filter: "all" | "paid" | "unpaid" | "overdue";

  // Date window used across cards/table/timeline. Use ISO 8601 dates.
  dateRange: DateRange; // e.g., { start: "2025-01-01", end: "2025-12-31", timezone: "UTC" }

  // Optional: how the cash-flow timeline aggregates values
  cashFlowGranularity?: "week" | "month"; // default "month"

  // Optional: override currency display if invoices contain mixed currencies; otherwise uses invoice.currency
  currency?: string; // ISO 4217 code, e.g., "USD", "EUR"

  // Optional: initial or current sort for the invoice status table
  invoiceSort?: {
    field: "dueDate" | "issueDate" | "amount" | "status";
    direction: "asc" | "desc";
  };

  // Actions (dispatched by the component). The component will extend these with payload fields.

  // Dispatched when user changes the filter or date range in the UI
  // Payload example: { type: "invoice_dashboard/change_filter", filter: "overdue" }
  changeFilterAction: { type: "invoice_dashboard/change_filter" };

  // Dispatched when a client card is clicked
  // Payload example: { type: "invoice_dashboard/select_client", clientId: "c_123" }
  selectClientAction: { type: "invoice_dashboard/select_client" };

  // Dispatched when an invoice row is clicked in the table
  // Payload example: { type: "invoice_dashboard/select_invoice", invoiceId: "inv_789" }
  selectInvoiceAction: { type: "invoice_dashboard/select_invoice" };

  // Optional: dispatched when user marks an invoice as paid from the table
  // Payload example: { type: "invoice_dashboard/mark_invoice_paid", invoiceId: "inv_789", paidDate: "2025-11-15" }
  markInvoicePaidAction?: { type: "invoice_dashboard/mark_invoice_paid" };
}

/* Supporting Types */

interface ClientSummary {
  id: string; // Stable client identifier
  name: string; // Display name
  avatarUrl?: string; // Optional logo/avatar for the client card
  totalOutstanding: number; // Sum of unpaid/overdue amounts within the dateRange
  lastInvoiceDate?: string; // ISO date of most recent invoice for the client
}

interface InvoiceRow {
  id: string; // Invoice identifier
  clientId: string; // Matches a ClientSummary.id
  number: string; // Human-readable invoice number (e.g., "INV-2025-0042")
  issueDate: string; // ISO date
  dueDate: string; // ISO date
  amount: number; // Total invoice amount
  currency: string; // ISO 4217 code (e.g., "USD")
  status: "paid" | "unpaid" | "overdue" | "partial";
  tags?: string[]; // Optional labels (e.g., ["retainer", "design"])
}

interface DateRange {
  start: string; // ISO 8601 date (inclusive)
  end: string; // ISO 8601 date (inclusive)
  timezone?: string; // e.g., "UTC" or "America/New_York" for consistent cash-flow bucketing
}

interface ClientCardProps {
  id: string; // Unique client id. Example: "cl_42af82"
  name: string; // Display name. Example: "Acme Creative Studio"

  outstandingBalanceCents: number; 
  // Total unpaid balance for this client in minor units (cents).
  // Example: 125000 for $1,250.00. Currency assumed from app context.

  overdueCount: number; 
  // Number of invoices past their due date. Example: 3

  nextDueDate: string; 
  // Next upcoming invoice due date in ISO format (YYYY-MM-DD).
  // Example: "2025-12-05"

  status: "good" | "attention";
  // "good" = no issues or manageable; "attention" = has overdue items or approaching due date.

  avatarUrl?: string; 
  // Optional client avatar/logo. Example: "https://cdn.example.com/avatars/acme.png"

  selectAction: { 
    // Triggered when the card is clicked/tapped to drill into the client's detail view.
    // Use id above as the client identifier in payload.
    type: "select_client";
    clientId: string; // should match the 'id' field
  };
}

interface InvoiceStatusTableProps {
  invoices: Array<{
    id: string; // Unique stable ID for the invoice (e.g., "inv_1024_a")
    invoiceNumber: string; // Human-friendly number shown in the table (e.g., "INV-1024")
    clientName: string; // Display name (e.g., "Acme Co.")
    issueDate: string; // ISO 8601 date (e.g., "2025-01-15")
    dueDate: string; // ISO 8601 date (e.g., "2025-02-14")
    amount: number; // Amount in minor units to avoid FP errors (e.g., 125000 for $1,250.00)
    currency: string; // ISO 4217 code (e.g., "USD", "EUR")
    status: "paid" | "unpaid" | "overdue";
    daysOverdue?: number; // Only present when status = "overdue" (e.g., 12)
  }>;
  // Optional initial sort applied on first render
  initialSort?: {
    field:
      | "invoiceNumber"
      | "clientName"
      | "issueDate"
      | "dueDate"
      | "amount"
      | "status"
      | "daysOverdue";
    direction: "asc" | "desc"; // Default suggested: "desc" for dates/amounts
  };
  // Optional filter to pre-limit rows; "all" shows everything
  statusFilter?: "all" | "paid" | "unpaid" | "overdue"; // Default: "all"

  // Action objects to be dispatched by the parent system when interactions occur.
  // The component will attach contextual fields (e.g., invoiceId, sort field) before dispatch.
  actions?: {
    // Triggered when a row is clicked; component augments with { invoiceId: string }
    rowClick?: { type: "invoice_row_click" };

    // Triggered when user sorts a column; component augments with { field, direction }
    sort?: { type: "sort_invoices" };

    // Triggered when user changes status filter; component augments with { status }
    statusFilterChange?: { type: "filter_status" };

    // Triggered when user marks an invoice paid; component augments with { invoiceId: string }
    markPaid?: { type: "mark_invoice_paid" };
  };
}

interface CashflowTimelineProps {
  // Primary time-series data. Dates must be ISO-8601 (YYYY-MM-DD).
  // expected: total amount anticipated on that date; received: amount actually paid on that date.
  // relatedInvoiceIds can be used to drill into invoices contributing to a point.
  dataPoints: CashflowPoint[];

  // Time bucketing for the chart. "week" groups by ISO week, "month" groups by calendar month.
  granularity: "week" | "month";

  // Visible window for the timeline (inclusive). Use ISO-8601 dates (YYYY-MM-DD).
  dateRange: {
    start: string; // e.g., "2025-01-01"
    end: string;   // e.g., "2025-03-31"
  };

  // Currency code for amounts. ISO 4217 (e.g., "USD", "EUR").
  currency: string;

  // If true, show cumulative totals (running sum) for expected vs received.
  // If false or omitted, show period totals per bucket.
  showCumulative?: boolean;

  // If true, visually flag gaps where received < expected within a bucket or cumulatively (depending on mode).
  highlightGaps?: boolean;

  // Minimum shortfall (in currency units) to consider a "gap" when highlightGaps is true.
  // Example: 100 means only highlight when expected - received >= 100. Default assumed 0.
  gapThreshold?: number;

  // Optional markers for notable events (e.g., big invoice due, tax payment).
  // Rendered as vertical flags or dots with a label.
  markers?: TimelineMarker[];

  // Dispatched when the user pans/zooms or otherwise changes the visible range.
  // The component fills in start/end of the new range.
  onRangeChangeAction: {
    type: "range_change";
    start: string; // ISO date
    end: string;   // ISO date
  };

  // Dispatched when a user clicks/taps a data point (bucket).
  // The component fills in the date (bucket key) and any related invoice IDs if available.
  onPointClickAction?: {
    type: "point_click";
    date: string; // ISO date representing the bucket
    relatedInvoiceIds?: string[];
  };

  // Dispatched when the user switches between "week" and "month" views via in-component controls.
  onGranularityChangeAction?: {
    type: "granularity_change";
    granularity: "week" | "month";
  };
}

// A single point on the timeline. Dates should align with the chosen granularity.
// For "week", date can represent the week start (e.g., Monday). For "month", use the month start.
interface CashflowPoint {
  date: string; // ISO-8601, e.g., "2025-02-01"
  expected: number; // Anticipated inflow amount for that bucket
  received: number; // Actual inflow amount for that bucket
  // Optional IDs to help downstream UIs show invoice details for this point.
  relatedInvoiceIds?: string[];
}

// Marker for notable events on the timeline (deadlines, large invoices, payouts, taxes).
interface TimelineMarker {
  date: string; // ISO-8601
  label: string; // Short description, e.g., "Invoice #104 due"
  iconUrl?: string; // Optional small icon shown with the marker
}

interface PaymentStatusFilterProps {
  // Currently selected filter value.
  // Accepted values:
  // - "all": show every invoice
  // - "paid": show only paid invoices
  // - "unpaid": show invoices not yet paid and not past due
  // - "overdue": show invoices past their due date and unpaid
  // Example: "unpaid"
  value: 'all' | 'paid' | 'unpaid' | 'overdue';

  // Badge counts for each filter option to help users gauge workload at a glance.
  // Use non-negative integers. When loading, you may pass 0 or omit via `loading: true`.
  // Example: { all: 42, paid: 18, unpaid: 20, overdue: 4 }
  counts: {
    all: number;
    paid: number;
    unpaid: number;
    overdue: number;
  };

  // Dispatched when the user selects a new filter.
  // Consumers should handle this action (e.g., via a controller or global dispatcher)
  // to update application state and re-fetch or filter data accordingly.
  // Example dispatch: { type: "set_payment_status_filter", value: "overdue" }
  onChangeAction: {
    type: 'set_payment_status_filter';
    value: 'all' | 'paid' | 'unpaid' | 'overdue';
  };

  // Optional: disable user interaction (e.g., during mutation or when not applicable).
  // Default: false
  disabled?: boolean;

  // Optional: show a loading state for counts while data is fetched.
  // When true, the component may render skeletons or placeholders for counts.
  // Default: false
  loading?: boolean;
}

interface PaymentRecordFormProps {
  // The invoice to record a payment against (must be a known invoice ID)
  // Example: "inv_2024_0042"
  invoiceId: string;

  // A smart suggestion for the amount to prefill (e.g., last partial amount or full due)
  // Major currency units. Example: 250.00
  suggestedAmount: number;

  // Current remaining amount due on the invoice (used for context/validation)
  // Major currency units. Example: 750.00
  dueAmount: number;

  // Prefilled payment date in ISO format (YYYY-MM-DD). Defaults to today's date if omitted.
  // Example: "2025-11-19"
  defaultDate?: string;

  // Prefilled payment method. If omitted, the form may select a sensible default (e.g., "bank").
  defaultMethod?: "bank" | "card" | "cash" | "other";

  // Primary interaction: submitting a payment record.
  // The UI should dispatch this action with the finalized payload when the user confirms.
  onSubmitAction: {
    type: "submit_payment";
    payload: {
      // Echo the invoiceId being paid (helps stateless handlers route correctly)
      invoiceId: string;

      // Payment amount in major currency units. Typically 0 < amount <= dueAmount.
      amount: number;

      // ISO date string (YYYY-MM-DD) representing when the payment was made.
      date: string;

      // Chosen payment method
      method: "bank" | "card" | "cash" | "other";

      // Optional free text for references, transaction IDs, or notes visible in the ledger.
      // Example: "Paid via ACH, ref #1234"
      notes?: string;
    };
  };

  // Optional: currency code used for display/formatting. Defaults to app-level currency if omitted.
  // Example: "USD", "EUR", "GBP"
  currencyCode?: string;

  // Optional: whether to show a notes input field. Defaults to true in most UIs.
  allowNotes?: boolean;
}