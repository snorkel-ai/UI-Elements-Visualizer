interface IdeaItemProps {
  // Unique identifier for this gift idea (used to track and update the item)
  // Example: "idea_abc123"
  id: string;

  // Short name/title of the gift idea
  // Example: "LEGO Star Wars Set"
  title: string;

  // Display price in major currency units; omit if unknown
  // Example: 59.99
  price?: number;

  // ISO 4217 currency code for price display
  // Default: "USD"
  // Examples: "USD", "EUR", "GBP"
  currencyCode?: string;

  // Current purchase status shown as a chip
  // - planned: idea saved but not in cart
  // - in_cart: added to cart and pending checkout
  // - purchased: already bought
  status: "planned" | "in_cart" | "purchased";

  // Priority indicator for planning/ordering lists
  // Default: "medium"
  priority?: "low" | "medium" | "high";

  // Optional product link; if provided, the UI may render a "View" button
  // Example: "https://www.example.com/product/lego-123"
  url?: string;

  // Optional image to visually represent the idea (thumbnail or product photo)
  // Example: "https://cdn.example.com/images/lego-123.jpg"
  imageUrl?: string;

  // Primary interaction for this row (e.g., open a details panel to edit, toggle status, etc.)
  // Keeps interactions declarative via an action object rather than callbacks.
  // Example: { type: "select_item", itemId: "idea_abc123" }
  onSelectAction: { type: "select_item"; itemId: string };
}

interface GiftPlanningBoardProps {
  // Human-friendly title for the board (e.g., "2025 Gift Plan")
  // Optional, for display only
  title?: string;

  // Overall totals across all recipients
  // budgetTotal: sum of all recipient budgets
  // plannedTotal: sum of all planned gift ideas (not necessarily purchased)
  // purchasedTotal: sum of all completed purchases
  totals: {
    budgetTotal: number;
    plannedTotal: number;
    purchasedTotal: number;
  };

  // List of recipients to display as cards on the board grid
  recipients: RecipientSummary[];

  // Action to initiate adding a new recipient to the board
  // Example: { type: "add_recipient" }
  addRecipientAction: {
    type: "add_recipient";
    // Optional payload can prefill a suggested occasion or year context
    payload?: {
      suggestedOccasion?: string; // e.g., "Birthday", "Christmas"
      year?: number; // e.g., 2025
    };
  };

  // Display/config options
  // currencyCode: ISO 4217 currency (default: "USD")
  // year: planning context year (e.g., 2025)
  currencyCode?: string; // Default: "USD"
  year?: number;
}

// Minimal recipient data needed to render recipient cards on the board
interface RecipientSummary {
  // Unique identifier used for selection and lookups
  id: string;

  // Display name for the recipient
  name: string; // e.g., "Alice Johnson"

  // Primary occasion being planned
  occasion: string; // e.g., "Birthday", "Christmas"

  // Budget allocated for this recipient
  budget: number;

  // Aggregated amounts for this recipient
  // plannedTotal: sum of all planned gift ideas (may exceed budget)
  // purchasedTotal: sum of completed purchases
  plannedTotal: number;
  purchasedTotal: number;

  // High-level idea and purchase counts for quick chips/badges
  ideasCount?: number; // e.g., 4
  purchasedCount?: number; // e.g., 2

  // Optional avatar or icon to show on the recipient card
  avatarUrl?: string;

  // Action fired when user selects/clicks this recipient card
  // Example: { type: "select_recipient", payload: { id: "recp_123" } }
  selectAction: {
    type: "select_recipient";
    payload: {
      id: string;
    };
  };
}

interface RecipientCardProps {
  // Unique identifier for this recipient (used in actions and state management)
  id: string;

  // Display name of the recipient, e.g., "Mom", "Alex Chen"
  name: string;

  // Occasion this gift planning is for, e.g., "Birthday", "Christmas", "Graduation"
  occasion: string;

  // Target date for the occasion in ISO 8601 format, e.g., "2025-12-25"
  date: string;

  // Planned budget for this recipient in major currency units (e.g., 150 means $150)
  budget: number;

  // Amount already spent for this recipient in the same units as `budget`
  spent: number;

  // Optional quick status chips to surface counts at a glance
  // - ideas: number of gift ideas saved
  // - purchased: number of ideas that have been purchased
  // Example: { ideas: 5, purchased: 2 }
  statusChips?: {
    ideas: number;
    purchased: number;
  };

  // Primary interaction for the card (action object, not a callback)
  // Common usage is to open the ideas list, but edit/delete may be used in compact UIs.
  // Example: { type: "open_ideas", payload: { id: "recp_123" } }
  action: {
    type: "open_ideas" | "open_recipient" | "edit_recipient" | "delete_recipient";
    payload: { id: string };
  };
}

interface BudgetSummaryBarProps {
  // Unique identifier for the gift plan or budget board this summary represents
  // Example: "gift-plan-2025"
  id: string;

  // Short title displayed in the bar to identify the plan
  // Example: "Holidays & Birthdays 2025"
  title: string;

  // ISO 4217 currency code used for all amounts
  // Examples: "USD", "EUR", "GBP"
  currency: string;

  // Total budget allocated for all gifts in this plan (major units)
  // Example: 1200.00 means $1,200.00 if currency is "USD"
  budgetTotal: number;

  // Estimated total spend based on current gift ideas (major units)
  // Example: 950.50
  estimatedTotal: number;

  // Actual spend already purchased/committed (major units)
  // Example: 420
  purchasedTotal: number;

  // Optional small icon to show alongside the title (e.g., a gift box or calendar)
  // Example: "https://cdn.example.com/icons/gift-box.svg"
  iconUrl?: string;

  // Primary user interaction for drilling into a detailed budget report
  // type must be "view_report"; payload should include the current plan id
  // Example:
  // { type: "view_report", payload: { planId: "gift-plan-2025", source: "summary_bar" } }
  onViewReportAction: {
    type: "view_report";
    payload: {
      planId: string;
      // Optional metadata about where the action originated from
      source?: "summary_bar" | "header_button" | "footer_link";
    };
  };

  // If set, the bar can highlight when remaining budget falls below this percentage of the total
  // Example: 10 means warn when remaining < 10% of budgetTotal
  warningThresholdPercent?: number;

  // Controls how the remaining budget is displayed to the user
  // "amount" shows currency amount; "percentage" shows % remaining; "both" shows both
  // Default behavior can be "amount" if not provided
  showRemainingAs?: "amount" | "percentage" | "both";
}

interface FilterSortBarProps {
  // Stable identifier for this filter/sort control instance (useful for analytics or state keys)
  id: string;

  // Title shown in the control, e.g., "Filter & Sort Gifts"
  title: string;

  // Optional contextual name, e.g., "Family 2025" or "Holiday List"
  name?: string;

  // Which list the controls target:
  // - "recipients": people you're gifting (e.g., Alice, Bob)
  // - "ideas": individual gift ideas (e.g., "Noise-cancelling headphones")
  scope: "recipients" | "ideas";

  // Current filter values. All fields are optional; omit to treat as "All".
  filters: {
    // Occasion to focus on. Add "other" if needed for uncategorized events.
    occasion?:
      | "birthday"
      | "holiday"
      | "anniversary"
      | "wedding"
      | "graduation"
      | "new_baby"
      | "other";

    // Month of the occasion or target purchase month (1 = Jan ... 12 = Dec)
    month?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

    // Current gift progress for a recipient or an idea
    // Tip: "given" means completed/delivered; "researching" is early stage.
    status?: "not_started" | "researching" | "planned" | "purchased" | "wrapped" | "given";

    // When true, show only entries over budget:
    // - recipients: total planned spend > recipient's budget
    // - ideas: idea price > remaining budget for that recipient (or marked over cap)
    overBudget?: boolean;
  };

  // Sorting configuration
  sort: {
    // Field to sort by:
    // - "date": occasion date or target month
    // - "budget": remaining vs allocated budget (recipients) or delta vs cap (ideas)
    // - "name": recipient name or idea name
    // - "price": idea price (for ideas) or planned spend (for recipients)
    // - "priority": user-defined urgency/importance
    by: "date" | "budget" | "name" | "price" | "priority";

    // Sort direction: default "asc" if omitted
    direction?: "asc" | "desc";
  };

  // Optional small icon to visually indicate filtering/sorting (e.g., a funnel icon)
  iconUrl?: string;

  // Single action object to emit whenever the user changes filters or sorting.
  // Example:
  // {
  //   type: "filter_sort.update",
  //   payload: {
  //     scope: "ideas",
  //     filters: { occasion: "birthday", month: 6, status: "planned", overBudget: false },
  //     sort: { by: "price", direction: "asc" }
  //   }
  // }
  onChangeAction: {
    type: "filter_sort.update";
    payload: {
      scope: FilterSortBarProps["scope"];
      filters: FilterSortBarProps["filters"];
      sort: FilterSortBarProps["sort"];
    };
  };

  // Optional quick-access presets for common filter/sort combos users can tap once.
  // Example: { id: "this_month", label: "This Month", preset: { filters: { month: 12 } } }
  quickPresets?: Array<{
    id: string;
    label: string;
    preset: {
      scope?: FilterSortBarProps["scope"];
      filters?: Partial<FilterSortBarProps["filters"]>;
      sort?: Partial<FilterSortBarProps["sort"]>;
    };
  }>;

  // Optional helper text displayed beneath controls, e.g., "Filter by occasion or month"
  hintText?: string;
}

interface GiftIdeaRef {
  id: string; // Unique idea ID, e.g., "idea_42"
  title: string; // Short name, e.g., "Noise-cancelling headphones"
  price?: number; // In currencyCode (e.g., 149.99). Omit if unknown
  purchased?: boolean; // true if bought; used for "Clear purchased" action
  note?: string; // Optional short description, store, or sizing info
  imageUrl?: string; // Optional thumbnail URL for the idea
  sourceUrl?: string; // Optional product page URL (for opening in a browser)
}

interface IdeaListProps {
  recipientId: string; // Selected recipient, e.g., "recp_alex"
  ideas: GiftIdeaRef[]; // All ideas scoped to this recipient, already ordered
  budget: number; // Recipient's budget, e.g., 200
  spent: number; // Current total spent for this recipient (pre-calculated)

  // Trigger to add a new idea for this recipient (opens a form, modal, etc.)
  addIdeaAction: {
    type: "add_idea";
    payload: { recipientId: string };
  };

  // Reorder an idea within the list; toIndex is the 0-based target position
  reorderIdeaAction: {
    type: "reorder_idea";
    payload: { ideaId: string; toIndex: number };
  };

  // Optional bulk action to remove/clear all purchased items for this person
  clearPurchasedAction?: {
    type: "clear_purchased";
    payload: { recipientId: string };
  };

  // Optional currency code for price/budget display. Default: "USD"
  currencyCode?: string; // e.g., "USD", "EUR", "GBP"
}