interface TimeBlockGridProps {
  // ISO date for the schedule (e.g., "2025-11-19")
  date: string;

  // Visible timeline bounds for the grid (ISO time or full ISO string; component will normalize)
  // Examples: "08:00", "2025-11-19T08:00:00Z"
  timeRange: {
    start: string;
    end: string;
  };

  // Current point-in-time indicator on the grid (optional; if omitted, no "now" line is shown)
  // Example: "2025-11-19T10:23:00Z"
  currentTime?: string;

  // Auto-generated list of time blocks to render
  blocks: TimeBlock[];

  // Daily goal progress used to render a compact progress bar
  // Example: { completed: 3, total: 5 }
  goalProgress: {
    completed: number;
    total: number;
  };

  // Action templates for interactions. The component will attach the appropriate payload at runtime.
  // Each action will receive a payload such as:
  // - { blockId: string } for click/edit/markComplete/showDetails
  // - { blockId: string, newStart: string, newEnd: string } for drag/resize
  // - { blockId: string } or { blockId: string, resolvedWith?: string } for resolveConflict
  blockClickAction?: { type: "edit_block" }; // Fired when a block is clicked/tapped
  blockDragAction?: { type: "move_block" }; // Fired after a block is dragged to a new time
  blockResizeAction?: { type: "resize_block" }; // Fired after a block is resized
  markCompleteAction?: { type: "mark_complete" }; // Fired when a block is marked complete
  resolveConflictAction?: { type: "resolve_conflict" }; // Fired from the inline conflict badge
  showDetailsAction?: { type: "show_block_details" }; // Fired on hover/focus or info icon

  // Optional configuration
  // Granularity of the grid in minutes (e.g., 15 or 30). Default: 15
  timeStepMinutes?: number;

  // Whether to show the "now" indicator line. Default: true
  showNowIndicator?: boolean;
}

/**
 * A single scheduled time block displayed on the grid.
 * Times should be ISO strings or "HH:mm" local times; the component will normalize to a timeline.
 */
interface TimeBlock {
  id: string; // Unique identifier for the block
  title: string; // Short label for the task/event (e.g., "Write report")
  start: string; // Start time (e.g., "2025-11-19T09:00:00Z" or "09:00")
  end: string; // End time (e.g., "2025-11-19T10:30:00Z" or "10:30")

  // Tags for visual prioritization and effort sizing
  priority: "Low" | "Med" | "High";
  effort: "S" | "M" | "L";

  // Workflow status used for styling/progress
  status: "Planned" | "InProgress" | "Done";

  // Inline conflict indicator (true if overlaps calendar or another block)
  conflict?: boolean;

  // Optional detail for conflict context (e.g., conflicting block IDs or calendar event IDs)
  conflictWithIds?: string[]; // Example: ["cal_123", "block_456"]
}

interface TodoTaskListProps {
  /**
   * Date the user is planning for, in ISO 8601 date format (YYYY-MM-DD).
   * Example: "2025-11-19"
   */
  dayIsoDate: string;

  /**
   * Tasks to show as candidates for scheduling.
   * Only "Open" tasks are typically shown; "Done" can appear with a check state.
   */
  tasks: TodoTask[];

  /**
   * Single action channel for all interactions (drag-to-schedule, quick edits, mark done, open details).
   * Dispatch one of the supported action shapes below.
   */
  onAction: TodoTaskListAction;

  /**
   * Whether to surface potential conflict warnings (e.g., overlaps with existing calendar events).
   * Default: true
   */
  showConflictWarnings?: boolean;

  /**
   * Optional daily goal progress for the visual progress bar.
   * If omitted, the progress bar is hidden.
   */
  dailyGoal?: DailyGoalProgress;

  /**
   * User's IANA time zone for interpreting start/end times.
   * Example: "America/Los_Angeles"
   * Default: browser/system time zone
   */
  timeZone?: string;
}

/**
 * Minimal task model for scheduling and prioritization.
 */
interface TodoTask {
  /** Unique task identifier */
  id: string;

  /** Short, user-visible title. Example: "Write project status update" */
  title: string;

  /** Estimated duration in minutes. Example: 45 */
  estDurationMins: number;

  /** Relative importance: Low | Med | High */
  priority: "Low" | "Med" | "High";

  /** Effort level: S (small), M (medium), L (large) */
  effort: "S" | "M" | "L";

  /**
   * Optional due date/time in ISO 8601. Examples:
   * - Date only: "2025-11-20"
   * - Date-time: "2025-11-20T17:00:00Z"
   */
  due?: string;

  /** Current status; "Open" tasks are shown as unscheduled candidates */
  status: "Open" | "Done";

  /**
   * Optional icon for the task (e.g., category glyph or emoji image).
   * Example: "https://cdn.example.com/icons/email.png"
   */
  iconUrl?: string;
}

/**
 * Progress context for the daily goal completion bar.
 */
interface DailyGoalProgress {
  /** Target planned time for the day in minutes. Example: 240 (4 hours) */
  targetMins: number;

  /** Minutes already scheduled into time blocks for the day. Example: 120 */
  scheduledMins: number;

  /** Minutes completed (from tasks marked "Done"). Example: 60 */
  completedMins: number;
}

/**
 * Unified action interface for all interactions from the task list.
 * Send exactly one object matching one of the shapes below.
 */
type TodoTaskListAction =
  | {
      /** Create a time block for a task by dropping it into the grid */
      type: "schedule_task";
      payload: {
        taskId: string;
        /**
         * Proposed start time in ISO 8601. Example: "2025-11-19T09:30:00-05:00"
         */
        startIso: string;
        /**
         * Proposed end time in ISO 8601. Example: "2025-11-19T10:15:00-05:00"
         */
        endIso: string;
      };
    }
  | {
      /** Quick edit: change priority tag */
      type: "update_priority";
      payload: {
        taskId: string;
        priority: "Low" | "Med" | "High";
      };
    }
  | {
      /** Quick edit: change effort tag */
      type: "update_effort";
      payload: {
        taskId: string;
        effort: "S" | "M" | "L";
      };
    }
  | {
      /** Mark a task as completed */
      type: "mark_done";
      payload: {
        taskId: string;
      };
    }
  | {
    /** Open the task details drawer/modal */
    type: "open_details";
    payload: {
      taskId: string;
    };
  };

interface CalendarEventsSidebarProps {
  // ISO date for the selected day (local to `timezone`)
  // Example: "2025-11-19"
  date: string;

  // IANA timezone to interpret dates/times
  // Example: "America/Los_Angeles"
  timezone: string;

  // Read-only events anchoring the schedule for the selected day
  // Times should be full ISO strings with timezone or UTC "Z"
  // Example item:
  // { id: "evt_123", title: "Standup", start: "2025-11-19T09:30:00-08:00", end: "2025-11-19T10:00:00-08:00", calendar: "work", color: "#2563EB" }
  events: CalendarEvent[];

  // List of calendars available for toggling visibility in the sidebar
  // Used to render filter controls
  // Example: [{ id: "work", name: "Work", color: "#2563EB" }, { id: "personal", name: "Personal", color: "#F59E0B" }]
  availableCalendars: CalendarMeta[];

  // Currently visible calendars (filtered set)
  // If empty, treat as "show none"
  // Example: ["work", "personal"]
  visibleCalendarIds: string[];

  // 12-hour or 24-hour time labels in the list
  timeFormat?: "12h" | "24h";

  // Working hours window to focus the list view (optional)
  // Times are local HH:mm in `timezone`
  // Example: { start: "08:00", end: "18:00" }
  workHours?: {
    start: string;
    end: string;
  };

  // Show overlapping-event conflict indicators
  showConflictWarnings?: boolean;

  // Action fired when a calendar’s visibility is toggled
  // If `nextVisible` is omitted, the UI should invert current visibility
  // Example: { type: "toggle_calendar_visibility", calendarId: "work", nextVisible: false }
  toggleCalendarVisibilityAction: {
    type: "toggle_calendar_visibility";
    calendarId: string;
    nextVisible?: boolean;
  };

  // Action to open an event details tooltip/popover
  // Example: { type: "open_event_details_tooltip", eventId: "evt_123" }
  openEventDetailsAction: {
    type: "open_event_details_tooltip";
    eventId: string;
  };

  // Navigate to other days
  // "specific" requires a target ISO date
  // Examples:
  // { type: "change_day", direction: "previous" }
  // { type: "change_day", direction: "specific", date: "2025-11-20" }
  changeDayAction: {
    type: "change_day";
    direction: "previous" | "next" | "today" | "specific";
    date?: string;
  };

  // Optional delay before showing event tooltip (ms)
  // Example: 150
  tooltipDelayMs?: number;
}

interface CalendarEvent {
  id: string; // Unique ID across calendars
  title: string; // Display title
  start: string; // ISO datetime (e.g., "2025-11-19T09:30:00-08:00" or "2025-11-19T17:30:00Z")
  end: string; // ISO datetime
  calendar: string; // Calendar ID, must match an id in `availableCalendars`
  color?: string; // Hex or CSS color for the event chip (falls back to calendar color)
  // Optional extra metadata commonly needed for read-only display
  location?: string; // Free text location
  isAllDay?: boolean; // True for all-day blocks (no specific times)
}

interface CalendarMeta {
  id: string; // Calendar ID (e.g., "work", "personal")
  name: string; // Human-readable name
  color?: string; // Default color for events in this calendar (e.g., "#2563EB")
}

interface SchedulingConstraintsPanelProps {
  // Unique identifier for this panel instance (e.g., "daily-constraints-2025-11-19")
  id: string;

  // Short title shown in the panel header (e.g., "Scheduling Constraints")
  title: string;

  // Optional icon for the panel header (e.g., a clock or calendar icon URL)
  // Example: "https://cdn.example.com/icons/time-blocking.png"
  iconUrl?: string;

  // Optional IANA timezone for interpreting times (default inferred from user/device)
  // Example: "America/Los_Angeles"
  timezone?: string;

  // Grouped constraints that control how time blocks are generated
  constraints: {
    // Workday bounds for time blocking (24h local time)
    // Example: { start: "09:00", end: "17:30" }
    workHours: {
      start: string; // "HH:mm"
      end: string;   // "HH:mm"
    };

    // Optional windows of deeper focus to prioritize for high-priority tasks
    // Times are "HH:mm" within the same day; non-overlapping recommended
    // Example: [{ start: "10:00", end: "12:00" }, { start: "14:00", end: "16:00" }]
    focusWindows?: Array<{
      start: string; // "HH:mm"
      end: string;   // "HH:mm"
    }>;

    // Minimum buffer between adjacent blocks/events in minutes
    // Example: 10
    bufferMinutes: number;

    // Maximum single block length in minutes; longer tasks will be split
    // Example: 90
    maxBlockLengthMins: number;

    // Break insertion policy between blocks
    // "None" = no enforced breaks
    // "Short" = short breaks (e.g., 5–10m) after long focus periods
    // "Pomodoro" = structured intervals (e.g., 25/5 with longer breaks every 4 cycles)
    breakPolicy: "None" | "Short" | "Pomodoro";

    // If true, automatically reschedules affected blocks when calendar changes occur
    autoReschedule: boolean;
  };

  // Single action dispatcher for user interactions within the panel
  // Supported types:
  // - "apply_constraints": regenerate time blocks using the provided constraints
  //   Example payload:
  //   {
  //     constraints: { ...same shape as props.constraints },
  //     source: "user_apply" | "auto_tune" // optional hint about origin
  //   }
  // - "reset_defaults": revert controls to sensible defaults
  //   Example payload:
  //   {
  //     presetId?: "conservative" | "balanced" | "aggressive" // optional named preset
  //   }
  onAction: {
    type: "apply_constraints" | "reset_defaults";
    payload?:
      | {
          constraints: SchedulingConstraintsPanelProps["constraints"];
          source?: "user_apply" | "auto_tune";
        }
      | {
          presetId?: "conservative" | "balanced" | "aggressive";
        };
  };
}

interface ConflictWarningBannerProps {
  // Unique id for this banner instance (useful for telemetry or referencing)
  id: string;

  // Short, prominent summary title (e.g., "3 scheduling conflicts detected")
  title: string;

  // Optional icon to visually indicate warning state (e.g., a warning/clock icon)
  iconUrl?: string;

  // Detected conflicts for the current time-blocked plan.
  // Keep items minimal; component can show per-item quick actions and a "resolve all".
  conflicts: ConflictConflictItem[];

  // One-click: apply the suggested fix for a single conflict.
  // The component will fill in payload.blockId and payload.suggestion from the clicked conflict item.
  // Example emitted action: { type: "apply_conflict_suggestion", payload: { blockId: "b_123", suggestion: "Shift" } }
  applySuggestionAction: {
    type: "apply_conflict_suggestion";
    // Note: payload values are supplied by the component at interaction time.
    payload: {
      blockId: string;
      suggestion: ConflictSuggestedFix;
    };
  };

  // Bulk: resolve all conflicts at once.
  // The component may supply all current conflictIds and use the default strategy unless provided here.
  // Example emitted action: { type: "resolve_all_conflicts", payload: { conflictIds: ["b_1","b_2"], strategy: "apply_suggestions" } }
  resolveAllAction: {
    type: "resolve_all_conflicts";
    payload: {
      conflictIds: string[]; // Typically derived from conflicts[].blockId
      strategy?: "apply_suggestions" | "open_review"; // Default: "apply_suggestions"
    };
  };

  // Inspect/edit: open the affected block in an editor.
  // The component will fill in payload.blockId based on the selected conflict.
  // Example emitted action: { type: "open_block_editor", payload: { blockId: "b_123" } }
  openBlockEditorAction?: {
    type: "open_block_editor";
    payload: {
      blockId: string;
    };
  };

  // Optional display tuning:
  // - Limit how many conflicts are expanded; rest can be summarized as "+N more"
  // - Toggle severity legend/chips to keep the banner compact
  maxVisibleConflicts?: number; // Default: 3
  showSeverityLegend?: boolean; // Default: true
}

/* Supporting types */

type ConflictIssue = "Overlap" | "OutsideHours" | "PastDue";
type ConflictSeverity = "Info" | "Warn" | "Error";
type ConflictSuggestedFix = "Shift" | "Split" | "Shorten" | "Move";

interface ConflictConflictItem {
  // Identifier of the affected time block (also acts as conflictId)
  blockId: string;

  // Nature of the conflict (e.g., overlaps an event, outside working hours, or already past due)
  issue: ConflictIssue;

  // Visual severity signal for prioritization
  severity: ConflictSeverity;

  // The suggested one-click fix to offer by default
  suggestion: ConflictSuggestedFix;

  // Optional human-friendly name for the block to display (e.g., "Write project brief")
  blockTitle?: string;

  // Optional brief hint to show under the item (e.g., "Overlaps: 10:30–11:00 with Team Standup")
  hint?: string;
}