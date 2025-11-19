interface MultiMetricFitnessDashboardProps {
  // Number of weeks to visualize (e.g., 8). The component expects contiguous recent weeks ending at the latest available data.
  timeRangeWeeks: number;

  // Weekly total minutes spent on strength training.
  // weekStartISO: Monday start of week in ISO 8601 date format (YYYY-MM-DD).
  strengthMinutesByWeek: Array<{
    weekStartISO: string;
    minutes: number; // non-negative integer
  }>;

  // Weekly total minutes spent on cardio.
  // weekStartISO: Monday start of week in ISO 8601 date format (YYYY-MM-DD).
  cardioMinutesByWeek: Array<{
    weekStartISO: string;
    minutes: number; // non-negative integer
  }>;

  // Workout frequency heatmap data by calendar day.
  // dateISO: ISO date (YYYY-MM-DD), count: number of workouts logged that day.
  workoutFrequencyByDay: Array<{
    dateISO: string;
    count: number; // 0 or more; used to compute heat intensity
  }>;

  // Muscle group distribution for the selected period (should sum to ~100).
  // Example groups: "legs", "back", "chest", "shoulders", "arms", "core", "full_body", "other".
  muscleGroupBreakdown: Array<{
    group:
      | "legs"
      | "back"
      | "chest"
      | "shoulders"
      | "arms"
      | "core"
      | "full_body"
      | "other"
      | string; // allow custom labels
    percent: number; // 0–100; fractions allowed
  }>;

  // Consistency score card: overall adherence and trend vs previous comparable period.
  consistency: {
    score: number; // 0–100; higher is more consistent
    trend: "up" | "down" | "flat"; // direction vs previous period of equal length
    delta?: number; // optional absolute change in points (e.g., +4.2)
  };

  // Action dispatched when a date is selected on the heatmap.
  // The component will populate dateISO with the clicked date (YYYY-MM-DD).
  onSelectDateAction: {
    type: "select_date";
    dateISO: string;
  };

  // Action dispatched when a muscle group slice is selected on the pie chart.
  // The component will populate group with the clicked group label.
  onSelectMuscleGroupAction: {
    type: "select_muscle_group";
    group: string;
  };

  // Action dispatched when the user opens a detailed weekly summary/insights view.
  onOpenSummaryAction: {
    type: "open_summary";
  };
}

interface WorkoutSummaryListProps {
  // Recent workouts to render.
  // Keep this list reasonably small (e.g., last 8 weeks) for quick scanning.
  // Example:
  // [
  //   {
  //     id: "w_2025_11_01_run_01",
  //     dateISO: "2025-11-01T07:32:00Z",
  //     type: "cardio",
  //     durationMin: 42,
  //     muscleGroups: ["legs", "core"],
  //     source: "apple_health"
  //   }
  // ]
  workouts: WorkoutSummary[];

  // How the list is grouped in the UI. Default: "week"
  // "week" groups by calendar week (Mon–Sun or locale-specific)
  // "day" shows per-day groupings for tighter granularity
  groupBy?: "week" | "day";

  // Currently highlighted/selected workout (if any).
  // When set, the corresponding item will be visually emphasized.
  selectedWorkoutId?: string;

  // Optional initial filtering applied by the component.
  // Use to focus the list (e.g., only "strength" or a specific muscle group).
  // Set muscleGroup to a canonical label you use elsewhere in the dashboard
  // (e.g., "back", "chest", "legs", "shoulders", "arms", "core", "full_body").
  filter?: {
    type?: "strength" | "cardio" | "mixed";
    muscleGroup?: string;
  };

  // Single action object for interaction.
  // The component will EMIT actions of these shapes when the user interacts:
  // - { type: "select_workout", payload: { id: string } }
  // - { type: "change_filter", payload: { type?: "strength" | "cardio" | "mixed"; muscleGroup?: string | null } }
  // - { type: "change_grouping", payload: { groupBy: "week" | "day" } }
  //
  // Pass any object with one of the allowed `type` values to indicate the action namespace/channel.
  // The component will populate the appropriate payload at runtime.
  // Example:
  // onAction: { type: "select_workout" }
  // When a user taps a row -> emits: { type: "select_workout", payload: { id: "w_2025_11_01_run_01" } }
  onAction: {
    type: "select_workout" | "change_filter" | "change_grouping";
  };

  // Optional configuration: limit of weeks considered when grouping by week.
  // Used for compact views. Default: 8
  maxWeeks?: number;

  // Optional: show an icon per workout based on `type` or `source`.
  // When true, the component may render small glyphs (e.g., heart/runner for cardio, dumbbell for strength).
  showTypeOrSourceIcon?: boolean;
}

// Minimal item shape for the list.
// Keep labels normalized to ensure consistent grouping/filtering.
interface WorkoutSummary {
  id: string; // Unique per workout
  dateISO: string; // e.g., "2025-11-01T07:32:00Z"
  type: "strength" | "cardio" | "mixed";
  durationMin: number; // Integer minutes, e.g., 45
  muscleGroups: string[]; // e.g., ["back", "biceps"] or ["full_body"]
  source: "apple_health" | "manual" | "other"; // Data provenance for badges/attribution
}

interface WorkoutDetailDrawerProps {
  // Core workout being displayed in the drawer
  workout: {
    id: string; // Stable unique id (e.g., "ah_2025-11-14_0730_zx12")
    dateISO: string; // ISO 8601 datetime (e.g., "2025-11-14T07:30:00Z")
    type: WorkoutType; // e.g., "strength" | "cardio"
    durationMin: number; // Total minutes (e.g., 45)
    calories?: number; // Optional total kcal (e.g., 420)
    heartRateAvg?: number; // Optional average BPM (e.g., 138)
    muscleGroups?: MuscleGroup[]; // e.g., ["chest","back","core"]
    notes?: string; // Freeform user notes (may be empty or undefined)
    source?: "apple_health" | "manual" | "imported"; // Origin of record; default "apple_health"
  };

  // Optional icon to visually hint the workout type (e.g., a dumbbell or heart icon)
  iconUrl?: string; // Absolute or app-relative URL

  // Action to close the drawer (UI-level action; no payload)
  closeAction: {
    type: "close_drawer";
  };

  // Action used when user saves/edits notes from within the drawer
  // The component will supply "text" at submit time; "workoutId" should match workout.id
  editNotesAction: {
    type: "edit_notes";
    payload: {
      workoutId: string; // e.g., same as workout.id
      text?: string; // New notes content entered by the user
    };
  };

  // Optional action to exclude this workout from aggregate stats and trends
  // Useful when marking a session as an outlier or test measurement
  excludeFromStatsAction?: {
    type: "exclude_from_stats";
    payload: {
      workoutId: string; // e.g., same as workout.id
    };
  };

  // Optional rendering/config preference for date/time localization
  timeZone?: string; // IANA TZ (e.g., "America/Los_Angeles"); if omitted, use system/default
}

/**
 * Union of supported workout types displayed in the dashboard.
 * Extend as needed if new categories are added.
 */
type WorkoutType =
  | "strength"
  | "cardio"
  | "hiit"
  | "yoga"
  | "pilates"
  | "mobility"
  | "other";

/**
 * Normalized muscle group taxonomy for strength-focused sessions.
 * Use broad groups for consistent aggregation across sources.
 */
type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "legs"
  | "glutes"
  | "core"
  | "full_body";

interface DataSourceStatusBannerProps {
  // Name of the data source shown in the banner. Default is "Apple Health".
  // Example: "Apple Health", "Google Fit"
  dataSourceName?: string;

  // Current connection/sync status for the data source.
  // - "connected": everything is healthy
  // - "disconnected": user has not linked the source
  // - "syncing": an in-progress sync is happening
  // - "error": a recent sync or permission check failed
  status: "connected" | "disconnected" | "syncing" | "error";

  // ISO 8601 timestamp for the last successful sync, if any.
  // Example: "2025-03-12T08:45:00Z"
  lastSyncedAtISO?: string;

  // Optional list of surfaced problems to display inline (errors or missing permissions).
  // Use for brief, user-facing messages and/or codes helpful for support.
  // Examples:
  // - [{ code: "auth_revoked", message: "Your Apple Health authorization was revoked." }]
  // - [{ code: "permission_missing:workouts", message: "Workout read permission is missing." }]
  problems?: Array<{ code: string; message?: string }>;

  // The primary action the banner should render as a button.
  // Only one action at a time to keep the component simple and focused.
  // - "connect": prompt user to link Apple Health
  // - "request_permissions": ask for specific missing permissions (e.g., ["workouts", "heart_rate"])
  // - "sync_now": trigger an on-demand sync
  // - "retry": retry the last failed operation
  // Examples:
  // { type: "connect" }
  // { type: "request_permissions", permissions: ["workouts", "heart_rate"] }
  // { type: "sync_now" }
  // { type: "retry" }
  primaryAction?: {
    type: "connect" | "request_permissions" | "sync_now" | "retry";
    permissions?: string[]; // Only for "request_permissions"
  };
}

interface TrendInsightsCalloutProps {
  // List of short, actionable insights derived from the user's recent fitness data.
  // Example:
  // [
  //   {
  //     id: "ins_001",
  //     title: "Strength minutes up 18%",
  //     body: "You logged 220 strength minutes vs 186 in the prior 2 weeks.",
  //     severity: "positive",
  //     metric: "strength_minutes",
  //     deltaPercent: 18
  //   },
  //   {
  //     id: "ins_002",
  //     title: "Cardio consistency dipped",
  //     body: "You missed 2 cardio days this week compared to your usual 1.",
  //     severity: "warning",
  //     metric: "cardio_minutes"
  //   }
  // ]
  insights: TrendInsight[];

  // When a user taps "Drill down" on an insight, the component will dispatch this action.
  // The component will append { insightId: string } to the action payload at dispatch time.
  // Example dispatch: { type: "drill_down", payload: { ...filter, insightId: "ins_001" } }
  drillDownAction?: {
    type: "drill_down";
    payload?: DrillDownFilter;
  };

  // When a user dismisses an insight, the component will dispatch this action.
  // The component will append { id: string } (the dismissed insight id) at dispatch time.
  // Example dispatch: { type: "dismiss_insight", id: "ins_001" }
  dismissAction?: {
    type: "dismiss_insight";
  };

  // When a user pins an insight (to keep it visible/important), the component will dispatch this action.
  // The component will append { id: string } (the pinned insight id) at dispatch time.
  // Example dispatch: { type: "pin_insight", id: "ins_001" }
  pinAction?: {
    type: "pin_insight";
  };

  // Optional heading for the callout block. Example: "Last 8 weeks trends"
  headerTitle?: string;

  // Optional label indicating the active time window. Example: "Last 8 weeks"
  timeWindowLabel?: string;

  // Maximum number of insights to show at once (remaining may be collapsed).
  // Default: 3
  maxVisible?: number;
}

type InsightSeverity = "info" | "positive" | "warning";

interface TrendInsight {
  id: string; // unique identifier for the insight
  title: string; // short headline, e.g., "Strength minutes up 18%"
  body: string; // one or two sentences giving context and the why/so-what
  severity: InsightSeverity; // visual treatment and priority signal

  // Optional: numeric change to highlight trend direction (positive/negative).
  // Example: 18 means +18% vs prior period, -7 means -7% vs prior period.
  deltaPercent?: number;

  // Optional: the metric this insight refers to. Use known keys when possible:
  // "strength_minutes" | "cardio_minutes" | "consistency_score" | "workout_frequency" | custom string
  metric?: string;

  // Optional: per-insight icon to convey type (e.g., a dumbbell or heart icon).
  // Example: "https://cdn.example.com/icons/dumbbell.svg"
  iconUrl?: string;
}

interface DrillDownFilter {
  // Example: "last_8_weeks", "last_4_weeks"
  timeframe?: string;

  // Narrow by workout type or focus area, e.g., "strength", "cardio", "mobility".
  workoutType?: string;

  // Optional muscle group focus, e.g., "legs", "back", "chest", "core".
  muscleGroup?: string;

  // Optional metric key if the drill-down should focus on a specific metric.
  // Example: "strength_minutes", "cardio_minutes", "consistency_score"
  metric?: string;
}