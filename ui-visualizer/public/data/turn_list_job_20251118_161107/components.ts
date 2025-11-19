interface JobPipelineBoardProps {
  // Columns of the board in display order
  // Example: [{ id: "lead", name: "Lead", order: 1 }, { id: "applied", name: "Applied", order: 2 }]
  stages: {
    id: string;    // Stable key, used to map opportunities to a stage
    name: string;  // Display label for the column
    order: number; // Lower number -> appears earlier
  }[];

  // Cards representing job opportunities
  // Keep only essentials for display
  // Example item:
  // {
  //   id: "opp_123",
  //   stageId: "applied",
  //   title: "Frontend Engineer",
  //   company: "Acme Corp",
  //   lastActivityAt: "2025-11-18T10:15:00Z",
  //   priority: "high",
  //   tags: ["React", "Remote"],
  //   companyLogoUrl: "https://logo.clearbit.com/acme.com",
  //   noteSnippet: "Sent follow-up email; recruiter replied."
  // }
  opportunities: {
    id: string;
    stageId: string; // Must match a stages[].id
    title: string;   // Role title shown on the card
    company: string; // Company name
    lastActivityAt: string; // ISO timestamp for recency indicators
    priority: "low" | "medium" | "high"; // Used for simple badge/sort
    tags?: string[]; // Optional quick filters/badges
    companyLogoUrl?: string; // Optional small image shown on card
    noteSnippet?: string; // Optional single-line recent note
  }[];

  // Compact data for the funnel chart (conversion per stage)
  // Example: [{ stageId: "lead", count: 25, conversion: 1.0 }, { stageId: "applied", count: 12, conversion: 0.48 }]
  funnelData?: {
    stageId: string;     // Must match a stages[].id
    count: number;       // Number of opportunities in/through this stage
    conversion?: number; // 0..1 ratio to visualize drop-off (optional if unknown)
  }[];

  // Basic filters applied to the board
  // Example: { search: "frontend", tag: "Remote", priority: "high" }
  filters?: {
    search?: string;                      // Free-text match against title/company
    tag?: string;                         // Single tag filter for simplicity
    priority?: "low" | "medium" | "high"; // Optional priority filter
  };

  // Single action object representing the primary interaction: moving a card between stages
  // Consumers can listen for this action emission and handle persistence/rules.
  // Example:
  // {
  //   type: "move_card",
  //   payload: { srcStageId: "lead", dstStageId: "applied", opportunityId: "opp_123" }
  // }
  moveCardAction?: {
    type: "move_card";
    payload: {
      srcStageId: string;
      dstStageId: string;
      opportunityId: string;
    };
  };

  // Optional configuration
  // - showFunnel: toggle compact funnel visualization above the board (default true)
  // - initialSort: how cards are sorted within a column
  showFunnel?: boolean; // Default: true
  initialSort?: "priority" | "recent"; // "priority" sorts high->low; "recent" uses lastActivityAt (Default: "recent")
}

interface StageColumnProps {
  // Stage metadata for this column in the pipeline
  stage: {
    id: string;           // Unique stage ID, e.g., "applied"
    name: string;         // Display label, e.g., "Applied"
    order: number;        // Sort order in the board, lower renders earlier
    iconUrl?: string;     // Optional stage icon (e.g., briefcase icon)
  };

  // Ordered list of opportunity IDs that belong to this stage
  // The rendering layer can map these IDs to card data from a shared store
  opportunityIds: string[];

  // Display count for the header. If omitted, use opportunityIds.length
  count?: number;

  // Allows dropping cards into this column. Default: true
  isDroppable?: boolean;

  // Action describing a drop (drag-and-drop move) into this stage.
  // toStageId will typically be stage.id of this column.
  // Example:
  // {
  //   type: "move_opportunity",
  //   payload: { opportunityId: "opp_123", fromStageId: "phone_screen", toStageId: "onsite" }
  // }
  dropAction: {
    type: "move_opportunity";
    payload: {
      opportunityId: string;
      fromStageId: string;
      toStageId: string;
    };
  };

  // Optional action for adding a new opportunity within this stage (e.g., "+" button in header)
  // Example:
  // { type: "add_opportunity", payload: { stageId: "applied" } }
  addAction?: {
    type: "add_opportunity";
    payload: {
      stageId: string;
    };
  };

  // If true, show an affordance (like a "+" button) to trigger addAction. Default: false
  showAddButton?: boolean;
}

interface OpportunityCardProps {
  id: string; // Unique opportunity ID, e.g., "opp_12345"
  title: string; // Job title, e.g., "Senior Frontend Engineer"
  company: string; // Company name, e.g., "Acme Corp"

  priority: "low" | "medium" | "high"; // Priority indicator for sorting/highlighting

  nextStep?: string; // Short next action, e.g., "Email recruiter to confirm interview time" (<= 120 chars)
  lastActivityAt?: string; // ISO 8601 timestamp of last touch, e.g., "2025-01-12T15:30:00Z"

  companyLogoUrl?: string; // Optional square logo URL for the company, e.g., "https://logo.clearbit.com/acme.com"

  onOpenDetailsAction: {
    type: "open_opportunity_details";
    opportunityId: string; // Should match `id`
  }; // Primary interaction: open full details panel/drawer
}

interface OpportunityDetailsPanelProps {
  // Full data for the selected opportunity. Drives all content in the panel.
  opportunity: {
    id: string; // Unique opportunity id (e.g., "opp_123")
    title: string; // Job title (e.g., "Senior Frontend Engineer")
    company: string; // Company name (e.g., "Acme Inc.")
    roleType?: "full_time" | "part_time" | "contract" | "internship" | string; // Optional, free-form fallback allowed
    salaryRange?: {
      min?: number; // e.g., 130000
      max?: number; // e.g., 160000
      currency?: string; // e.g., "USD"
      period?: "year" | "month" | "hour"; // Interprets min/max
    };
    location?: string; // e.g., "Remote (US)" or "New York, NY"
    stageId: string; // Current pipeline stage id (must map to stageOptions[].id if provided)
    links?: {
      jobPost?: string; // URL to the job posting
      resume?: string; // URL to the resume used for this application
      company?: string; // URL to company site or careers page
    };
    contacts?: Array<{
      name: string; // e.g., "Jane Doe"
      role?: string; // e.g., "Recruiter"
      email?: string; // e.g., "jane@acme.com"
    }>;
  };

  // Chronological activity for this opportunity (displayed in the timeline section).
  // Use ISO 8601 strings for dates (e.g., "2025-03-01T10:30:00Z").
  timelineEvents: Array<{
    type: string; // e.g., "email_sent" | "screening_call" | "onsite"
    date: string; // ISO date string
    label: string; // Human-readable label (e.g., "Sent follow-up email")
  }>;

  // Embedded notes thread shown in the panel.
  notes: Array<{
    id: string; // Unique note id
    author: string; // e.g., "You" or "Jane D."
    text: string; // Note body
    createdAt: string; // ISO date string
  }>;

  // Single high-level action descriptor used by the panel’s primary interaction
  // (e.g., a main CTA button or commit action). Choose one at a time based on context.
  // Examples:
  // - Change stage: { type: "change_stage", payload: { opportunityId: "opp_123", toStageId: "interview" } }
  // - Archive: { type: "archive_opportunity", payload: { opportunityId: "opp_123" } }
  // - Add timeline event: { type: "add_timeline_event", payload: { opportunityId: "opp_123", event: { type: "email_sent", date: "2025-03-01T10:30:00Z", label: "Sent intro email" } } }
  // - Update a field: { type: "update_field", payload: { opportunityId: "opp_123", field: "salaryRange", value: { min: 135000, max: 165000, currency: "USD", period: "year" } } }
  onPrimaryAction:
    | {
        type: "change_stage";
        payload: { opportunityId: string; toStageId: string };
      }
    | {
        type: "archive_opportunity";
        payload: { opportunityId: string };
      }
    | {
        type: "add_timeline_event";
        payload: {
          opportunityId: string;
          event: { type: string; date: string; label: string };
        };
      }
    | {
        type: "update_field";
        payload: { opportunityId: string; field: string; value: unknown };
      };

  // Optional list of available pipeline stages for display (names/colors for badges, etc.).
  stageOptions?: Array<{
    id: string; // e.g., "sourced" | "applied" | "screen" | "interview" | "offer" | "accepted"
    name: string; // e.g., "Interview"
    color?: string; // Optional hex or token (e.g., "#5B8DEF" or "primary.500")
  }>;

  // Optional company logo or icon to show near the header.
  companyLogoUrl?: string; // e.g., "https://logo.clearbit.com/acme.com"
}

interface NotesThreadProps {
  // Opportunity context
  opportunityId: string; // Unique ID for the job opportunity (e.g., "opp_1234")
  opportunityTitle: string; // Display title (e.g., "Frontend Engineer — Acme Corp")

  // Primary data
  notes: NoteItem[]; // Ordered newest->oldest or by pinned-first (see showPinnedFirst)
  canAdd: boolean; // If false, composer is hidden/disabled

  // Single action channel for all interactions
  // The component will emit note events via your app's action system using this context.
  // Emitted actions (examples):
  // - { type: "add_note", payload: { opportunityId, text } }
  // - { type: "pin_note", payload: { opportunityId, noteId, pinned: true } }
  // - { type: "delete_note", payload: { opportunityId, noteId } }
  // - { type: "edit_note", payload: { opportunityId, noteId, text } }
  onAction: { type: "notes_thread"; opportunityId: string };

  // Optional configuration
  showPinnedFirst?: boolean; // Default: true. If true, pinned notes appear above others.
  maxCharactersPerNote?: number; // Default: 2000. Composer hard limit.
}

interface NoteItem {
  id: string; // Stable note ID (e.g., "note_987")
  authorName: string; // Display name (e.g., "Priya M.")
  text: string; // Markdown/plaintext body
  createdAtISO: string; // ISO-8601 timestamp (e.g., "2025-01-14T09:32:00Z")
  pinned: boolean; // Whether note is pinned to top
  authorAvatarUrl?: string; // Optional 32–64px avatar for author
}

interface StageFunnelChartProps {
  // Ordered list of stages in the job search pipeline
  // Example: [{ id: "outreach", name: "Outreach", order: 1 }, { id: "interview", name: "Interview", order: 2 }]
  stages: Stage[];

  // Counts of opportunities at each stage for the selected time range
  // Only include stages that have data if includeZeroCountStages is false
  // Example: [{ stageId: "outreach", count: 23 }, { stageId: "interview", count: 7 }]
  countsByStage: StageCount[];

  // Optional per-stage conversion rate (0-1). If omitted, the chart may derive conversion from counts where possible.
  // Example: [{ stageId: "interview", rate: 0.35 }, { stageId: "offer", rate: 0.14 }]
  conversionByStage?: StageConversion[];

  // Current time window applied to the data (ISO 8601 strings)
  // Example: { from: "2025-01-01", to: "2025-01-31" }
  timeRange?: TimeRange;

  // Optional preset time ranges for quick selection in the chart control
  // Example: [{ id: "last_7d", label: "Last 7 days", timeRange: { from: "...", to: "..." } }]
  timeRangeOptions?: PresetTimeRange[];

  // How values are displayed on the chart
  valueDisplay: "count" | "percent" | "both";

  // Funnel layout orientation
  orientation?: "vertical" | "horizontal";

  // Show per-stage conversion labels (e.g., 35% from Outreach -> Interview)
  showConversionLabels?: boolean;

  // If true, stages with zero count still appear to preserve the full pipeline
  includeZeroCountStages?: boolean;

  // Action dispatched when a stage segment is clicked to filter the board by that stage
  // The component will populate stageId at runtime
  // Example at runtime: { type: "filter_by_stage", stageId: "interview" }
  stageClickAction?: FilterByStageAction;

  // Action dispatched when the time range is changed from the chart controls
  // The component will populate timeRange at runtime
  // Example at runtime: { type: "set_time_range", timeRange: { from: "...", to: "..." } }
  timeRangeChangeAction?: SetTimeRangeAction;
}

interface Stage {
  id: string; // stable key (e.g., "outreach")
  name: string; // display label (e.g., "Outreach")
  order: number; // ascending order in the funnel (1 = earliest)
  iconUrl?: string; // optional icon to show next to stage name
}

interface StageCount {
  stageId: string; // must match a Stage.id
  count: number; // non-negative integer
}

interface StageConversion {
  stageId: string; // the destination stage the rate applies to
  rate: number; // 0 to 1 (e.g., 0.35 for 35%)
}

interface TimeRange {
  from: string; // ISO 8601 date or datetime (inclusive)
  to: string; // ISO 8601 date or datetime (inclusive)
}

interface PresetTimeRange {
  id: string; // unique key (e.g., "last_30d")
  label: string; // user-facing label (e.g., "Last 30 days")
  timeRange: TimeRange;
}

interface FilterByStageAction {
  type: "filter_by_stage";
  stageId: string; // filled by the component when a stage is clicked
}

interface SetTimeRangeAction {
  type: "set_time_range";
  timeRange: TimeRange; // filled by the component when time range changes
}