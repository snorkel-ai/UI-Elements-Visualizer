interface SubscriptionAuditTableProps {
  // List of subscriptions to display (one row per item)
  // Example item: {
  //   id: "sub_123",
  //   name: "Netflix",
  //   provider: "Netflix, Inc.",
  //   iconUrl: "https://logo.clearbit.com/netflix.com",
  //   currentMonthlyCost: 19.99,
  //   lastIncreaseDate: "2024-08-15", // ISO 8601 (YYYY-MM-DD)
  //   lastIncreasePercent: 11.1,
  //   usageEstimate: "medium",
  //   potentialMonthlySavingsIfCanceled: 19.99,
  //   cancelUrl: "https://www.netflix.com/cancel",
  //   duplicateGroupKey: "netflix_email_a@example.com"
  // }
  items: SubscriptionAuditItem[];

  // Single action object used for all interactions.
  // The component will dispatch copies of this action with a payload describing the user event.
  // Example dispatched payloads:
  // - { event: "row_open_details", itemId: "sub_123" }
  // - { event: "row_toggle_select", itemId: "sub_123", selected: true }
  // - { event: "apply_sort", sortBy: "currentMonthlyCost" }
  // - { event: "apply_filter", filterMode: "duplicates" }
  // - { event: "open_cancel_url", itemId: "sub_123", url: "https://..." }
  // - { event: "view_aggregate_savings", selectedIds: ["sub_1","sub_2"], totalMonthlySavings: 34.98 }
  onEventAction: {
    type: "subscription_audit_event";
    // The component will populate payload at runtime per interaction
    payload?: unknown;
  };

  // Initial sort to apply on first render
  // Defaults: "currentMonthlyCost"
  defaultSort?: "currentMonthlyCost" | "lastIncreasePercent";

  // Initial filter mode
  // - "all": show everything
  // - "duplicates": show likely duplicates (same duplicateGroupKey)
  // - "price_increased": show items with a recent increase (has lastIncreasePercent > 0)
  // Defaults: "all"
  filterMode?: "all" | "duplicates" | "price_increased";

  // Optional selection configuration
  // Use to pre-select rows and show aggregate savings by default
  selection?: {
    initiallySelectedIds?: string[]; // Example: ["sub_123", "sub_456"]
  };

  // Currency code used for amounts (ISO 4217).
  // Defaults: "USD"
  currency?: string;

  // Whether to show the inline savings calculator for selected items
  // Defaults: true
  showSavingsCalculator?: boolean;
}

/* Supporting types */

interface SubscriptionAuditItem {
  id: string; // Unique row identifier (e.g., normalized subscription ID)
  name: string; // Display name (e.g., "Spotify Premium")
  provider: string; // Service provider (e.g., "Spotify AB")
  iconUrl?: string; // Optional icon/logo URL for the provider

  currentMonthlyCost: number; // Current recurring monthly cost (in currency minor units or decimal; assumes decimal)
  lastIncreaseDate?: string; // ISO date of the last detected price increase (e.g., "2024-07-01")
  lastIncreasePercent?: number; // Positive percent change since previous price (e.g., 12.5)

  usageEstimate: "low" | "medium" | "high"; // Heuristic usage category derived from statements
  potentialMonthlySavingsIfCanceled: number; // Estimated monthly savings if canceled (usually equals currentMonthlyCost)

  cancelUrl?: string; // Direct link to manage/cancel subscription (opens externally)
  duplicateGroupKey?: string; // Same value for items considered duplicates (e.g., normalized service+account)
}

interface SubscriptionDetailDrawerProps {
  id: string; // Unique subscription identifier (e.g., "sub_abc123")
  name: string; // Display name shown in the drawer title (e.g., "Spotify Premium")

  currentPrice: Money; // Current recurring price. Example: { amount: 12.99, currency: "USD" }
  billingCycle: "monthly" | "annual" | "weekly" | "custom"; // Primary cycle for normalization and UI badges

  priceChangeTimeline: PriceChangeEntry[]; 
  // Ordered list (newest first) of price changes for the timeline.
  // Example:
  // [
  //   { date: "2024-09-01", oldPrice: { amount: 10, currency: "USD" }, newPrice: { amount: 12, currency: "USD" }, reason: "Annual price update" },
  //   { date: "2023-09-01", oldPrice: { amount: 9, currency: "USD" }, newPrice: { amount: 10, currency: "USD" } }
  // ]

  usage: UsageSignals; 
  // Signals to estimate value/usage. Example:
  // { lastUsed: "2025-01-03", transactionsCount: 14 }

  cancelUrl?: string; 
  // Deep link where the user can manage/cancel (if available). Example: "https://provider.com/account/cancel"

  action: SubscriptionDetailAction; 
  // Single action object to wire interactions (no callbacks).
  // The renderer dispatches or routes based on discriminated union:
  // - { type: "view_timeline_item"; payload: { subscriptionId: string; date: string } }
  // - { type: "mark_decision"; payload: { subscriptionId: string; decision: "keep" | "cancel_consideration" } }
  // - { type: "add_note"; payload: { subscriptionId: string; note: string } }
  // - { type: "open_cancel_link"; payload: { subscriptionId: string } }
}

interface Money {
  amount: number; // Numeric amount in major units (e.g., 12.99)
  currency: string; // ISO 4217 (e.g., "USD", "EUR")
}

interface PriceChangeEntry {
  date: string; // ISO 8601 date (YYYY-MM-DD)
  oldPrice: Money;
  newPrice: Money;
  reason?: string; // Optional note (e.g., "Annual increase", "Promotion ended")
}

interface UsageSignals {
  lastUsed?: string; // ISO 8601 date of last detected use
  transactionsCount?: number; // Count of transactions in lookback window (e.g., 12 months)
}

type SubscriptionDetailAction =
  | {
      type: "view_timeline_item";
      payload: { subscriptionId: string; date: string };
    }
  | {
      type: "mark_decision";
      payload: { subscriptionId: string; decision: "keep" | "cancel_consideration" };
    }
  | {
      type: "add_note";
      payload: { subscriptionId: string; note: string };
    }
  | {
      type: "open_cancel_link";
      payload: { subscriptionId: string };
    };

interface SavingsCalculatorModalProps {
  // Primary identifiers for the subscription/context
  subscriptionId: string; // Unique ID for the subscription (e.g., "sub_12345")
  subscriptionName: string; // Human-readable name (e.g., "Spotify Premium")
  title: string; // Modal title (e.g., "Estimate Savings")

  // Key display fields
  currentMonthlyCost: number; // Current monthly cost in currency units (e.g., 12.99). Currency configured via `currency`.
  lastIncrease?: {
    date: string; // ISO 8601 date of last price change (e.g., "2024-06-15")
    percent?: number; // Percent increase since prior price (e.g., 12.5 for +12.5%)
  };

  // Initial scenario inputs to seed sliders/inputs in the modal
  initialScenario: {
    cancelDate: string; // ISO 8601 date the user plans to cancel (e.g., "2025-01-01")
    prorate: boolean; // If true, savings consider proration for the current cycle
    earlyTerminationFee?: number; // Flat fee charged on cancellation, if any (e.g., 50). Omit or 0 if none
    retentionOfferDiscount?: {
      // Optional discount if user accepts a retention offer
      type: "percent" | "flat"; // "percent" applies value% off; "flat" subtracts value in currency units
      value: number; // For "percent": 0-100; For "flat": currency units (e.g., 10 for $10 off)
    };
  };

  // Single action used when saving the scenario as a recommendation/tag
  onSaveRecommendationAction: {
    type: "save_subscription_recommendation";
    payload: {
      subscriptionId: string; // Should match the subscriptionId prop
      scenario: {
        cancelDate: string;
        prorate: boolean;
        earlyTerminationFee?: number;
        retentionOfferDiscount?: { type: "percent" | "flat"; value: number };
      };
      tagLabel?: string; // Optional label to attach (e.g., "Cancel to save $96/yr")
    };
  };

  // Optional configuration
  currency?: string; // ISO 4217 currency code, default "USD" (e.g., "USD", "EUR", "GBP")
}

// DuplicatesAlertProps drives an inline banner + dropdown list that highlights suspected duplicate subscriptions.
// Keep data minimal: groups to display, basic config, and a single action object to describe the latest user intent.
interface DuplicatesAlertProps {
  groups: Array<{
    groupId: string; // Stable identifier for this suspected duplicate group, e.g., "dupgrp_01HZY3..."
    providers: string[]; // Provider names observed in statements, e.g., ["Spotify", "Apple Music"]
    planNames?: string[]; // Optional plan labels if available, e.g., ["Family", "Individual"]
    totalMonthlyCost: number; // Sum of monthly costs for all items in this group (major currency units), e.g., 19.98
    confidenceScore: number; // 0.0–1.0 likelihood that these are duplicates, e.g., 0.86
    affectedRowIds?: string[]; // Optional: IDs of rows in the main table to highlight/jump to, e.g., ["sub_123", "sub_456"]
  }>;

  isLoading?: boolean; // When true, render a loading/skeleton state while detection is running

  currency?: string; // ISO 4217 code for display, default: "USD", e.g., "EUR", "GBP"

  // Single action object describing the most recent user intent from the component.
  // The host app can observe this and perform the side-effect (e.g., navigate, mark resolved).
  action?: {
    type: "open_group" | "resolve_group" | "dismiss_group" | "jump_to_rows";
    groupId: string; // Target duplicate group for the action
    // For "jump_to_rows", the component may rely on groups[i].affectedRowIds, no extra payload is required here.
  };
}

// Props for the panel that ingests and manages subscription source statements (PDFs).
// Purpose: let users add PDF statements, see parsing progress, resolve unknown merchants,
// reprocess, and commit imports to refresh the subscriptions table in the main view.
interface StatementImportPanelProps {
  id: string; // Unique panel instance id (e.g., "sub-cleanup-import-1")
  title: string; // Panel title (e.g., "Import Statements")
  
  // Current files tracked by the panel, including upload/parse status.
  // Example:
  // [
  //   { id: "f1", name: "Jan_2025.pdf", mimeType: "application/pdf", sizeBytes: 324553, status: "parsed", pages: 6 },
  //   { id: "f2", name: "Feb_2025.pdf", mimeType: "application/pdf", sizeBytes: 298112, status: "parsing", progressPct: 72 }
  // ]
  files: ImportFile[];

  // Summary of parsed content across all files (optional until parsing starts).
  // Example: { transactionsCount: 1243, subsDetected: 18, errors: 2, timeRange: { from: "2024-11-01", to: "2025-02-28" }, unknownMerchants: ["ACME MEDIA","XYZ STREAM"] }
  parseSummary?: ParseSummary;

  // Merchant normalization rules to map raw merchant strings to a provider name used by the app.
  // Example: [{ merchant: "NETFLX.COM", normalizedProvider: "Netflix", confidence: 0.94 }]
  mappingRules?: MappingRule[];

  // Single action object used for all interactions fired by this panel.
  // The UI will dispatch this action with different "event" payloads
  // such as add_files, resolve_merchant, reprocess, or commit_import.
  // Example:
  // {
  //   type: "statement_import_interaction",
  //   event: { name: "commit_import" }
  // }
  onInteractionAction: {
    type: "statement_import_interaction";
    event: StatementImportEvent;
  };

  // Optional: restrict acceptable MIME types for uploads (default commonly includes PDFs).
  // Example: ["application/pdf"]
  acceptMimeTypes?: string[];
}

// A file tracked by the panel during upload and parsing.
interface ImportFile {
  id: string; // App-generated id for the file (not the filename)
  name: string; // Display filename (e.g., "March_2025.pdf")
  mimeType: string; // e.g., "application/pdf"
  sizeBytes: number; // Raw size in bytes
  status: "pending" | "uploading" | "uploaded" | "parsing" | "parsed" | "error";
  progressPct?: number; // 0-100 during upload/parsing
  pages?: number; // Optional page count if known after parsing
  errorMessage?: string; // Present when status === "error"
}

// Aggregate results from parsing the uploaded statements.
interface ParseSummary {
  transactionsCount: number; // Total transactions parsed
  subsDetected: number; // Number of subscriptions detected by parser
  errors: number; // Count of parsing or extraction errors
  timeRange?: { from: string; to: string }; // ISO dates (YYYY-MM-DD), inferred from statements
  unknownMerchants?: string[]; // Merchant names that require user mapping/normalization
}

// Map raw merchant strings to a normalized provider used in the app.
interface MappingRule {
  merchant: string; // Raw merchant text from statements (e.g., "NETFLX.COM")
  normalizedProvider: string; // Canonical provider (e.g., "Netflix")
  confidence?: number; // 0..1 score indicating certainty of the mapping
  lastUsedAt?: string; // ISO timestamp when this rule last applied
}

// All user interactions emitted by the panel are represented as events under one action.
// The host app listens for these and performs side effects (upload, parse, save rules, etc.).
type StatementImportEvent =
  | {
      name: "add_files";
      // Files selected by the user to add (pre-upload client references).
      // tempId is a client-only id that can be reconciled to ImportFile.id once tracked by the app.
      files: { tempId: string; name: string; sizeBytes: number; mimeType: string }[];
    }
  | {
      name: "remove_file";
      fileId: string; // Remove a file from the list and cancel any in-flight work
    }
  | {
      name: "retry_file";
      fileId: string; // Retry upload or parsing for a failed file
    }
  | {
      name: "resolve_merchant";
      merchant: string; // Raw merchant (must match an entry needing resolution)
      normalizedProvider: string; // Chosen canonical provider (e.g., "YouTube Premium")
    }
  | {
      name: "reprocess"; // Re-run parsing across current files (e.g., after mapping changes)
    }
  | {
      name: "commit_import"; // Finalize import and refresh the subscriptions table
    };