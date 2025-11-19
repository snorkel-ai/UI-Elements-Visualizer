interface ChoreRotationDashboardProps {
  // Inclusive ISO date range for the visible week. Example: { startDate: "2025-03-03", endDate: "2025-03-09" }
  weekRange: { startDate: string; endDate: string };

  // List of people eligible for assignments in display order.
  // capacityMinutes is an optional weekly target used for fairness/load calculations.
  roommates: Roommate[];

  // Catalog of chores that can appear in the weekly matrix.
  // estimatedMinutes is used for load/fairness; frequency helps the UI convey rotation cadence.
  chores: Chore[];

  // Planned/approved/completed assignments for the current week matrix.
  // day uses a fixed 7-day union; status controls badge/visual state.
  weeklyAssignments: Assignment[];

  // High-level rules that guide rotation and validation (kept minimal for a concise dashboard).
  rotationRules: RotationRules;

  // Per-roommate fairness/load indicators for the current week.
  // score: 0 (unfair) to 1 (perfect balance); workloadMinutes sums estimatedMinutes of assigned chores.
  fairnessScores: FairnessScore[];

  // Upcoming highlights beyond the current week (e.g., next week items or mid-week rotations).
  // date should be ISO (YYYY-MM-DD).
  upcomingAssignments: UpcomingAssignment[];

  // Declarative action objects emitted by the component when users interact.
  // The component fills dynamic payload fields at runtime before dispatching.
  actions: {
    // Triggered by drag/drop or reassignment controls.
    // Example emitted payload: { assignmentId: "a123", toRoommateId: "r2" }
    reassign: { type: "reassign_assignment" };

    // Triggered by week navigation or auto-rotate button.
    // Example emitted payload: { direction: "next" }
    rotateWeek: { type: "rotate_week" };

    // Triggered when schedule is approved for the current visible week.
    // Example emitted payload: { weekStart: "2025-03-03" }
    approveSchedule: { type: "approve_schedule" };

    // Triggered to publish the schedule.
    // Example emitted payload: { channel: "in_app" }
    publishSchedule: { type: "publish_schedule" };
  };

  // Enables drag-and-drop reassignment in the matrix.
  allowDragAndDrop?: boolean;

  // Shows/hides the fairness/load indicator panel.
  showFairnessIndicator?: boolean;
}

/* Supporting types */

interface Roommate {
  id: string; // Stable identifier, e.g., "r1"
  name: string; // Display name, e.g., "Alex"
  avatarUrl?: string; // Optional profile image URL
  capacityMinutes?: number; // Weekly target minutes; used for load balance
}

interface Chore {
  id: string; // Stable identifier, e.g., "c1"
  name: string; // e.g., "Dishes"
  iconUrl?: string; // Optional icon (e.g., plate icon)
  estimatedMinutes: number; // Typical effort for one occurrence
  frequency: "daily" | "weekly" | "biweekly"; // Rotation cadence
}

type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

interface Assignment {
  id: string; // Unique assignment id for this week/day
  choreId: string;
  roommateId: string;
  day: DayOfWeek;
  status: "planned" | "approved" | "completed";
}

interface RotationRules {
  // Strategy determines how the system rotates chores by default.
  strategy: "round_robin" | "weighted" | "manual_lockstep";

  // Optional starting index for round-robin (0-based index into roommates array).
  roundRobinStartIndex?: number;

  // Weighted strategy: relative weight per roommate (higher weight => more chores).
  // Example: [{ roommateId: "r1", weight: 0.8 }, { roommateId: "r2", weight: 1.2 }]
  weights?: Array<{ roommateId: string; weight: number }>;

  // Caps to prevent overload; if omitted, no hard cap is enforced.
  maxMinutesPerRoommate?: number;

  // Optional guardrails: avoid assigning a specific chore to a roommate.
  // Example: [{ roommateId: "r3", choreId: "c2" }]
  avoidPairs?: Array<{ roommateId: string; choreId: string }>;
}

interface FairnessScore {
  roommateId: string;
  workloadMinutes: number; // Sum of estimatedMinutes for assigned chores in the week
  sharePercent: number; // 0–100, relative share of total workload
  score: number; // 0–1 fairness index (1 = perfectly balanced)
}

interface UpcomingAssignment {
  date: string; // ISO date (YYYY-MM-DD)
  choreId: string;
  roommateId: string;
  isRotationChange: boolean; // True if this differs from the current week pattern
}

interface ChoreMatrixProps {
  id: string; // Unique board id. Example: "apt-12-chore-board"
  weekOf: string; // Monday (or start) of the week in ISO date. Example: "2025-03-17"

  roommates: Roommate[]; 
  // Typically 4 roommates.
  // Example: [{ id: "r1", name: "Alex", avatarUrl: "/img/alex.png" }, ...]

  chores: Chore[];
  // Example: [{ id: "c1", name: "Dishes", points: 2, iconUrl: "/icons/dishes.svg" }, ...]

  assignments: ChoreAssignment[];
  // One record per roommate-chore for the current week.
  // Example:
  // [
  //   { roommateId: "r1", choreId: "c1", locked: false },
  //   { roommateId: "r2", choreId: "c2", locked: true, conflict: false },
  // ]

  fairnessScore?: number;
  // 0-100 load balance indicator for current week (higher = more fair). Example: 82

  rotationRuleSummary?: string;
  // Short description shown above the grid. Example: "Rotate clockwise weekly; max 5 points/person"

  onMatrixAction: ActionChannel;
  // Where UI interactions are dispatched (drag/drop, lock/unlock, undo/redo).
  // The component will emit actions through this channel. Expected action shapes include:
  // - { type: "reassign_cell", payload: { from: { roommateId: "r1", choreId: "c1" }, to: { roommateId: "r2", choreId: "c1" } } }
  // - { type: "toggle_lock", payload: { roommateId: "r1", choreId: "c2", locked: true } }
  // - { type: "undo_last" }
  // - { type: "redo_last" }
}

interface Roommate {
  id: string; // Example: "r1"
  name: string; // Example: "Alex"
  avatarUrl?: string; // Optional image used in row header. Example: "/img/alex.png"
}

interface Chore {
  id: string; // Example: "c1"
  name: string; // Example: "Dishes"
  points: number; // Effort weight for fairness. Example: 2
  iconUrl?: string; // Optional small icon for column header. Example: "/icons/dishes.svg"
}

interface ChoreAssignment {
  roommateId: string; // Must match a Roommate.id
  choreId: string; // Must match a Chore.id
  locked?: boolean; // True if this assignment is locked and cannot be moved
  conflict?: boolean; // True if violates a rule (e.g., over point limit or repeat assignment)
}

interface ActionChannel {
  type: "dispatch_actions_to";
  target: string; 
  // A channel or topic name the host app listens to. Example: "chore_matrix:apt-12"
  // The component will publish user intents to this channel using the action shapes listed above.
}

interface RotationRulesPanelProps {
  id: string; // Unique panel identifier (e.g., "rotation-rules-1")
  title: string; // Display title (e.g., "Rotation Rules")

  // Strategy controlling how chores cycle between roommates
  // - "round_robin": even turn-taking by order
  // - "weighted": uses weights/points to bias frequency (higher weight = more assignments)
  rotationStrategy: "round_robin" | "weighted";

  // Core constraints that impact fairness and repetition spacing
  constraints: {
    cooldownWeeks: number; // Minimum weeks before the same person repeats the same chore (e.g., 2)
    maxPointsPerWeek: number; // Cap on total chore points per person per week (e.g., 8)
  };

  // Current automation state for applying rotations each new week
  autoRotateEnabled: boolean; // true = will auto-assign next week when period starts

  // Optional exemptions that temporarily remove or limit people from rotation
  // Example: [{ roommateId: "alex", reason: "exams", chores: ["trash"], untilDateISO: "2025-03-01" }]
  exemptions?: ExemptionRule[];

  // Optional fairness indicator (0-100) summarizing load balance over recent weeks
  // Example: 86 means relatively even distribution
  fairnessScore?: number;

  // Single action entry point; UI will dispatch one of these when users interact
  onAction:
    | { type: "toggle_auto_rotate"; payload: { enabled: boolean } } // User flips the auto-rotate switch
    | { type: "edit_rules"; payload: { id: string } } // Opens rules editor for this panel
    | { type: "preview_next_rotation"; payload: { weeksAhead?: number } }; // Request preview for N weeks ahead (default 1)
}

interface ExemptionRule {
  roommateId: string; // Person identifier (e.g., "jordan")
  reason?: string; // Short note (e.g., "travel", "injury", "midterms")
  chores?: string[]; // If specified, applies only to these chores; otherwise all chores
  untilDateISO?: string; // YYYY-MM-DD; when exemption ends (inclusive)
}

interface FairnessScoreBarProps {
  // Title shown above the indicator list (e.g., "This Week's Load Balance")
  title: string;

  // Unit used to measure load; all numeric loads should align to this unit
  // Example: "points" (weighted system) or "hours" (time-based)
  unit: "points" | "hours";

  // One entry per roommate to render a fairness/load bar
  roommates: Array<{
    // Unique identifier for the roommate (e.g., "rm_alex")
    id: string;

    // Display name (e.g., "Alex")
    name: string;

    // Total load assigned for the current week, in the chosen unit
    // Example: 8 (hours) or 32 (points)
    currentLoad: number;

    // Typical or historical average load for this roommate, in the same unit
    // Example: 6 (hours) or 28 (points)
    averageLoad: number;

    // Fairness score from 0 to 100 (100 = perfectly balanced vs. history/peers)
    // Used to color or annotate the bar
    fairnessScore: number; // 0–100

    // Optional avatar/icon to show beside the roommate
    // Example: "https://cdn.example.com/avatars/alex.png"
    avatarUrl?: string;

    // Optional per-roommate breakdown used for hover/tooltips
    // Example: [{ choreId: "trash", choreName: "Take out trash", load: 1.5 }]
    breakdown?: Array<{
      choreId: string;
      choreName: string;
      load: number; // in the same unit as `unit`
    }>;

    // Single interaction: trigger when selecting a roommate bar for details
    // The component can invoke/emit this action; payload is fully specified here
    // Example: { type: "select_roommate", roommateId: "rm_alex" }
    action?: { type: "select_roommate"; roommateId: string };
  }>;

  // Optional sorting control for how bars are arranged
  // "imbalance" can be interpreted as (currentLoad - averageLoad) descending
  // Default (if omitted): "name"
  sortBy?: "name" | "imbalance" | "fairnessScore";

  // Optional threshold to visually flag low fairness (e.g., red indicators)
  // Example: 60 means scores below 60 are highlighted
  highlightThreshold?: number; // Default: 60
}

interface UpcomingAssignmentsProps {
  // Unique identifier for this rotation context (e.g., board or schedule id)
  // Example: "household-42-week-2025-11-24"
  id: string;

  // Human-readable heading for the list
  // Example: "Upcoming Assignments (Next Week)"
  title: string;

  // Next week range in ISO-8601 date strings
  // Example: { start: "2025-11-24", end: "2025-11-30" }
  nextWeekRange: { start: string; end: string };

  // Proposed assignments for the next rotation window
  // Keep this list concise; UI may show top items and allow drill-in
  proposedAssignments: AssignmentItem[];

  // Detected conflicts that may require attention before approval
  // Example conflict: two chores assigned to the same person at overlapping times
  conflicts?: ConflictItem[];

  // High-level approval summary to inform the call-to-action state
  // Example: { pendingCount: 3, approvedCount: 5 }
  approvals?: ApprovalSummary;

  // Optional visual identifier for the board or week (icon, badge, or banner)
  // Example: "https://cdn.example.com/icons/broom.png"
  imageUrl?: string;

  // Single action object capturing the intended interaction channel
  // The rendering layer will dispatch with appropriate payloads
  // Examples:
  // - { type: "approve_all" }
  // - { type: "approve_item", payload: { assignmentId: "a7" } }
  // - { type: "request_swap", payload: { assignmentId: "a7", fromRoommateId: "r1", toRoommateId: "r2" } }
  onAction: UpcomingAssignmentsAction;

  // Optional: show only items that have changes or conflicts to focus attention
  // Default: false (show all upcoming)
  showConflictsOnly?: boolean;

  // Optional: maximum number of items to render in a compact view
  // Example: 6
  maxVisible?: number;
}

interface AssignmentItem {
  // Stable id for the assignment proposal
  // Example: "a7"
  id: string;

  // Chore name and optional brief description
  // Examples: name: "Kitchen Deep Clean", description: "Oven + fridge + floors"
  name: string;
  description?: string;

  // Who is proposed to take this chore next week
  // Example: { id: "r2", name: "Alex" }
  assigneeNext: PersonRef;

  // Who has it in the current week (to indicate changes)
  // Example: { id: "r1", name: "Sam" }
  assigneeCurrent?: PersonRef;

  // Quick change indicator relative to current week
  // no_change: same person; swapped: different person; new: newly introduced chore
  change: "no_change" | "swapped" | "new";

  // Current approval status for this item
  // pending: not yet confirmed; approved: confirmed by group; rejected: requires re-plan
  approveStatus: "pending" | "approved" | "rejected";

  // Optional small icon per chore (if different from component-level image)
  // Example: "https://cdn.example.com/chore-icons/dishes.svg"
  iconUrl?: string;
}

interface ConflictItem {
  // Unique id for the conflict
  // Example: "c12"
  id: string;

  // Short machine-readable type and human-readable message
  // Examples: type: "double_booked", message: "Alex has two chores on Tuesday"
  type: "double_booked" | "capacity_exceeded" | "preference_violation" | "missing_approval" | "other";
  message: string;

  // Assignments involved in this conflict
  relatedAssignmentIds: string[];
}

interface ApprovalSummary {
  // Aggregate counts for quick status overview
  pendingCount: number;
  approvedCount: number;
  rejectedCount?: number;
}

interface UpcomingAssignmentsAction {
  // Interaction types supported by this component
  // approve_all: confirm all proposed assignments
  // approve_item: confirm a single assignment
  // request_swap: propose a swap between roommates for a specific assignment
  type: "approve_all" | "approve_item" | "request_swap";

  // Context needed for the chosen action
  // approve_all: no payload required
  // approve_item: { assignmentId }
  // request_swap: { assignmentId, fromRoommateId, toRoommateId }
  payload?: {
    assignmentId?: string;
    fromRoommateId?: string;
    toRoommateId?: string;
  };
}

interface PersonRef {
  // Roommate id and display name
  // Example: { id: "r2", name: "Alex" }
  id: string;
  name: string;
}