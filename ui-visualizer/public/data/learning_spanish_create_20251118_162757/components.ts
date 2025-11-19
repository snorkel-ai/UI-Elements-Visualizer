interface WeeklyPracticeDashboardProps {
  // ISO week start date (Monday). Example: "2025-03-03"
  weekStartDate: string;

  // Calendar sessions for the week
  sessions: SessionItem[]; // At least 0..n items

  // Activity legend used for tags/filters and coloring
  activityTypes: ActivityType[]; // Keys referenced by filters; colors shown in legend

  // Spaced-repetition review queues (e.g., Anki/Decks) with due counts
  reviewQueue: ReviewQueueItem[];

  // Proficiency values shown as a radar chart across skills (0-100)
  proficiency: ProficiencyStat[];

  // Locale for date/time and number formatting (e.g., "en-US", "es-ES"). Default inferred.
  locale?: string;

  // Pre-applied activity type filters (array of activityTypes[key])
  initialActivityFilters?: string[];

  // User interactions (dispatched by the component as action objects, not callbacks)

  // Fired when the user selects a session in the calendar
  onSelectSessionAction?: { type: "select_session"; sessionId: string };

  // Fired when the user wants to add a new session (e.g., via "+" button)
  onAddSessionAction?: { type: "add_session" };

  // Fired when the user starts a review for a specific deck from the queue
  onStartReviewAction?: { type: "start_review"; deckId: string };

  // Fired when the user changes the activity-type filter selection
  onFilterByActivityTypeAction?: { type: "filter_by_activity_type"; activityKeys: string[] };
}

/* ====== Supporting Types ====== */

type Skill =
  | "Vocabulary"
  | "Grammar"
  | "Speaking"
  | "Listening"
  | "Reading"
  | "Writing";

interface SessionItem {
  id: string; // Unique session id
  // ISO 8601 date/time when the session occurs. Example: "2025-03-05T17:30:00"
  date: string;
  skillType: Skill; // Primary skill focus of the session
  title: string; // Short label, e.g., "Verb Conjugations: Presente"
  durationMin: number; // Planned or actual minutes, e.g., 30
  status: "planned" | "completed" | "missed" | "in_progress";
  // Optional notes shown in details or hover
  notes?: string;
}

interface ActivityType {
  key: string; // Used for filtering and tag reference, e.g., "vocab", "grammar", "speaking"
  label: string; // Display name, e.g., "Vocabulary"
  color: string; // Hex or CSS color, e.g., "#5B8DEF"
  iconUrl?: string; // Optional icon for legend/tag, e.g., CDN URL
}

interface ReviewQueueItem {
  id: string; // Deck id
  deckName: string; // e.g., "Top 1000 Spanish Nouns"
  dueCount: number; // Number of cards due now/soon
  // ISO datetime for the next due item, or null if nothing scheduled
  nextDue: string | null; // Example: "2025-03-04T08:00:00"
}

interface ProficiencyStat {
  skill: Skill; // Must match one of the radar chart axes
  level0to100: number; // 0..100 inclusive; e.g., 65
}

interface PracticeCalendarGridProps {
  // ISO date string (YYYY-MM-DD) for the Monday (or chosen) start of the week being displayed
  weekStartDate: string;

  // Primary data: planned practice sessions shown in the grid
  sessions: PracticeSession[];

  // Optional timezone to interpret dates/times (IANA name, e.g., "Europe/Madrid")
  timezone?: string;

  // Visual metadata for skill types used in sessions (labels/icons for legend or tags)
  // Provide only the skill types you use in `sessions`
  skillMeta?: SkillMeta[];

  // Toggle whether Saturday/Sunday columns are shown
  showWeekend?: boolean;

  // Time display preference for start times
  timeFormat?: "12h" | "24h";

  // Optional daily badges/annotations (e.g., review queue counts)
  // Example: { date: "2025-01-05", reviewCount: 12, note: "SRS reviews due" }
  dayAnnotations?: DayAnnotation[];

  // Interaction: user selects a session tile
  // Component will populate `sessionId` when dispatching
  onSelectSessionAction: {
    type: "select_session";
    sessionId: string;
  };

  // Interaction: user adds a new session on a specific date (e.g., via empty slot or "+" button)
  // Component will populate `date` (YYYY-MM-DD) when dispatching
  onAddSessionAction: {
    type: "add_session";
    date: string;
  };

  // Interaction: user marks an existing session as done
  // Component will populate `sessionId` when dispatching
  onMarkDoneAction: {
    type: "mark_session_done";
    sessionId: string;
  };
}

// A single scheduled or completed practice session on the calendar
interface PracticeSession {
  id: string; // Unique identifier for the session
  date: string; // ISO date (YYYY-MM-DD) the session occurs on
  startTime?: string; // Optional start time in 24h "HH:mm" (e.g., "18:30"); omit for "any time"
  durationMin: number; // Length in minutes (e.g., 25, 45, 60)
  skillType: SkillType; // Which skill this session targets
  title: string; // Short label shown in the grid (e.g., "Verb drills", "Conversation")
  status: "planned" | "done"; // Planned versus completed
}

// Domain skills commonly used in a language learning planner
type SkillType =
  | "vocabulary"
  | "grammar"
  | "speaking"
  | "listening"
  | "reading"
  | "writing";

// Optional metadata for rendering skill tags/legend
interface SkillMeta {
  type: SkillType; // Must match values used in `sessions.skillType`
  label: string; // Human-readable label (e.g., "Vocabulary")
  iconUrl?: string; // Optional icon representing the skill
}

// Optional per-day annotations for badges or auxiliary info
interface DayAnnotation {
  date: string; // ISO date (YYYY-MM-DD) within the displayed week
  reviewCount?: number; // Number of spaced-repetition reviews due that day
  note?: string; // Short note or target, e.g., "60 min goal"
}

interface ActivityTypeTagProps {
  // Unique, stable identifier for the activity type (avoid using React's "key")
  // Examples: "vocabulary", "grammar", "speaking"
  typeKey: string;

  // Human-friendly label shown on the tag
  // Examples: "Vocabulary", "Grammar", "Speaking"
  label: string;

  // Display color for the tag/chip. Can be a HEX, CSS variable, or named color.
  // Examples: "#4CAF50", "var(--tag-grammar)", "tomato"
  color: string;

  // Whether the tag is currently active/selected (used for filtering)
  selected: boolean;

  // Optional icon for visual identification.
  // Can be an emoji or a URL to an icon asset.
  // Examples: "📚" (emoji), "/icons/speaking.svg" (URL)
  icon?: string;

  // Short helper text shown in tooltips or accessible labels
  // Example: "Activities focusing on word acquisition and recall"
  description?: string;

  // Optional count of items associated with this type (e.g., scheduled tasks in the week)
  // Example: 5
  count?: number;

  // Optional: disable interactions (e.g., when no activities exist yet)
  disabled?: boolean;

  // Action dispatched when the user toggles the tag.
  // The component determines nextSelected (e.g., !selected) and includes it here.
  // Example:
  // { type: "toggle_activity_type", payload: { typeKey: "vocabulary", nextSelected: true } }
  onToggleAction: {
    type: "toggle_activity_type";
    payload: {
      typeKey: string;
      nextSelected: boolean;
    };
  };
}

interface StartReviewAction {
  // Dispatched when the user begins reviewing a specific deck
  // Example: { type: "start_review", payload: { deckId: "deck_123" } }
  type: "start_review";
  payload: {
    deckId: string;
  };
}

interface ReorderDeckAction {
  // Dispatched after the user reorders a deck within the list
  // position is the new 0-based index within the list
  // Example: { type: "reorder_deck", payload: { deckId: "deck_123", position: 0 } }
  type: "reorder_deck";
  payload: {
    deckId: string;
    position: number; // 0-based target index
  };
}

interface ReviewQueueItem {
  // Unique identifier for the deck/queue
  id: string;

  // Human-readable deck name (e.g., "Spanish - Travel Phrases")
  deckName: string;

  // Number of items currently due for review
  // Example: 0, 5, 23
  dueCount: number;

  // Next due time in ISO 8601 string
  // Example: "2025-11-19T09:00:00Z"
  nextDue: string;

  // Optional priority for scheduling emphasis
  // Example: "high" for a weak area like speaking drills
  priority?: "low" | "medium" | "high";

  // Optional icon for the deck (URL to an image or emoji as a data URL)
  // Example: "https://cdn.example.com/icons/speaking.png"
  iconUrl?: string;

  // Primary skill focus to help learners balance practice
  // Example: "vocabulary" for word lists or "speaking" for conversation prompts
  focusSkill?: "vocabulary" | "grammar" | "speaking" | "listening" | "reading" | "writing";
}

interface ReviewQueueListProps {
  // List of spaced-repetition queues to display
  // Provide at least id, deckName, dueCount, nextDue
  // Example:
  // [
  //   { id: "deck_vocab_basic", deckName: "Spanish - Core Vocab A1", dueCount: 12, nextDue: "2025-11-19T08:30:00Z", priority: "high", focusSkill: "vocabulary" },
  //   { id: "deck_grammar_present", deckName: "Present Tense Drills", dueCount: 4, nextDue: "2025-11-19T10:15:00Z", priority: "medium", focusSkill: "grammar" }
  // ]
  queues: ReviewQueueItem[];

  // Action emitted when the user starts reviewing a deck
  // The component will fill payload.deckId with the selected queue's id
  startReviewAction: StartReviewAction;

  // Action emitted after a deck is reordered by the user (e.g., drag-and-drop)
  // Include to enable reordering; omit to render without reorder controls
  reorderAction?: ReorderDeckAction;

  // Optional default sorting strategy for displaying queues
  // "due_soon" sorts by nextDue ascending
  // "priority" sorts by priority (high -> low), then due soon
  // "alphabetical" sorts by deckName A->Z
  // Default (if omitted): "due_soon"
  sortOrder?: "due_soon" | "priority" | "alphabetical";

  // Optional current timestamp in ISO 8601 to compute "due soon" highlights consistently
  // If omitted, the component may use the client's current time
  // Example: "2025-11-19T07:00:00Z"
  timeNow?: string;
}

interface ProficiencyRadarChartProps {
  // Human-readable heading for accessibility and context (e.g., "Spanish Proficiency Radar")
  title: string;

  // Primary dataset to plot on the radar
  // - level0to100: number from 0 to 100
  // - trend: optional directional hint based on recent changes
  skills: SkillPoint[];

  // ISO 8601 timestamp (e.g., "2025-11-19T10:15:00Z")
  lastUpdated: string;

  // Optional goal ring/markers to visualize desired proficiency targets per skill
  targetLevels?: TargetLevel[];

  // Optional comparison overlay (e.g., last week or baseline) to show progress vs. a prior snapshot
  compareSnapshot?: CompareSnapshot;

  // Display variant to control density of labels/legend/tooltips
  // - compact: minimal labels
  // - standard: balanced defaults
  // - detailed: more annotations (e.g., value labels on axes)
  appearance?: "compact" | "standard" | "detailed";

  // Toggle legend display (defaults to true in most implementations)
  showLegend?: boolean;

  // Tooltip value formatting
  // - percent: "78%" (typical for 0-100 scales)
  // - raw: "78" (no symbol)
  tooltipFormat?: "percent" | "raw";

  // Fired when a skill segment/axis is hovered
  // Example: { type: "skill_hover", skill: "Listening" }
  onSkillHoverAction?: SkillHoverAction;

  // Fired when user requests more detail about a specific skill
  // Example: { type: "view_skill_details", skill: "Grammar" }
  onViewDetailsAction?: ViewDetailsAction;

  // Optional sharing action (e.g., copy link or download image)
  // Example: { type: "share_chart", method: "download_image", imageUrl: "https://..." }
  onShareAction?: ShareAction;
}

/* ---------- Supporting Types ---------- */

type Skill =
  | "Vocabulary"
  | "Grammar"
  | "Speaking"
  | "Listening"
  | "Reading"
  | "Writing";

interface SkillPoint {
  skill: Skill;
  // Integer or float in [0, 100]; e.g., 72.5
  level0to100: number;
  // Optional short-term movement indicator for badges/arrows
  trend?: "up" | "down" | "steady";
}

interface TargetLevel {
  skill: Skill;
  // Desired target level in [0, 100]; e.g., 85
  target0to100: number;
}

interface CompareSnapshot {
  // Descriptor shown in legend/tooltip (e.g., "Last week", "Baseline")
  label: string;
  // Same structure as primary data; unmatched skills are ignored
  skills: SkillPoint[];
}

/* ---------- Action Objects (no callbacks) ---------- */

interface SkillHoverAction {
  type: "skill_hover";
  skill: Skill;
}

interface ViewDetailsAction {
  type: "view_skill_details";
  skill: Skill;
}

interface ShareAction {
  type: "share_chart";
  method: "copy_link" | "download_image" | "open_dashboard";
  // If method === "download_image", provide a pre-rendered image resource
  imageUrl?: string;
}

type SkillTypeKey =
  | "vocabulary"
  | "grammar"
  | "speaking"
  | "listening"
  | "reading"
  | "writing";

interface SessionDraft {
  id?: string; // Present when editing an existing session
  date: string; // ISO date string, e.g., "2025-01-15"
  time?: string; // Optional 24h time string "HH:mm", e.g., "18:30"
  title: string; // Short, user-friendly title, e.g., "Verb Conjugation Drills"
  skillType: string; // Must match one of skillOptions.key (e.g., "vocabulary")
  durationMin: number; // Duration in minutes, e.g., 25
  notes?: string; // Optional free text, e.g., "Focus on irregular preterite"
}

interface SkillOption {
  key: string; // Internal key, e.g., "vocabulary"
  label: string; // Display label, e.g., "Vocabulary"
  iconUrl?: string; // Optional icon to represent the skill
}

interface SaveSessionAction {
  type: "save_session";
  draft: SessionDraft; // Full draft to persist
}

interface CloseModalAction {
  type: "close_modal";
  reason?: "cancel" | "completed" | "backdrop" | "escape"; // Optional UX reason
}

interface DeleteSessionAction {
  type: "delete_session";
  id: string; // Session ID to delete (required in edit mode)
}

interface SessionEditorModalProps {
  // "create" shows empty defaults; "edit" pre-fills and may enable delete
  mode: "create" | "edit";

  // The working session draft (pre-filled in "edit", defaults in "create")
  sessionDraft: SessionDraft;

  // Allowed skill choices for the session form dropdown
  skillOptions: SkillOption[];

  // Triggered when user confirms save (e.g., clicks "Save")
  saveAction: SaveSessionAction;

  // Triggered when user dismisses the modal (e.g., cancel, backdrop)
  closeAction: CloseModalAction;

  // Available only when mode === "edit"; shows delete affordance if provided
  deleteAction?: DeleteSessionAction;

  // Optional presets for quick duration selection, e.g., [15, 25, 45]
  durationPresetsMin?: number[];

  // Time display/parse behavior in the editor
  timeFormat?: "24h" | "12h";

  // Minimum selectable date in the date picker (ISO), e.g., "2025-01-01"
  minDate?: string;

  // Toggle notes field visibility if the app wants a minimal form
  allowNotes?: boolean;
}