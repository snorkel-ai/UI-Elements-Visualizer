interface ApplicationsOverviewBoardProps {
  // List of applications to display in the overview table/calendar.
  // Example:
  // [
  //   {
  //     id: "app_1",
  //     schoolName: "Stanford University",
  //     deadlineISO: "2025-01-05",
  //     status: "inProgress",
  //     readinessScore0to100: 68,
  //     requirementsCompleted: 5,
  //     requirementsTotal: 8,
  //     keyDates: [
  //       { dateISO: "2024-12-01", type: "test", note: "SAT retake" },
  //       { dateISO: "2025-01-05", type: "deadline" }
  //     ]
  //   }
  // ]
  applications: ApplicationSummary[];

  // Primary sort used by the table and to order items in calendar lists.
  // Default: "deadline"
  sortBy: "deadline" | "readiness" | "status";

  // Optional, minimal filtering for overview use-cases.
  // month uses 1-12 (e.g., 1 = January), applied against key deadlines.
  filter?: {
    status?: ApplicationStatus; // e.g., "inProgress"
    month?: number; // 1-12, filters to items with a key deadline in this month
  };

  // Controls whether the component renders a table view or a calendar-centric view.
  viewMode: "table" | "calendar";

  // Single action object used for all interactions. The component will dispatch this
  // action with a payload describing the specific event.
  // Payload variants (examples):
  // - { event: "select_application", applicationId: "app_1" }
  // - { event: "open_application_detail", applicationId: "app_1" }
  // - { event: "toggle_view", viewMode: "calendar" }
  // - { event: "sort", sortBy: "readiness" }
  // - { event: "filter", filter: { status: "inProgress", month: 12 } }
  // - { event: "mark_requirement_complete", applicationId: "app_1", requirementId: "rec_letter_1" }
  // - { event: "quick_add_key_date", applicationId: "app_1", dateISO: "2024-12-15", dateType: "task", note?: "Draft essay 2" }
  // - { event: "add_application" }
  onAction: {
    type: "applications_overview_event";
  };

  // Optional: IANA timezone for interpreting/rendering ISO dates (table chips and calendar).
  // Example: "America/Los_Angeles". If omitted, component uses environment/browser default.
  timezone?: string;
}

// ============ Supporting Types ============

type ApplicationStatus = "notStarted" | "inProgress" | "submitted";

type KeyDateType = "deadline" | "interview" | "test" | "task";

interface KeyDate {
  dateISO: string; // ISO 8601 date (YYYY-MM-DD or full timestamp). Example: "2025-01-05"
  type: KeyDateType; // Drives chip color/icon (e.g., deadline vs interview)
  note?: string; // Optional short label for the date in calendar hover/tooltip
}

interface ApplicationSummary {
  id: string;
  schoolName: string;

  // Primary deadline used for sorting and deadline status chips.
  // ISO 8601 date (YYYY-MM-DD). Example: "2025-01-05"
  deadlineISO: string;

  status: ApplicationStatus; // "notStarted" | "inProgress" | "submitted"

  // Readiness score shown as a progress bar or chip. 0-100 inclusive.
  readinessScore0to100: number;

  // Requirement checklist summary for quick overview (full checklist handled elsewhere).
  requirementsCompleted: number;
  requirementsTotal: number;

  // Additional dates rendered in the calendar/side panel (interviews, tests, tasks).
  keyDates: KeyDate[];
}

interface SchoolApplicationRowProps {
  // Unique identifier for this school/application row (stable across renders)
  // Example: "app_stanford_2025_rd"
  id: string;

  // Display name of the school
  // Example: "Stanford University"
  schoolName: string;

  // Primary application deadline in ISO 8601 format (date or datetime)
  // Examples: "2025-01-05", "2025-01-05T23:59:59Z"
  deadlineISO: string;

  // Status chip indicating urgency vs. deadline
  // onTime: comfortably ahead of deadline
  // dueSoon: within a short threshold (e.g., next 7-14 days)
  // overdue: past the deadline
  deadlineStatus: "onTime" | "dueSoon" | "overdue";

  // Readiness score shown as a badge (0-100, integers recommended)
  // Example: 78
  readinessScore0to100: number;

  // Requirements progress bar inputs
  // requirementsCompleted should be between 0 and requirementsTotal
  // requirementsTotal should be >= 1
  requirementsCompleted: number;
  requirementsTotal: number;

  // Optional: whether the user has favorited/starred this school
  // Default: false (if omitted)
  isFavorited?: boolean;

  // Optional: whether this application has been submitted
  // Default: false (if omitted)
  isSubmitted?: boolean;

  // Optional: logo or icon to show beside the school name
  // Example: "https://cdn.example.com/logos/stanford.png"
  schoolLogoUrl?: string;

  // Optional list of quick actions rendered as buttons/icons within the row.
  // Provide only the actions you want to enable for this row.
  // Examples:
  // [
  //   { type: "open_details", schoolId: "app_stanford_2025_rd" },
  //   { type: "open_requirements", schoolId: "app_stanford_2025_rd" },
  //   { type: "toggle_favorite", schoolId: "app_stanford_2025_rd" },
  //   { type: "mark_submitted", schoolId: "app_stanford_2025_rd" }
  // ]
  quickActions?: SchoolApplicationRowAction[];
}

// Allowed action objects for the row. Use these instead of function callbacks.
// The consuming layer decides how to handle/dispatch them.
type SchoolApplicationRowAction =
  | { type: "open_requirements"; schoolId: string }
  | { type: "open_details"; schoolId: string }
  | { type: "mark_submitted"; schoolId: string }
  | { type: "toggle_favorite"; schoolId: string };

// Represents a single requirement within a school's application checklist.
// Example: { id: "common-app", label: "Common App Submitted", completed: false, type: "form", dueISO: "2025-01-05" }
interface RequirementsChecklistItem {
  id: string; // Stable item ID (use a UUID or deterministic key per requirement)
  label: string; // Human-readable name of the requirement (e.g., "Personal Statement", "Teacher Rec #1")
  completed: boolean; // Whether the requirement is done
  dueISO?: string; // Optional ISO 8601 date string for soft due hints (e.g., "2025-01-15")
  type: "essay" | "form" | "test" | "rec" | "fee"; // Requirement category for iconography/filtering
}

// Action union for all interactions the component can emit.
// Dispatch exactly one of these via the onAction prop when a user performs an operation.
type RequirementsChecklistAction =
  | {
      type: "toggle_item";
      // Toggle completion status of a single item. If `completed` is omitted, toggle current state.
      payload: { schoolId: string; itemId: string; completed?: boolean };
    }
  | {
      type: "add_item";
      // Add a new custom item (shown when allowCustom = true). `type` defaults to "form" if omitted.
      payload: {
        schoolId: string;
        label: string;
        type?: RequirementsChecklistItem["type"];
        dueISO?: string;
      };
    }
  | {
      type: "edit_item";
      // Edit label/date/type of an existing item (no ID change).
      payload: {
        schoolId: string;
        itemId: string;
        label?: string;
        dueISO?: string;
        type?: RequirementsChecklistItem["type"];
      };
    }
  | {
      type: "reorder_items";
      // Reorder the checklist by providing the new full order of item IDs.
      payload: { schoolId: string; order: string[] };
    };

interface RequirementsChecklistProps {
  schoolId: string; // ID of the school this checklist belongs to
  schoolName: string; // Display name (e.g., "University of Michigan")
  items: RequirementsChecklistItem[]; // Current checklist items for the school (rendered in order)
  readinessScore?: number; // Optional 0-100 indicator of overall application readiness for this school

  allowCustom: boolean; // If true, UI should allow adding custom items
  allowReorder?: boolean; // If true, UI should enable drag-and-drop or move controls for items

  onAction: RequirementsChecklistAction; 
  // The action to dispatch when a user interacts. 
  // Example: { type: "toggle_item", payload: { schoolId, itemId, completed: true } }
}

interface KeyDatesCalendarProps {
  // ISO year-month currently in view, e.g., "2025-11"
  monthISO: string;

  // Visual density of the calendar grid
  density: "compact" | "comfortable";

  // All key-date events to render across schools for the visible time range
  events: CalendarEvent[];

  // Optional school metadata used for labels and/or coloring
  // Example: [{ id:"mit", name:"MIT", color:"#2266EE" }]
  schools?: SchoolMeta[];

  // If set, visually emphasize events for this school (e.g., bold border or accent)
  highlightedSchoolId?: string;

  // Initial or controlled filters shaping what is shown in the grid and legend
  // Example: { schoolIds:["mit","stanford"], types:["deadline","interview"] }
  filters?: CalendarFilters;

  // Override colors by event type (hex/rgb), fallback provided by design system
  // Example: { deadline:"#D92D20", interview:"#0E9384" }
  eventTypeColors?: Partial<Record<EventType, string>>;

  // Show a small legend mapping event types (and optionally schools) to colors
  showLegend?: boolean;

  // Dispatched when user clicks previous/next or jumps to a different month
  // The system will append context at runtime, e.g.:
  // { type:"navigate_month", targetMonthISO:"2026-01", direction:"next" }
  navigationAction: UIAction<"navigate_month">;

  // Dispatched when a specific date cell is selected to inspect its events
  // Runtime payload example: { type:"select_date", dateISO:"2025-11-15" }
  selectDateAction?: UIAction<"select_date">;

  // Dispatched when user adds a new event from a date cell or toolbar
  // Runtime payload example:
  // { type:"add_event", dateISO:"2025-11-20", draft:{ type:"task", schoolId:"mit" } }
  addEventAction?: UIAction<"add_event">;

  // Dispatched when the user changes filters (school/type)
  // Runtime payload example:
  // { type:"filter_change", filters:{ schoolIds:["mit"], types:["deadline"] } }
  filterChangeAction?: UIAction<"filter_change">;
}

/* ---------- Supporting Types ---------- */

type EventType = "deadline" | "interview" | "test" | "task";

interface CalendarEvent {
  id: string;             // Unique event id
  dateISO: string;        // ISO date (YYYY-MM-DD), e.g., "2025-11-01"
  label: string;          // Short label, e.g., "EA Deadline"
  type: EventType;        // Drives color/icon
  schoolId: string;       // Must match a SchoolMeta.id if provided
  iconUrl?: string;       // Optional small icon to render in the cell
  // Optional extra fields that can be used in detail views or tooltips
  notes?: string;
}

interface SchoolMeta {
  id: string;     // e.g., "mit"
  name: string;   // e.g., "MIT"
  color?: string; // Preferred color for this school (hex/rgb)
  logoUrl?: string; // Optional small logo used in legend or tooltip
}

interface CalendarFilters {
  schoolIds?: string[];     // If provided, only show events for these schools
  types?: EventType[];      // If provided, only show events of these types
}

interface UIAction<TType extends string = string> {
  type: TType;              // Action type identifier
  analyticsTag?: string;    // Optional tag for analytics/telemetry
  // Note: Runtime will attach context-specific payload (e.g., dateISO, targetMonthISO, filters)
}

interface ReadinessScoreBadgeProps {
  // Numeric readiness score from 0 to 100 (whole number or decimal).
  // Example: 78 means 78% readiness based on completed requirements and time to deadline.
  score: number;

  // Semantic readiness level that drives badge color/meaning.
  // onTrack: meeting milestones; atRisk: needs attention soon; behind: likely to miss deadline without action.
  level: 'onTrack' | 'atRisk' | 'behind';

  // Visual density. Use 'sm' in tables/compact lists, 'md' in detail views.
  // Default: 'md'
  size?: 'sm' | 'md';

  // Optional explanation shown on hover/focus (plain text).
  // Example: "5/7 requirements complete • 12 days until Regular Decision deadline."
  tooltip?: string;

  // Optional action object to open a detailed readiness breakdown for this application.
  // Triggered on click/tap of the badge.
  // Example:
  // { type: 'open_readiness_breakdown', applicationId: 'brown-2025-rd' }
  onOpenDetailsAction?: {
    type: 'open_readiness_breakdown';
    applicationId: string;
  };
}

interface AddApplicationDialogProps {
  // Optional title shown at the top of the dialog. Default: "Add Application"
  title?: string;

  // Prepopulated list to search/select from. Free text entry should still be allowed.
  // Example: [{ id: "mit", name: "MIT", logoUrl: "https://..." }]
  presetSchools?: Array<{
    id: string;
    name: string;
    logoUrl?: string; // Optional school logo/icon for quick recognition
  }>;

  // Limit selectable application types. Default: ["EA","ED","RD","Rolling"]
  allowedAppTypes?: Array<"EA" | "ED" | "RD" | "Rolling">;

  // Optional prefilled values when opening the dialog (e.g., when adding from a school row).
  // deadlineISO should be an ISO 8601 date string (e.g., "2025-01-15").
  defaultValues?: {
    schoolName?: string; // If set, should still allow user to edit
    program?: string; // e.g., "Computer Science (BS)"
    deadlineISO?: string; // ISO date string only (no time)
    appType?: "EA" | "ED" | "RD" | "Rolling";
  };

  // Optional constraints for the date picker.
  dateRange?: {
    minISO?: string; // Earliest allowed ISO date (e.g., "2024-08-01")
    maxISO?: string; // Latest allowed ISO date (e.g., "2026-06-30")
  };

  // Dispatch when user confirms the form.
  // Payload must include the minimal required fields to create an application.
  onSubmitAction: {
    type: "add_application_submit";
    payload: {
      schoolName: string; // Either selected from presets or free text
      program?: string;
      deadlineISO: string; // ISO date string (e.g., "2025-01-15")
      appType: "EA" | "ED" | "RD" | "Rolling";
    };
  };

  // Dispatch when user cancels/closes the dialog without submitting.
  onCloseAction: {
    type: "dismiss_add_application_dialog";
  };
}