interface ScheduleCalendarBoardProps {
  // Primary dataset: each workshop session to display on the calendar
  sessions: SessionItem[]; 
  // Resource lists used for conflict detection, filtering, and chips
  rooms: RoomItem[]; 
  instructors: InstructorItem[];

  // Calendar framing
  view: "week" | "month"; // Initial/controlled view
  selectedDate: string; // ISO date string for the focused week/month, e.g., "2025-05-01"
  timezone?: string; // IANA name, e.g., "America/New_York"; defaults to system time

  // Behavioral/configuration flags
  conflictMode?: "warn" | "block" | "off"; 
  // - "warn": allow edits but show conflict alerts
  // - "block": prevent drops/resizes that conflict with room/instructor usage
  // - "off": do not check conflicts
  allowDragResize?: boolean; // Enable drag-and-drop and resize interactions; default true
  showCapacityMeters?: boolean; // Show registered/capacity progress bars on sessions; default true

  // Actions (dispatched by the component; runtime payload is added by the component)
  // Create a new session by selecting an empty time slot
  onSelectSlotAction: ActionTemplate; 
  // Edit/view an existing session by selecting its block
  onSelectSessionAction: ActionTemplate; 
  // After a session is dragged to a new time/room/day
  onSessionDropAction: ActionTemplate; 
  // After a session is resized to change its duration
  onSessionResizeAction: ActionTemplate; 
  // When user toggles between "week" and "month" views
  onToggleViewAction: ActionTemplate; 
  // Export current visible range/schedule
  onExportAction: ActionTemplate; 
}

/**
 * Data types
 */
interface SessionItem {
  id: string;
  title: string;
  // ISO strings; component assumes valid temporal range: start < end
  start: string; // e.g., "2025-06-12T09:00:00Z"
  end: string;   // e.g., "2025-06-12T11:00:00Z"
  roomId: string; // Must match a RoomItem.id
  instructorId: string; // Must match an InstructorItem.id
  capacity: number; // Max attendees
  registered: number; // Current sign-ups
  // Optional tag to hint display or filtering; not used for styling hooks
  category?: "workshop" | "lecture" | "lab" | "other";
}

interface RoomItem {
  id: string;
  name: string; // e.g., "Room A", "Studio 2"
  // Optional for quick reference; not used as a styling prop
  seatCapacity?: number;
}

interface InstructorItem {
  id: string;
  name: string; // Display name on chips
  avatarUrl?: string; // Optional photo shown on instructor chip
}

/**
 * Action template passed in via props. 
 * The component will dispatch this action and append a payload at runtime.
 * Example:
 *  onSessionDropAction = { type: "scheduler/session_dropped" }
 *  Dispatched payload includes:
 *   { sessionId, start, end, roomId, sourceView, targetDate }
 */
interface ActionTemplate {
  type: string; // App-specific action string, e.g., "scheduler/select_slot"
  meta?: Record<string, unknown>; // Optional static metadata passed through unchanged
}

/**
 * Runtime payloads the component will append when dispatching actions:
 * - onSelectSlotAction:
 *   { start: string, end: string, date: string, view: "week" | "month" }
 * - onSelectSessionAction:
 *   { sessionId: string }
 * - onSessionDropAction:
 *   { sessionId: string, start: string, end: string, roomId: string, previousStart: string, previousEnd: string, previousRoomId: string }
 * - onSessionResizeAction:
 *   { sessionId: string, start: string, end: string }
 * - onToggleViewAction:
 *   { nextView: "week" | "month", date: string }
 * - onExportAction:
 *   { rangeStart: string, rangeEnd: string, view: "week" | "month" }
 */

interface SessionBlockCardProps {
  id: string; // Unique session ID, e.g., "sess_102"
  title: string; // Workshop title, e.g., "Intro to React Hooks"

  time: {
    start: string; // ISO 8601, e.g., "2025-12-05T09:00:00Z"
    end: string;   // ISO 8601, e.g., "2025-12-05T10:30:00Z"
  };

  resources: {
    room: string;       // Display room name, e.g., "Room A"
    instructor: string; // Display instructor name, e.g., "Dr. Rivera"
  };

  capacity: {
    max: number;        // Total seats available, e.g., 30
    registered: number; // Seats taken, e.g., 18
  };

  hasConflict: boolean; // True when overlaps or instructor/room conflict detected

  iconUrl?: string; // Optional small icon for topic/instructor, e.g., CDN URL

  onOpenDetailsAction: {
    type: "open_session"; // Triggered on click/hover to show full details
    payload: { id: string }; // { id } corresponds to this session
  };
}

// ResourceFilterBarProps is used to configure a top-level filter bar for a
// classroom/workshop scheduler. It narrows sessions by room, instructor,
// and date range, with an option to show only available resources.
// Notes:
// - Dates should be ISO 8601 strings (e.g., "2025-03-15").
// - Use the onFilterAction action object to apply or clear filters.
// - Keep IDs stable and unique across rooms/instructors.

interface ResourceFilterBarProps {
  // Rooms available to filter by.
  // Example: [{ id: "r101", name: "Room 101" }, { id: "lab-a", name: "Lab A" }]
  rooms: Array<{ id: string; name: string }>;

  // Instructors available to filter by.
  // Example: [{ id: "inst-1", name: "Dr. Kim" }, { id: "inst-2", name: "Alex Rivera" }]
  instructors: Array<{ id: string; name: string }>;

  // Currently selected room filter (omit or null for "All rooms").
  // Example: "r101"
  selectedRoomId?: string | null;

  // Currently selected instructor filter (omit or null for "All instructors").
  // Example: "inst-2"
  selectedInstructorId?: string | null;

  // Date range filter (inclusive). Use ISO strings (YYYY-MM-DD).
  // Example: { start: "2025-04-01", end: "2025-04-30" }
  dateRange: { start: string; end: string };

  // If true, only show resources (rooms/instructors) with no conflicts in the dateRange.
  // Example: true
  showOnlyAvailable: boolean;

  // Single action channel for filter interactions.
  // - apply_filters: Apply one or more filter changes. Any field omitted remains unchanged.
  // - clear_filters: Reset all filters to their default state.
  // Examples:
  // { type: "apply_filters", payload: { roomId: "r101", showOnlyAvailable: true } }
  // { type: "apply_filters", payload: { dateRange: { start: "2025-05-01", end: "2025-05-31" } } }
  // { type: "clear_filters" }
  onFilterAction:
    | {
        type: "apply_filters";
        payload: {
          roomId?: string | null;
          instructorId?: string | null;
          dateRange?: { start: string; end: string };
          showOnlyAvailable?: boolean;
        };
      }
    | { type: "clear_filters" };

  // Optional: Display format for dates in the UI (e.g., "MMM d, yyyy").
  // Example: "MMM d, yyyy" -> "Apr 12, 2025"
  dateDisplayFormat?: string;
}

interface ConflictPanelProps {
  // List of detected conflicts to display in the sidebar
  conflicts: ConflictItem[];

  // Lookup for session details shown in each conflict item
  // Key: sessionId -> value: minimal summary used for rendering
  sessionsIndex: Record<string, SessionSummary>;

  // Optional panel title, e.g., "Conflicts & Suggestions"
  panelTitle?: string;

  // Toggle to show small count badges per conflict type summary (default: true)
  showCounts?: boolean;

  // Optional icons per conflict type for visual distinction
  // Example: { instructor_overlap: "/icons/instructor.svg", room_overlap: "/icons/room.svg" }
  conflictTypeIconUrl?: Partial<Record<ConflictType, string>>;

  // Single high-level action exposed by the panel (optional)
  // Example use: an "Export Schedule" CTA at the bottom of the panel
  // UI will dispatch this object when the user clicks the primary CTA
  primaryAction?: {
    type: "export_schedule" | "resolve_all";
    // When type === "export_schedule"
    format?: "ics" | "csv" | "json"; // Example default: "csv"
  };
}

// Supported conflict types in this scheduler context
type ConflictType = "instructor_overlap" | "room_overlap" | "capacity_exceeded";

// Minimal session info for quick reference in the panel
interface SessionSummary {
  id: string; // Same as the key used in sessionsIndex
  title: string; // e.g., "Workshop: Intro to TypeScript"
  time: {
    start: string; // ISO 8601, e.g., "2025-03-12T09:00:00Z"
    end: string;   // ISO 8601
  };
  room?: string;       // e.g., "Room 204"
  instructor?: string; // e.g., "Dr. Smith"
  capacity?: number;   // e.g., 30
  booked?: number;     // e.g., 28 (used to compute capacity issues)
}

// One conflict row displayed in the panel
interface ConflictItem {
  id: string; // Unique per conflict, e.g., "c_123"
  type: ConflictType;
  sessionIds: string[]; // Sessions impacted by this conflict
  message: string; // Human-readable summary, e.g., "Instructor overlap: Dr. Smith at 10:00"
  severity?: "low" | "medium" | "high"; // Helps prioritize highlighting

  // Suggested fixes (optional). Each suggestion carries its own applyAction.
  suggestions?: ConflictSuggestion[];

  // Action to bring the user’s attention to the affected sessions on the calendar/timeline
  // UI emits this object when the user clicks "Focus" on the conflict
  focusSessionsAction: {
    type: "focus_sessions";
    sessionIds: string[];
  };

  // Action to dismiss this conflict from the list (soft ignore)
  // UI emits this object when the user chooses to dismiss
  dismissAction: {
    type: "dismiss_conflict";
    conflictId: string;
  };
}

// Suggestion tied to a specific conflict
interface ConflictSuggestion {
  id: string; // Unique per suggestion within the conflict
  label: string; // Short label, e.g., "Move to Room 204" or "Shift by +30 min"
  description?: string; // Optional detail, e.g., "Room 204 is free at 10:00-11:00"

  // Apply this suggestion
  // UI emits this action when the user selects the suggestion
  applyAction: {
    type: "apply_suggestion";
    conflictId: string;
    suggestionId: string;
  };
}

interface SessionEditorModalProps {
  // Current draft being edited or created. Times are ISO-8601 strings (e.g., "2025-01-15T14:00:00-05:00").
  draftSession: DraftSession;

  // Available rooms to choose from (capacity used to validate attendee cap; iconUrl optional for visuals).
  rooms: RoomItem[];

  // Available instructors to assign (avatarUrl optional for visuals).
  instructors: InstructorItem[];

  // Inline validation messages. Use field="form" for non-field-specific errors.
  validationErrors?: ValidationError[];

  // Live conflicts detected for the current draft (room overlaps, instructor conflicts, etc.).
  conflictPreview?: ConflictPreviewItem[];

  // IANA time zone identifier for interpreting start/end (e.g., "America/New_York").
  timeZone: string;

  // Optional scheduling window to constrain selection (inclusive).
  // min/max are ISO dates or datetimes; e.g., { min: "2025-01-01", max: "2025-01-31" }.
  dateBounds?: { min: string; max: string };

  // Whether the modal is creating a new session or editing an existing one.
  mode: "create" | "edit";

  // Dispatched when a field changes. The component will emit this action with { field, value } added.
  // Example emitted payload: { type: "session.change_field", field: "start", value: "2025-01-15T14:00:00-05:00" }
  changeFieldAction: ChangeFieldAction;

  // Dispatched when user confirms save. The component will emit with the normalized DraftSession included.
  // Example emitted payload: { type: "session.save", session: DraftSession, conflictsAcknowledged: boolean }
  saveAction: SaveAction;

  // Dispatched when user cancels/close without saving.
  // Example emitted payload: { type: "session.cancel" }
  cancelAction: CancelAction;

  // Dispatched when user deletes an existing session (mode === "edit").
  // Example emitted payload: { type: "session.delete", sessionId: "sess_123" }
  deleteAction?: DeleteAction;
}

/* ===== Supporting Types ===== */

interface DraftSession {
  // If editing, the persistent id; undefined for new drafts.
  id?: string;
  title: string;
  // ISO-8601 datetime with zone offset.
  start: string;
  // ISO-8601 datetime with zone offset. Must be after start.
  end: string;
  // Selected room and instructor identifiers.
  roomId: string;
  instructorId: string;
  // Intended attendee cap; validated against room capacity (if provided).
  capacity: number;
}

interface RoomItem {
  id: string;
  name: string;
  // Optional room capacity used for validation and cap meters.
  capacity?: number;
  // Optional icon for room (map pin, door, etc.).
  iconUrl?: string;
}

interface InstructorItem {
  id: string;
  name: string;
  // Optional instructor avatar.
  avatarUrl?: string;
}

interface ValidationError {
  // Field-specific or "form" for global errors.
  field: "title" | "start" | "end" | "roomId" | "instructorId" | "capacity" | "form";
  message: string;
}

interface ConflictPreviewItem {
  // Conflict categories commonly surfaced by the scheduler.
  type: "room_overlap" | "instructor_conflict" | "outside_bounds" | "capacity_exceeded";
  // Severity used by the UI to style alerts and block save if needed.
  severity: "warning" | "error";
  // Human-readable description (e.g., "Room A is booked 2–3 PM for 'Intro to Python'").
  message: string;
  // Optional related entity ids (e.g., conflicting session id, roomId, instructorId).
  relatedIds?: string[];
}

/* ===== Action Descriptors =====
   These are templates the host app listens for. The component will dispatch
   these types with additional payload fields at runtime as described above.
*/
interface ChangeFieldAction {
  type: "session.change_field";
  // Component will add: field: keyof DraftSession; value: unknown
}

interface SaveAction {
  type: "session.save";
  // Component will add: session: DraftSession; conflictsAcknowledged?: boolean
}

interface CancelAction {
  type: "session.cancel";
}

interface DeleteAction {
  type: "session.delete";
  // Component will add: sessionId: string
}