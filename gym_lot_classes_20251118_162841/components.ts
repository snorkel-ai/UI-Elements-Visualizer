interface ClassScheduleTimetableProps {
  // ISO date for the Monday (or locale-specific) start of the week. Example: "2025-03-03"
  weekStartDate: string;

  // Classes to render in the weekly timetable grid
  classes: ClassItem[];

  // Initial/active filters for the grid. Omit for "no filters"
  filters?: TimetableFilters;

  // Optional overlay of recommended classes (IDs must match classes[].id)
  // If omitted, component can derive from classes[].isRecommended when present
  recommendedClassIds?: string[];

  // Minutes per time slot row in the grid. Default: 30
  timeSlotIntervalMinutes?: number;

  // Single action object to be dispatched when a user selects a class tile
  // Example: { type: "select_class", payload: { classId: "spin_101" } }
  selectClassAction?: {
    type: "select_class";
    payload: { classId: string };
  };
}

// A single scheduled class occurrence on the timetable
interface ClassItem {
  // Unique identifier for this class instance (used for selection and overlays)
  id: string;

  // Short, human-readable title. Example: "Power Yoga"
  title: string;

  // ISO timestamps defining the class times. Example: "2025-03-03T18:00:00Z"
  start: string;
  end: string;

  // Room or area name. Example: "Studio A" or "Pool"
  location: string;

  // Primary goals/tags for alignment and filtering. Example: ["strength", "mobility"]
  goals: string[];

  // Intensity band for quick scanning and filtering
  intensity: "low" | "medium" | "high";

  // Instructor identifier (can map to profile elsewhere)
  instructorId: string;

  // Optional display name for quick rendering without a separate lookup
  instructorName?: string;

  // Optional image for the class or instructor avatar
  imageUrl?: string;

  // Whether this item is part of a recommended plan overlay
  isRecommended?: boolean;
}

// Optional filters to narrow the timetable view
interface TimetableFilters {
  // Days of week to include, where 0 = Sunday, 6 = Saturday. Example: [1,2,3,4,5] for weekdays
  days?: number[];

  // Daily time-of-day bounds (24h "HH:mm"). Example: { start: "06:00", end: "20:30" }
  timeRange?: {
    start: string; // "HH:mm"
    end: string;   // "HH:mm"
  };

  // Only show classes matching any of these goals. Example: ["cardio", "strength"]
  goals?: string[];

  // Restrict to a single intensity band
  intensity?: "low" | "medium" | "high";

  // Limit to a specific room/zone. Example: "Studio B"
  location?: string;
}

interface ClassDetailPopoverProps {
  // Unique identifier for the class (stable across timetable views)
  id: string; // e.g., "cls_7f3a9"

  // Display title of the class
  title: string; // e.g., "Power Yoga"

  // Start/end in ISO 8601 for reliable time handling
  schedule: {
    startISO: string; // e.g., "2025-11-21T18:00:00-05:00"
    endISO: string;   // e.g., "2025-11-21T19:00:00-05:00"
  };

  // Key details for quick scanning in the popover
  meta: {
    location: string;        // e.g., "Studio B" or "Downtown Gym — Room 2"
    instructorName: string;  // e.g., "Ariana Chen"
  };

  // Goal tags used for goal-alignment badges
  // Keep to a small set for consistency across the app
  goals: ("strength" | "cardio" | "mobility" | "balance" | "endurance" | "mindfulness")[];

  // Intensity and capacity grouped to drive badges/CTA state
  status: {
    intensity: "low" | "moderate" | "high"; // Display as a chip or color-coded tag
    capacity: "open" | "waitlist" | "full"; // Controls Add/Join Waitlist CTA enablement
  };

  // Short, scannable description (recommended <= 140 chars)
  description?: string; // e.g., "Flow-based vinyasa focusing on core stability and breath."

  // Declarative actions triggered by the popover UI
  actions: {
    // Primary CTA — add this class to the user’s weekly plan
    addToPlan: { type: "add_to_plan"; payload: { classId: string } };

    // Secondary CTA — bookmark for later (optional if app doesn’t support bookmarking)
    bookmark?: { type: "bookmark_class"; payload: { classId: string } };

    // Close/dismiss the popover
    close: { type: "close_popover" };
  };

  // Optional display preference for time rendering; falls back to locale if omitted
  timeDisplay?: "12h" | "24h";
}

interface AvailabilityBlock {
  // Day of week for this availability window
  // Use three-letter abbreviations: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun"
  day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

  // Start time in 24h "HH:mm" format, e.g., "06:30"
  start: string;

  // End time in 24h "HH:mm" format, e.g., "08:00"
  end: string;
}

type GoalTag =
  // Common fitness goals to align recommendations
  // Extendable by the host app if needed
  | "strength"
  | "cardio"
  | "mobility"
  | "endurance"
  | "flexibility"
  | "hiit";

interface GoalPreferencesPanelProps {
  // Unique identifier for this panel instance (used for actions/state linkage)
  id: string;

  // Short heading shown at the top of the panel, e.g., "Your Fitness Goals"
  title: string;

  // Selected goals that recommendations should prioritize
  // Example: ["strength", "cardio"]
  goalsSelected: GoalTag[];

  // Weekly availability windows when the user can attend classes
  // Example:
  // [
  //   { day: "Mon", start: "06:30", end: "08:00" },
  //   { day: "Wed", start: "18:00", end: "19:30" }
  // ]
  availabilityBlocks: AvailabilityBlock[];

  // Desired workout intensity
  // "low" for recovery/mobility, "medium" for balanced, "high" for vigorous sessions
  preferredIntensity: "low" | "medium" | "high";

  // Current experience level for appropriate class filtering and scaling
  experienceLevel: "beginner" | "intermediate" | "advanced";

  // Target number of classes per week the plan should schedule
  // Typical range: 1–7
  targetSessionsPerWeek: number;

  // Action dispatched when the user requests a generated plan
  // The payload references this panel's id; host can read current field values to compute recommendations
  onGeneratePlanAction: {
    type: "generate_plan";
    panelId: string; // should match the 'id' above
  };
}

interface RecommendedPlanSummaryProps {
  // Unique identifier for the generated plan (useful for confirming/saving)
  // Example: "plan_2025_wk48_user123"
  planId: string;

  // Human-readable name shown in the summary header
  // Example: "Strength + Mobility Focus"
  name: string;

  // ISO date (YYYY-MM-DD) representing the Monday (or local start) of the week
  // Example: "2025-11-17"
  weekStartDate: string;

  // Flattened list of all selected sessions in the week
  items: PlanItem[];

  // Total number of sessions included in the plan
  // Example: 5
  totalSessions: number;

  // Overall balance/fit score for the plan, 0-100 (higher is better balance across goals)
  // Example: 82
  balanceScore: number;

  // Any issues that need attention (time overlaps, capacity limits, travel gaps, etc.)
  conflicts: PlanConflict[];

  // Primary call-to-action to accept/lock in the plan
  // Use this to move forward to booking or saving the schedule
  // Example: { type: "confirm_plan", payload: { planId: "plan_2025_wk48_user123" } }
  onConfirmPlanAction: {
    type: "confirm_plan";
    payload: { planId: string };
  };
}

interface PlanItem {
  // Class identifier from the timetable/catalog
  // Example: "class_spin_7am_mon"
  classId: string;

  // Display title of the class
  // Example: "Morning Spin"
  title: string;

  // Day label for grouping; keep it simple and human-readable
  // Examples: "Mon", "Tue", "Wed"
  day: string;

  // 24h local start time
  // Example: "07:00"
  start: string;

  // 24h local end time
  // Example: "07:45"
  end: string;

  // Location or studio name
  // Example: "Studio B"
  location: string;

  // Goal tags used for balance calculation and quick glances
  // Examples: ["cardio", "endurance"] or ["strength", "mobility"]
  goals: string[];

  // Action to remove this session from the plan
  // Example: { type: "remove_item", payload: { classId: "class_spin_7am_mon" } }
  removeAction: {
    type: "remove_item";
    payload: { classId: string };
  };
}

interface PlanConflict {
  // Unique identifier for the conflict to assist resolution
  // Example: "conflict_overlap_tue_1830"
  conflictId: string;

  // Day where the conflict occurs
  // Example: "Tue"
  day: string;

  // Human-readable reason summary
  // Examples: "Overlapping sessions on Tue 18:30", "Insufficient travel time between classes"
  reason: string;

  // Optional more-specific detail (times, classes involved)
  // Example: "Spin 18:00-18:45 overlaps with Yoga 18:30-19:15"
  details?: string;

  // Action to resolve the conflict (could open a resolution flow)
  // Example: { type: "resolve_conflict", payload: { conflictId: "conflict_overlap_tue_1830" } }
  resolveAction: {
    type: "resolve_conflict";
    payload: { conflictId: string };
  };
}

interface FilterChipsBarProps {
  id: string; // Unique identifier for this filter bar instance (e.g., "main-filters")
  title: string; // Short label shown above/within the chip row (e.g., "Filters")

  // Current active filters driving the timetable
  activeGoals: string[]; // Example: ["strength", "cardio"]; should match your app's goal ids
  activeDays: DayKey[]; // Example: ["mon", "wed", "fri"]
  timeOfDay: TimeOfDay; // "morning" | "afternoon" | "evening" | "all"
  intensity: Intensity; // "all" | "low" | "med" | "high"
  location?: string | null; // Example: "Downtown Studio" or null for "any"

  // Single action object: dispatch a full filter update whenever the user changes any chip.
  // The UI will emit this action with a complete snapshot of selected filters.
  onFilterChangeAction: UpdateFiltersAction;
}

// Days used by the weekly schedule
type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

// Coarse time windows for browsing classes
type TimeOfDay = "morning" | "afternoon" | "evening" | "all";

// Overall intensity preference
type Intensity = "all" | "low" | "med" | "high";

// Emitted when any filter changes; payload carries the full current filter state.
// Example payload:
// {
//   activeGoals: ["strength", "mobility"],
//   activeDays: ["mon", "wed", "fri"],
//   timeOfDay: "morning",
//   intensity: "med",
//   location: "Downtown"
// }
interface UpdateFiltersAction {
  type: "update_filters";
  payload: {
    activeGoals: string[];
    activeDays: DayKey[];
    timeOfDay: TimeOfDay;
    intensity: Intensity;
    location?: string | null;
  };
}