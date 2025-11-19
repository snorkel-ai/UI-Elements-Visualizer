interface NewsletterPlanningBoardProps {
  // ISO date (YYYY-MM-DD) for the first day shown on the board (e.g., start of current week)
  // Example: "2025-01-06"
  startDate: string;

  // Number of weeks to display in the grid.
  // Default expectation from scenario: 6
  weekCount: number;

  // Issues already scheduled onto specific dates in the calendar.
  // Each item renders as a small card with topic, CTA, and a status chip.
  scheduledIssues: ScheduledIssue[];

  // Unscheduled ideas shown in the backlog panel.
  // These can be dragged or scheduled into a date cell.
  backlogIdeas: BacklogIdea[];

  // Available statuses to tag an issue (drives the status chip options).
  // Example values: [{ value: "draft", label: "Draft" }, { value: "scheduled", label: "Scheduled" }, { value: "sent", label: "Sent" }]
  statusOptions: StatusOption[];

  // Single action object used for all user interactions on this board.
  // The component will emit using this action "type" and attach one of the payloads described below.
  // Emitted payloads (examples):
  // - { event: "select_issue", issueId: "iss_123" }
  // - { event: "schedule_from_backlog", ideaId: "idea_456", date: "2025-02-03" }
  // - { event: "update_status", issueId: "iss_123", status: "scheduled" }
  // - { event: "move_to_backlog", issueId: "iss_123" }
  // - { event: "reschedule_issue", issueId: "iss_123", fromDate: "2025-02-03", toDate: "2025-02-10" }
  onUserAction: {
    type: "newsletter_board_action";
  };

  // Optional: IANA timezone used for interpreting dates (display/drag behavior).
  // Default: browser/user timezone
  timezone?: string;

  // Optional: Enable/disable drag & drop interactions (click-to-schedule still allowed).
  // Default: true
  allowDragDrop?: boolean;
}

interface ScheduledIssue {
  id: string; // Unique ID for the scheduled issue (e.g., "iss_123")
  date: string; // ISO date (YYYY-MM-DD) indicating the scheduled send date
  topic: string; // Short title/topic for the issue (e.g., "AI Trends in Marketing")
  cta: string; // Primary call-to-action text (e.g., "Read the full guide")
  status: string; // Must match one of statusOptions.value (e.g., "draft" | "scheduled" | "sent")
}

interface BacklogIdea {
  id: string; // Unique ID for the idea (e.g., "idea_456")
  topic: string; // Proposed topic/title for the idea
  cta?: string; // Optional CTA to use when scheduled
  notes?: string; // Optional planning notes/context
}

interface StatusOption {
  value: string; // Machine value (e.g., "draft")
  label: string; // Display label (e.g., "Draft")
  colorHex?: string; // Optional hex color for chip/badge (e.g., "#6B7280")
}

interface UIAction {
  type: string; // e.g., "calendar/day_click", "calendar/schedule_issue", "calendar/select_issue", "calendar/navigate"
  // When dispatched, the component will include a payload with relevant context.
  // Examples of runtime payloads the component may add:
  // - { date: "2025-01-15" }
  // - { issueId: "issue_123" }
  // - { issueId: "issue_123", date: "2025-01-15" }
  // - { direction: "prev" | "next" }
  payload?: Record<string, unknown>;
}

interface DayCell {
  date: string; // ISO date (YYYY-MM-DD). Must cover startDate over weekCount weeks.
  isToday?: boolean;
  isPast?: boolean;
  isDisabled?: boolean; // e.g., block scheduling on certain days
}

interface IssueCard {
  id: string; // unique identifier
  topic: string; // e.g., "AI Writing Tips"
  cta: string; // e.g., "Download the template"
  status: "draft" | "in_review" | "scheduled" | "sent";
  ownerName?: string; // e.g., "Sam Rivera"
  iconUrl?: string; // small avatar or icon for the card
}

interface CalendarGridProps {
  // Starting point of the grid. The grid spans weekCount full weeks from this date.
  // Example: "2025-01-06" (Monday). Use ISO (YYYY-MM-DD).
  startDate: string;

  // How many full weeks to render in the grid.
  // Example: 6 for a six-week planning view.
  weekCount: number;

  // Flat list of day descriptors covering the rendered range [startDate .. startDate + weekCount*7).
  // Each date should be unique and ISO-formatted.
  days: DayCell[];

  // Scheduled items mapped by ISO date. Only dates present in "days" will render.
  // Example: { "2025-01-15": [{ id: "i1", topic: "...", cta: "...", status: "draft" }] }
  issuesByDate?: Record<string, IssueCard[]>;

  // Unscheduled backlog items that can be dragged into the grid (if dragAndDropEnabled is true).
  backlog?: IssueCard[];

  // Enables drag from backlog to a day cell (and between days).
  // When true, dropping triggers scheduleDropAction with payload { issueId, date }.
  dragAndDropEnabled?: boolean;

  // Optional title for accessibility and context (e.g., "Newsletter Content Calendar").
  title?: string;

  // Displays ISO week numbers in the grid's row headers if available.
  showWeekNumbers?: boolean;

  // Dispatched when a day cell is clicked. Payload includes { date }.
  dayClickAction?: UIAction;

  // Dispatched when a specific issue card is selected/tapped. Payload includes { issueId }.
  issueSelectAction?: UIAction;

  // Dispatched when an issue is dropped onto a day cell. Payload includes { issueId, date }.
  scheduleDropAction?: UIAction;

  // Dispatched when navigating the grid (e.g., via header controls). Payload includes { direction: "prev" | "next" }.
  navigateAction?: UIAction;
}

interface IssueCardProps {
  id: string; // Stable unique identifier for the issue (e.g., "issue_2025_02_14")
  topic: string; // Short, human-readable title of the newsletter topic (e.g., "AI Tools for Marketers")
  primaryCtaLabel: string; // The main CTA shown on the card (e.g., "Read Guide", "Join Webinar")
  status: "Planned" | "Draft" | "InReview" | "Scheduled" | "Sent"; // Current workflow state; used for the status chip

  // Optional fields for calendar/scheduling context
  dueDateISO?: string; // ISO date/time string if scheduled/on calendar (e.g., "2025-02-14" or "2025-02-14T09:00:00Z")
  draggable?: boolean; // If true, the card shows a drag handle for scheduling within a calendar. Default: true

  // Optional small visual cue (e.g., topic icon or brand mark)
  iconUrl?: string; // Small square image URL (24–40px). Example: "https://cdn.example.com/icons/ai.png"

  // Single action object to handle all interactions from this card.
  // The renderer dispatches the appropriate intent with payload when the user interacts
  // (e.g., clicking the card to open details, editing, changing status, drag/drop to a date).
  onIssueAction?: {
    type:
      | "open_details" // User opened the details view/panel
      | "edit_issue" // User wants to edit title/CTA/etc.
      | "change_status" // User set a new status (payload.status required)
      | "schedule"; // User scheduled/moved the issue via drag/drop (payload.dateISO required)
    payload: {
      id: string; // Must match the card's id
      status?: "Planned" | "Draft" | "InReview" | "Scheduled" | "Sent"; // Required when type = "change_status"
      dateISO?: string; // Target date/time when type = "schedule" (e.g., "2025-03-03")
    };
  };
}

interface BacklogListProps {
  // Unscheduled ideas to display in the backlog list.
  // Minimal fields for quick scanning; 'priority' supports sorting.
  ideas: IdeaItem[];

  // How to sort the backlog list.
  // "priority" places higher priority first (e.g., 3 > 1). "recency" uses createdAt desc.
  // Default: "priority"
  sortBy?: "priority" | "recency";

  // Optional lightweight filtering controls.
  // - search: free-text match against topic/notes
  // - ctaOnly: show only ideas that have a CTA defined
  // - minPriority: show ideas with priority >= this value
  filters?: {
    search?: string;
    ctaOnly?: boolean;
    minPriority?: number; // e.g., 1..3
  };

  // Where the component should emit user intent as action objects (no function callbacks).
  // The app should listen on this sink/channel and handle the actions described below.
  // Example: { type: "emit_backlog_action", sinkId: "content-calendar-bus" }
  actionSink: { type: "emit_backlog_action"; sinkId: string };

  // Enable dragging ideas onto a calendar to schedule them.
  // If true, dropping on a date should emit a { type: "schedule_idea", ... } action.
  // Default: true
  allowDragToCalendar?: boolean;

  // Optional scheduling guardrails to inform UX (e.g., disable drops outside this range).
  // Dates are ISO strings (YYYY-MM-DD).
  scheduleConstraints?: {
    earliestDate?: string;
    latestDate?: string;
  };
}

/**
 * Row item representing an unscheduled idea.
 */
interface IdeaItem {
  id: string;              // Stable unique id for the idea
  topic: string;           // Short, scannable topic/title (e.g., "Subject line A/B testing")
  cta?: string;            // Optional CTA label (e.g., "Download checklist")
  notes?: string;          // Optional short notes for context
  priority?: number;       // Optional numeric priority (e.g., 1=low .. 3=high)
  createdAt?: string;      // ISO datetime used for "recency" sorting (e.g., "2025-01-15T10:30:00Z")
}

/**
 * Actions the component can emit via actionSink when users interact:
 *
 * - Create new idea (e.g., clicking "New idea"):
 *   { type: "create_idea", payload?: { topic?: string; cta?: string; notes?: string; priority?: number } }
 *
 * - Edit an existing idea (e.g., quick edit from row):
 *   { type: "edit_idea", ideaId: string }
 *
 * - Delete an idea (e.g., trash action on row):
 *   { type: "delete_idea", ideaId: string }
 *
 * - Schedule an idea (e.g., drag to calendar date or quick "Schedule" action):
 *   { type: "schedule_idea", ideaId: string, date: string } // date: "YYYY-MM-DD"
 *
 * Optional examples:
 * - Duplicate an idea:
 *   { type: "duplicate_idea", ideaId: string }
 *
 * The host app should subscribe to the provided actionSink.sinkId and handle these action objects.
 */

interface IssueEditorModalProps {
  // Whether we are creating a new issue or editing an existing one.
  // In "edit" mode, initialValue.id should be provided.
  mode: "create" | "edit";

  // Pre-filled values for the form.
  // topic and status are required by validation; others are optional.
  initialValue: IssueInput;

  // Allowed statuses shown as selectable chips/options.
  // Example: [{ value: "idea", label: "Idea" }, { value: "draft", label: "Draft" }, { value: "scheduled", label: "Scheduled" }, { value: "sent", label: "Sent" }]
  statusOptions: StatusOption[];

  // Allowed CTAs for the issue (e.g., buttons/links promoted at the end of the newsletter).
  // Example: [{ id: "signup", label: "Sign up", description: "Drive email signups" }, { id: "read_more", label: "Read more" }]
  ctaOptions: CtaOption[];

  // Required fields and lightweight constraints for inline validation.
  // By default, topic and status are required. Adjust limits to match your editorial rules.
  validation?: {
    required?: { topic?: boolean; status?: boolean };
    topicMaxLength?: number; // e.g., 120
    notesMaxLength?: number; // e.g., 1000
  };

  // Optional scheduling configuration. If allowSchedule is true, the modal shows a date/time picker.
  // timezone affects how scheduledFor is displayed/parsed.
  scheduling?: {
    allowSchedule?: boolean; // default: true
    timezone?: string; // IANA TZ, e.g., "America/New_York"
  };

  // Action emitted when user saves the issue.
  // The component will dispatch this with payload: { issue: IssueInputValidated }
  onSaveAction: { type: "save_issue" };

  // Action emitted when user closes the modal without saving.
  // The component will dispatch this with payload: {}
  onCloseAction: { type: "close_modal" };

  // Action emitted when user deletes the current issue (only shown in edit mode when initialValue.id exists).
  // The component will dispatch this with payload: { id: string }
  onDeleteAction?: { type: "delete_issue" };

  // Action emitted when validation fails on save to surface errors upstream (logging/alerts).
  // The component will dispatch this with payload: { errors: FieldError[] }
  onValidateAction?: { type: "issue_validation_failed" };
}

/* ===== Supporting Types ===== */

// Minimal shape of an issue used by the editor.
// topic and status are validated as required; others are optional.
// scheduledFor should be an ISO 8601 string when provided (e.g., "2025-01-15T14:00:00Z").
interface IssueInput {
  id?: string; // present in edit mode
  topic?: string;
  ctaId?: string | null; // must match one of ctaOptions.id if provided
  status?: IssueStatus;
  notes?: string;
  scheduledFor?: string; // ISO datetime, optional and only meaningful if scheduling.allowSchedule is true
}

type IssueStatus = "idea" | "draft" | "scheduled" | "sent";

interface StatusOption {
  value: IssueStatus;
  label: string;
  // Optional color for status chip display (hex or CSS color string), used only for consistent labeling.
  colorHex?: string;
}

interface CtaOption {
  id: string;
  label: string;
  // Optional short helper text shown under the CTA selector
  description?: string;
  // Optional icon for the CTA choice
  iconUrl?: string;
}

interface FieldError {
  field: "topic" | "status" | "notes" | "scheduledFor" | "ctaId";
  message: string; // Human-readable explanation, e.g., "Topic is required."
}