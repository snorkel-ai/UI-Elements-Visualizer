interface ConferenceAgendaPlannerProps {
  // Days available to browse. Use ISO date strings (YYYY-MM-DD), e.g., ["2025-05-02","2025-05-03","2025-05-04"]
  days: string[];

  // Currently selected day. Must match one of the entries in `days`
  selectedDay: string;

  // All sessions relevant to the agenda (across all days). Start/end should be ISO 8601 datetimes.
  // The component will filter sessions to the selected day and render them by track with conflict highlighting.
  sessions: AgendaSession[];

  // Track definitions used to group sessions into columns (e.g., "Track A", "Mobile", "Keynotes")
  tracks: AgendaTrack[];

  // Session IDs the user has marked as favorite; used to highlight selections and summarize the personalized agenda
  favoriteSessionIds: string[];

  // Currently applied filters (topics and speakers). An empty array means "no filter" for that facet.
  filters: AgendaFilters;

  // Single action sink for all user interactions from this component.
  // The host app should listen for events of kind ConferenceAgendaPlannerEvent.
  // Examples of emitted payloads:
  // - { kind: "change_day", day: "2025-05-03" }
  // - { kind: "update_filters", filters: { topics: ["AI"], speakers: ["spk_42"] } }
  // - { kind: "toggle_favorite", sessionId: "sess_101" }
  // - { kind: "open_session", sessionId: "sess_101" }
  onUserEventAction: { type: "conference_planner_event" };

  // Optional: IANA time zone for rendering times (e.g., "America/Los_Angeles"). Default: browser/local time zone
  timeZone?: string;

  // Optional: Show the inline personalized summary (counts, conflicts, next up). Default: true
  showSummary?: boolean;
}

/* Data types */

interface AgendaSession {
  id: string; // Unique session ID, e.g., "sess_101"
  title: string; // Display title, e.g., "Scaling TypeScript at Enterprise"
  start: string; // ISO datetime, e.g., "2025-05-03T09:00:00-07:00"
  end: string; // ISO datetime, must be after `start`
  trackId: string; // Must match an id in `tracks`
  topicIds: string[]; // Topics used for filtering, e.g., ["ai","typescript"]
  speakerIds: string[]; // Speakers used for filtering, e.g., ["spk_12","spk_42"]
  room?: string; // Optional room label, e.g., "Hall B"
  // Optional short blurb for tooltips or detail preview (not required for grid rendering)
  summary?: string;
  // Optional image for quick visual cue (e.g., session banner or primary speaker avatar)
  imageUrl?: string;
}

interface AgendaTrack {
  id: string; // Unique track ID, e.g., "track_mobile"
  name: string; // Display name, e.g., "Mobile"
}

interface AgendaFilters {
  topics: string[]; // Selected topic IDs to include; empty => no topic filter
  speakers: string[]; // Selected speaker IDs to include; empty => no speaker filter
}

/* Events emitted through onUserEventAction (payload contract) */
type ConferenceAgendaPlannerEvent =
  | { kind: "change_day"; day: string }
  | { kind: "update_filters"; filters: AgendaFilters }
  | { kind: "toggle_favorite"; sessionId: string }
  | { kind: "open_session"; sessionId: string };

interface SessionDetailDrawerProps {
  // Primary identifiers
  id: string; // The sessionId (e.g., "S-204")
  title: string; // Session title shown in the drawer header
  name: string; // Short label like track or room name (e.g., "Frontend Track" or "Room B")

  // Key display fields
  description: string; // Plain-text abstract/summary. Avoid HTML; renderer handles formatting
  time: {
    start: string; // ISO 8601 datetime (e.g., "2025-05-21T10:00:00Z")
    end: string;   // ISO 8601 datetime (e.g., "2025-05-21T10:45:00Z")
  };

  // Single action channel (use discriminated union). All interactions dispatch via this
  onAction: SessionDetailDrawerAction;

  // Optional configuration
  isFavorite?: boolean; // Defaults to false; if true, show "favorited" state
  conflictsWith?: string[]; // Session IDs that time-conflict (e.g., ["S-110","S-142"])
}

/**
 * Action object dispatched from the drawer.
 * Example usages:
 * - { type: "toggle_favorite", payload: { sessionId: "S-204" } }
 * - { type: "add_to_agenda", payload: { sessionId: "S-204" } }
 * - { type: "close" }
 * - { type: "open_conflict", payload: { sessionId: "S-110" } }
 */
type SessionDetailDrawerAction =
  | { type: "toggle_favorite"; payload: { sessionId: string } }
  | { type: "add_to_agenda"; payload: { sessionId: string } }
  | { type: "open_conflict"; payload: { sessionId: string } } // Open details for a conflicting session
  | { type: "close" };

interface GoalPreferencesFormProps {
  // Primary identifiers
  id: string; // Unique form instance ID (e.g., "goals_form_attendee_123")
  name: string; // Attendee display name or profile label (e.g., "Alex Kim")
  title: string; // Form title (e.g., "Set Your Conference Goals")

  // Key display fields
  conferenceName: string; // Conference name (e.g., "Future Tech Summit 2025")
  description?: string; // Brief helper copy (e.g., "Tell us what matters so we can suggest sessions.")
  imageUrl?: string; // Optional conference/logo image URL

  // Initial data to prefill the form
  initialGoals: {
    priorityTopics: string[]; // e.g., ["AI", "TypeScript", "Accessibility"]
    preferredSpeakers: string[]; // Speaker IDs or names; prefer stable IDs when available (e.g., ["spk_42", "Ada Lovelace"])
    avoidTimes: { start: string; end: string }[]; // Time ranges in ISO 8601 or "HH:mm" (local) format; e.g., [{ start: "2025-06-12T12:00", end: "2025-06-12T13:30" }]
    sessionPace: 'light' | 'balanced' | 'packed'; // Light = fewer sessions/day, Packed = maximize sessions
  };

  // Single action for submission; dispatched when user saves the form
  onSubmitAction: {
    type: "save_goal_preferences";
    payload: {
      id: string; // Mirror of props.id
      goals: {
        priorityTopics: string[];
        preferredSpeakers: string[];
        avoidTimes: { start: string; end: string }[];
        sessionPace: 'light' | 'balanced' | 'packed';
      };
    };
  };

  // Optional configuration
  maxPriorityTopics?: number; // Default: 5. Caps how many topics can be selected
  allowCustomTopics?: boolean; // Default: true. Allow users to add topics not in the catalog
}

interface ConflictResolutionModalProps {
  // List of conflicts where multiple sessions occur in the same time slot.
  // Each conflict asks the user to choose exactly one option.
  conflicts: ConflictItem[];

  // Preselected session IDs that the user has already favorited/chosen.
  // Used to pre-highlight selections within each conflict block.
  // Example: ["sess_abc123", "sess_def456"]
  currentSelectionIds?: string[];

  // Dispatched when the user finalizes their choices for all conflicts.
  // selectionsBySlot maps a stable slotKey to the chosen session id.
  // Example:
  // {
  //   type: "resolve_conflicts",
  //   payload: {
  //     selectionsBySlot: {
  //       "2025-06-12T09:00-2025-06-12T10:00": "sess_abc123",
  //       "2025-06-12T11:00-2025-06-12T12:00": "sess_xyz789"
  //     }
  //   }
  // }
  onResolveAction: {
    type: "resolve_conflicts";
    payload: {
      selectionsBySlot: Record<string, string>;
    };
  };

  // Dispatched when the user closes/dismisses the modal without applying changes.
  // Example: { type: "close_modal" }
  onCloseAction?: { type: "close_modal" };

  // IANA timezone for rendering times (e.g., "America/New_York").
  // If not provided, UI may default to browser/system timezone.
  timezone?: string;

  // If true, show track badges/names next to each session option.
  // Default behavior may be to show when track info is available.
  showTrackInfo?: boolean;
}

interface ConflictItem {
  // A stable key for the time slot. Recommended format:
  // "<ISO_START>-<ISO_END>", e.g., "2025-06-12T09:00-2025-06-12T10:00"
  slotKey: string;

  // Start and end times in ISO 8601 format.
  // Example: { start: "2025-06-12T09:00:00-04:00", end: "2025-06-12T10:00:00-04:00" }
  slot: {
    start: string;
    end: string;
  };

  // Session options available during this slot.
  options: ConflictOption[];
}

interface ConflictOption {
  // Unique session identifier.
  id: string;

  // Session title, e.g., "Keynote: The Future of AI"
  title: string;

  // Optional track name for grouping/filtering, e.g., "AI/ML", "Frontend"
  trackName?: string;

  // Display names of speakers in order of appearance.
  // Example: ["Dr. Jane Smith", "Alex Johnson"]
  speakers: string[];

  // Optional image used for a speaker headshot or track icon.
  // Square images (e.g., 64–128px) recommended.
  imageUrl?: string;

  // Optional short room label, e.g., "Room A", "Main Hall"
  room?: string;
}

interface PersonalizedAgendaSummaryProps {
  // Compact list of sessions the user has currently added to their plan
  // Example:
  // [
  //   { id: "s_101", title: "Keynote: The Future of AI", start: "2025-05-06T09:00:00-04:00", end: "2025-05-06T10:00:00-04:00", trackName: "Keynotes" },
  //   { id: "s_214", title: "GraphQL Patterns", start: "2025-05-06T11:00:00-04:00", end: "2025-05-06T11:45:00-04:00", trackName: "API" }
  // ]
  selectedSessions: SessionSummaryItem[];

  // Aggregated counts for quick insight
  // perDay keys can be ISO dates ("2025-05-06") or labels ("Day 1") depending on app convention
  // Example: { perDay: { "Day 1": 4, "Day 2": 5, "Day 3": 3 }, favoriteCount: 6, conflictCount: 2 }
  totals: {
    perDay: { [day: string]: number };
    favoriteCount: number;
    conflictCount: number;
  };

  // The next upcoming session relative to "now", or null if there isn't one
  // Example: { start: "2025-05-06T13:00:00-04:00", title: "Scaling Microservices", room: "Room B" }
  nextUp: NextUpInfo | null;

  // Single action entry point for quick interactions from the summary
  // Supported:
  // - { type: "export_agenda", payload: { format: "calendar" | "pdf" } }
  // - { type: "share_agenda", payload?: { channel?: "link" | "email" } }
  // - { type: "view_conflicts" }
  // - { type: "clear_agenda_confirm" }
  onPrimaryAction: AgendaSummaryAction;

  // Optional small icon for the summary header (e.g., a calendar or bookmark icon)
  // Example: "https://cdn.example.com/icons/agenda-summary.svg"
  iconUrl?: string;

  // Optional display configuration
  // - timezone: explicitly set display TZ (default: device/browser TZ)
  // - showConflictBadge: toggle conflict indicator (default: true)
  config?: {
    timezone?: string; // e.g., "America/New_York"
    showConflictBadge?: boolean; // Default: true
  };
}

/* ---- Supporting Types ---- */

interface SessionSummaryItem {
  id: string; // Unique session ID
  title: string; // Display title
  start: string; // ISO 8601 timestamp in event timezone
  end: string; // ISO 8601 timestamp in event timezone
  trackName: string; // e.g., "AI", "Keynotes", "Security"
}

interface NextUpInfo {
  start: string; // ISO 8601 timestamp
  title: string;
  room: string; // e.g., "Hall A" or "Room 204"
}

type AgendaSummaryAction =
  | {
      type: "export_agenda";
      payload: {
        format: "calendar" | "pdf";
      };
    }
  | {
    type: "share_agenda";
    payload?: {
      channel?: "link" | "email"; // Default: "link"
    };
  }
  | {
      type: "view_conflicts";
    }
  | {
      type: "clear_agenda_confirm";
    };