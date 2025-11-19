interface PracticeOverviewDashboardProps {
  // Inclusive date range to display. Use ISO 8601 dates (YYYY-MM-DD).
  // Example: { start: "2025-01-01", end: "2025-01-31", preset: "30d" }
  dateRange: {
    start: string;
    end: string;
    preset?: "7d" | "30d" | "90d" | "ytd" | "custom";
  };

  // Aggregation for charts and summaries.
  // "day" for detailed daily minutes, "week"/"month" for smoother trends.
  timeGranularity: "day" | "week" | "month";

  // Practice streak calendar data for the selected range.
  // Dates must be contiguous for best results.
  // Example item: { date: "2025-01-03", practiced: true }
  streakDays: Array<{
    date: string; // ISO date: YYYY-MM-DD
    practiced: boolean;
  }>;

  // Time-spent series used by the line chart.
  // Example item: { date: "2025-01-03", minutes: 42 }
  timeSeries: Array<{
    date: string; // ISO date: YYYY-MM-DD
    minutes: number; // total minutes practiced that day (or aggregated per granularity)
  }>;

  // Tags for pieces or skills; used to filter the dashboard.
  // Example item: { id: "scale-major", name: "Major Scales", count: 12, selected: false }
  tags: Array<{
    id: string;
    name: string;
    count: number; // how many sessions/items match this tag in current range
    selected: boolean;
  }>;

  // Milestone badges earned, such as songs learned or tempos reached.
  // Example item (song): { id: "m1", type: "song", label: "Fur Elise (Section A)", achievedOn: "2025-01-15", iconUrl: "/icons/song.svg" }
  // Example item (tempo): { id: "m2", type: "tempo", label: "Hanon #1 at 120 BPM", achievedOn: "2025-01-20", iconUrl: "/icons/tempo.svg" }
  milestones: Array<{
    id: string;
    type: "song" | "tempo";
    label: string;
    achievedOn: string; // ISO date: YYYY-MM-DD
    iconUrl?: string; // optional icon for the badge
  }>;

  // When true, render loading skeletons/placeholders for all sections.
  loading: boolean;

  // Dispatchable action to change the visible date range.
  // Example: { type: "change_date_range", start: "2025-02-01", end: "2025-02-28", preset: "custom" }
  changeDateRangeAction: {
    type: "change_date_range";
    start: string; // ISO date
    end: string;   // ISO date
    preset?: "7d" | "30d" | "90d" | "ytd" | "custom";
  };

  // Action template for toggling a tag filter when a tag is clicked.
  // Example: { type: "toggle_tag_filter", tagId: "scale-major" }
  tagToggleAction: {
    type: "toggle_tag_filter";
    tagId: string;
  };

  // Clears all active filters (e.g., deselects all tags).
  // Example: { type: "clear_filters" }
  clearFiltersAction: {
    type: "clear_filters";
  };

  // Opens milestone details (e.g., modal or sidebar).
  // Example: { type: "open_milestone", milestoneId: "m2" }
  milestoneSelectAction: {
    type: "open_milestone";
    milestoneId: string;
  };

  // Optional action emitted when hovering a point on the minutes line chart.
  // Useful for tooltips or crosshair readouts.
  // Example: { type: "hover_time_point", date: "2025-01-10" }
  pointHoverAction?: {
    type: "hover_time_point";
    date: string; // ISO date corresponding to the hovered point
  };
}

interface Tag {
  id: string; // e.g., "tg_scales_major"
  name: string; // e.g., "Scales", "Chopin", "Sight-Reading"
}

type FocusArea = "piece" | "technique" | "theory";

interface PracticeSessionFormProps {
  formId: string; // Stable identifier for this form instance (useful for analytics or routing)

  // Optional heading shown above the form (e.g., "New Practice Session")
  title?: string;

  // Pre-filled values when creating/editing a session.
  // date uses ISO-8601 format (YYYY-MM-DD). durationMinutes is total minutes practiced.
  initialValues?: {
    date?: string; // e.g., "2025-11-19"
    durationMinutes?: number; // e.g., 30
    selectedTags?: Tag[]; // Preselected tags (pairs with tagSuggestions)
    focusArea?: FocusArea; // e.g., "technique"
    tempoBPM?: number; // Metronome tempo for the main focus, e.g., 120
    notes?: string; // Freeform notes, e.g., "Worked on left-hand staccato"
  };

  // Suggested tags the user can pick from (drives the TagPicker).
  // Keep to a small curated list for simplicity.
  tagSuggestions?: Tag[];

  // Single action object describing what to do when the user submits.
  // The component will attach the collected form data when dispatching:
  // { type: "submit_practice_session", payload: { ...formData } }
  onSubmitAction: {
    type: "submit_practice_session";
    // Optional context the host app may need to route/handle the result.
    contextId?: string; // e.g., a userId, courseId, or notebookId
  };

  // Basic validation and limits (kept minimal).
  validation?: {
    requireDate?: boolean; // Default: true
    requireDuration?: boolean; // Default: true
    minDurationMinutes?: number; // e.g., 1
    maxTempoBPM?: number; // e.g., 300
  };

  // Optional icon representing the instrument or app (e.g., a piano icon URL)
  iconUrl?: string;
}

interface SessionHistoryListProps {
  // Array of practice sessions to render (typically pre-sorted based on `sort`)
  // Example:
  // [
  //   {
  //     id: "sess_1024",
  //     dateISO: "2025-03-14T18:45:00Z",
  //     durationMinutes: 40,
  //     tags: [{ id: "tg_scales", name: "Scales" }, { id: "tg_chopin", name: "Chopin" }],
  //     tempoBPM: 92,
  //     notesSnippet: "Worked on LH independence; bar 12 needs slow practice..."
  //   }
  // ]
  sessions: SessionHistoryItem[];

  // Sort order for display; when omitted, assume "newest"
  // - "newest": most recent date first
  // - "oldest": earliest date first
  sort?: "newest" | "oldest"; // Default: "newest"

  // Cursor-based pagination. If a cursor exists, the UI can show a "Load more" affordance.
  // Pass back the next cursor received from your data source.
  // Example: { cursor: "eyJwYWdlIjoyfQ" }
  pagination?: {
    cursor?: string;
  };

  // Active filters applied to the list.
  // - dateRange: inclusive ISO 8601 date/times (UTC or with timezone offset)
  // - tagIds: filter sessions that include any of the provided tag IDs
  // Examples:
  // { dateRange: { fromISO: "2025-01-01", toISO: "2025-01-31" }, tagIds: ["tg_scales","tg_arpeggios"] }
  activeFilters?: {
    dateRange?: {
      fromISO: string; // e.g., "2025-01-01" or "2025-01-01T00:00:00Z"
      toISO: string;   // e.g., "2025-01-31" or "2025-01-31T23:59:59Z"
    };
    tagIds?: string[];
  };

  // Single action channel describing how the component emits user intents.
  // The component will emit one of the following action shapes when users interact:
  // - { kind: "expand_session", sessionId: string }
  // - { kind: "edit_session", sessionId: string }
  // - { kind: "delete_session", sessionId: string }
  // - { kind: "load_more", cursor?: string }
  // - { kind: "filter_by_tag", tagId: string }
  //
  // Example:
  // { type: "session_history_action" }
  onAction: SessionHistoryListActionChannel;

  // Optional: toggle display of tempo (BPM) per session.
  // If false, BPM is hidden even if provided.
  showTempo?: boolean; // Default: true

  // Optional: maximum characters to show for notes snippet before truncation.
  // Helps keep rows compact. When omitted, a sensible default is used.
  maxNotesChars?: number; // Default: 120
}

// A single practice session row
interface SessionHistoryItem {
  id: string;              // Unique session ID (e.g., "sess_1024")
  dateISO: string;         // ISO 8601 date/time (e.g., "2025-03-14T18:45:00Z")
  durationMinutes: number; // Total time spent (e.g., 40)
  tags?: PracticeTag[];    // Zero or more tags describing focus areas
  tempoBPM?: number;       // Peak or target BPM achieved (optional)
  notesSnippet?: string;   // Short preview of notes; full notes shown on expand
}

// Simple tag object used for filtering by tap
interface PracticeTag {
  id: string;   // e.g., "tg_scales"
  name: string; // e.g., "Scales"
}

// Describes the action channel this component uses to emit user intents
// The consumer should listen for actions with `type: "session_history_action"`
// and handle the action payloads documented above in `onAction`.
interface SessionHistoryListActionChannel {
  type: "session_history_action";
}

interface TagPickerProps {
  // All tags that can be searched/selected (music pieces or skills)
  // Example: [{ id: "p_1", name: "Moonlight Sonata", type: "piece" }, { id: "s_3", name: "Arpeggios", type: "skill" }]
  availableTags: Tag[];

  // Currently selected tag IDs (for 'single' variant, use 0-1 items)
  // Example: ["p_1", "s_3"]
  selectedTagIds: string[];

  // Current search query (used for search-as-you-type)
  // Example: "moon" or "tempo"
  query: string;

  // Selection mode; 'multi' allows multiple tags, 'single' restricts to one
  // Default: 'multi'
  variant?: "single" | "multi";

  // Allow creating a new tag when no exact match is found
  // Default: true
  allowCreate?: boolean;

  // Optional search input placeholder text
  // Example: "Search pieces or skills..."
  placeholder?: string;

  // Single action endpoint the component uses for all interactions.
  // The component dispatches this with different payload variants depending on the user action:
  // - { kind: "search", query }
  // - { kind: "select_tag", tagId }
  // - { kind: "deselect_tag", tagId }
  // - { kind: "create_tag", name, tagType }
  // - { kind: "clear_selection" }
  onChangeAction: { type: "tag_picker_change"; payload: TagPickerChangePayload };
}

// Tag data model for the music practice domain
interface Tag {
  id: string;   // Stable unique ID, e.g., "p_1" or "s_3"
  name: string; // Display name, e.g., "Moonlight Sonata" or "Arpeggios"
  type: TagType;
}

type TagType = "piece" | "skill";

// Action payload variants emitted through onChangeAction
type TagPickerChangePayload =
  | { kind: "search"; query: string }
  | { kind: "select_tag"; tagId: string }
  | { kind: "deselect_tag"; tagId: string }
  | { kind: "create_tag"; name: string; tagType: TagType }
  | { kind: "clear_selection" };

interface ProgressFiltersBarProps {
  dateRangePreset: '7d' | '30d' | '90d' | 'custom'; 
  // Quick range selector. 'custom' uses customRange below.
  // Examples: '7d' for last 7 days; '30d' for last 30 days.

  customRange?: { start: string; end: string };
  // Required only when dateRangePreset === 'custom'.
  // ISO dates (YYYY-MM-DD). Example: { start: '2025-01-01', end: '2025-01-31' }

  selectedTagIds?: string[];
  // Tag filters for pieces/skills. Example: ['scales', 'chopin', 'left-hand']

  showCompletedMilestonesOnly?: boolean;
  // When true, only shows sessions tied to completed milestones/badges. Default: false

  filtersChangedAction?: {
    // Emitted when user applies/changes filters (preset change, custom dates, tags, clear).
    type: 'filters_changed';
    filters: {
      dateRangePreset: '7d' | '30d' | '90d' | 'custom';
      customRange?: { start: string; end: string }; // present if preset is 'custom'
      selectedTagIds?: string[];
      showCompletedMilestonesOnly?: boolean;
    };
  };
  // Example payload:
  // {
  //   type: 'filters_changed',
  //   filters: {
  //     dateRangePreset: 'custom',
  //     customRange: { start: '2025-02-01', end: '2025-02-28' },
  //     selectedTagIds: ['arpeggios', 'beethoven'],
  //     showCompletedMilestonesOnly: true
  //   }
  // }
}