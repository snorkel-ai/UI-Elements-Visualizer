interface ClassPerformanceDashboardProps {
  classes: ClassItem[]; 
  // List of classes to display in the sidebar/selector.
  // Example: [{ id: "math101", name: "Math 101", currentGrade: 92.1, creditHours: 3 }]

  selectedClassId: string | null; 
  // Currently focused class. Null means "no class selected" state.

  assignments: AssignmentItem[]; 
  // Assignments for the selected class only.
  // Include current score if graded, or plannedScore for what-if projections.

  currentGPA: number; 
  // Current cumulative GPA (0.0 - 4.0 scale). Example: 3.42

  targetGPA: number; 
  // User’s desired GPA target for projection tools. Example: 3.70

  creditInfo: CreditInfo; 
  // Credit context used for GPA projection math (attempted/completed/quality points).

  gradingScheme?: "points" | "percentage" | "weighted_category"; 
  // How the selected class aggregates grades.
  // - "points": raw points earned / points possible
  // - "percentage": per-assignment percentage
  // - "weighted_category": category weights (e.g., Exams 50%, HW 30%, Labs 20%)

  assignmentView?: AssignmentView; 
  // Optional current table view state (sort/filter) for the assignment table.

  action?: DashboardAction; 
  // The latest user intent to be processed by the component.
  // Only one action should be sent at a time; omit or set to undefined when idle.
}

/* =========================
   Supporting Types
   ========================= */

interface ClassItem {
  id: string;
  name: string;
  currentGrade?: number; // 0-100 scale; omit if not yet computable
  creditHours?: number;  // Example: 3
}

interface AssignmentItem {
  id: string;
  title: string;
  category: string; // e.g., "Homework", "Exam", "Project"
  weight: number;   // Relative weight in [0, 1] if weighted; for points scheme, set to 0 or omit
  dueDate: string;  // ISO date string, e.g., "2025-03-15"
  status: "graded" | "submitted" | "missing" | "planned";
  score?: number;         // Earned percentage (0-100) or points (see scheme)
  plannedScore?: number;  // What-if percentage (0-100) or points (see scheme)
  pointsPossible?: number; // Required when using "points" scheme to compute percentages
}

interface CreditInfo {
  totalCreditsAttempted: number; // All attempted credits contributing to GPA
  totalCreditsCompleted: number; // Completed credits
  qualityPointsEarned?: number;  // Sum(grade points * credit hours); used to compute current GPA
  currentTermCredits?: number;   // Optional helper for projections (credits remaining this term)
}

interface AssignmentFilter {
  status?: Array<"graded" | "submitted" | "missing" | "planned">;
  categories?: string[];          // Filter by category names, e.g., ["Exam", "Homework"]
  showOnlyRemaining?: boolean;    // True = exclude graded items from table
  dueBefore?: string;             // ISO date string upper bound
  dueAfter?: string;              // ISO date string lower bound
}

interface AssignmentView {
  sortBy?: "dueDate" | "weight" | "status" | "title";
  sortDir?: "asc" | "desc";
  filter?: AssignmentFilter;
}

/* =========================
   Action Union
   ========================= */

type DashboardAction =
  | SelectClassAction
  | AdjustWhatIfAction
  | SetTargetGPAAction
  | SavePlannedScoresAction
  | SetAssignmentViewAction;

interface SelectClassAction {
  type: "select_class";
  classId: string; // e.g., "math101"
}

interface AdjustWhatIfAction {
  type: "adjust_what_if";
  assignmentId: string;
  plannedScore: number; // 0-100 for percentage scheme; raw points for points scheme
}

interface SetTargetGPAAction {
  type: "set_target_gpa";
  value: number; // 0.0 - 4.0 scale
}

interface SavePlannedScoresAction {
  type: "save_planned_scores";
  classId: string; 
  planned: Array<{ assignmentId: string; plannedScore: number }>;
  // Persist current what-if entries for a class.
}

interface SetAssignmentViewAction {
  type: "set_assignment_view";
  view: AssignmentView; // Update sort/filter state of the assignment table
}

interface ClassGradeSummaryProps {
  // Unique identifier for the class (used for actions and state management)
  // Example: "MATH101-FALL2025-SEC-A"
  classId: string;

  // Display name for the class
  // Example: "Calculus I"
  className: string;

  // Current overall grade as a percentage (0–100). Round as needed in UI.
  // Example: 92.5 means 92.5%
  currentGradePct: number;

  // Weighted category breakdown for the class.
  // Each item represents a grading category (e.g., Exams, Homework) with its weight and current earned percentage.
  categoryBreakdown: GradeCategoryItem[];

  // Portion of the course grade not yet accounted for by categories with recorded scores (0–100).
  // Typically equals 100 - sum(category.weightPct actually realized by scored work).
  // Used to power "what-if" projections for remaining assignments.
  remainingWeightPct: number;

  // Optional section/instructor label for context in compact views.
  // Example: "Section A · Dr. Ramirez" or "MATH 101 · Sec A"
  sectionLabel?: string;

  // Optional icon for the class (subject icon or course image).
  // Example: "https://cdn.example.com/icons/math.svg"
  iconUrl?: string;

  // Primary interaction: mark this class as active in the dashboard (e.g., to expand details).
  // Triggered when the card is clicked/tapped.
  setActiveAction: { type: "set_active_class"; payload: { classId: string } };

  // Optional: whether the card should render in expanded mode initially to show assignments.
  // Default: false
  defaultExpanded?: boolean;

  // Optional: show a small projected GPA indicator/gauge on the card.
  // Default: true
  showProjectedGpaIndicator?: boolean;
}

/**
 * Category item representing a grading bucket with weight and current performance.
 * - weightPct is the syllabus weight for the category (0–100).
 * - earnedPct is the current score within the category (0–100). If no graded items yet, omit or set undefined.
 *
 * Examples:
 * { category: "Exams", weightPct: 50, earnedPct: 88 }
 * { category: "Homework", weightPct: 30, earnedPct: 95 }
 * { category: "Projects", weightPct: 20 } // no grades yet
 */
interface GradeCategoryItem {
  category: string;
  weightPct: number;
  earnedPct?: number;
}

interface AssignmentTableProps {
  // Course this table belongs to
  courseId: string; // e.g., "math-101-fall-2025"
  courseName: string; // e.g., "Calculus I"

  // Tabular data for assignments
  rows: AssignmentRow[]; // See AssignmentRow for required fields

  // Optional initial sort configuration (defaults may be set by the host)
  sort?: {
    key: AssignmentSortKey; // e.g., "dueDate"
    direction: "asc" | "desc"; // e.g., "asc"
  };

  // Optional initial filters applied to the table
  filters?: AssignmentFilters;

  // Whether planned scores can be edited inline for pending items
  allowPlannedEdits?: boolean; // Default: true

  // Optional date display hint (format or locale tag)
  dateFormat?: string; // e.g., "YYYY-MM-DD" or "en-US"

  // Single action object to indicate where user interactions should be dispatched
  // The UI will emit events using this channel with these subtypes:
  // - { type: "edit_planned_score", payload: { assignmentId: string; planned: number } }
  // - { type: "mark_submitted", payload: { assignmentId: string; earned?: number } }
  // - { type: "sort", payload: { key: AssignmentSortKey; direction: "asc" | "desc" } }
  // - { type: "filter", payload: AssignmentFilters }
  // - { type: "row_select", payload: { assignmentId: string } }
  interaction: AssignmentTableInteraction;
}

// A single assignment row in the table
interface AssignmentRow {
  id: string; // Unique per assignment, e.g., "asg-12"
  title: string; // e.g., "Midterm Exam"
  category: string; // e.g., "Exam", "Homework", "Project"
  weightPct: number; // Percentage weight toward course grade, e.g., 20 for 20%
  dueDate: string; // ISO 8601 date string, e.g., "2025-10-21"
  status: AssignmentStatus; // "planned" | "submitted" | "missed"

  // Score information:
  // - For submitted: set earned and possible
  // - For planned: set planned and possible
  // - For missed: set possible; earned may be 0 or undefined per policy
  score: {
    possible: number; // e.g., 100
    earned?: number; // e.g., 92 (submitted)
    planned?: number; // e.g., 85 (planned estimate for "what-if")
  };

  // Optional icon or thumbnail representing the assignment type/category
  iconUrl?: string; // e.g., "https://cdn.example.com/icons/exam.png"
}

// Sortable columns
type AssignmentSortKey =
  | "title"
  | "category"
  | "weightPct"
  | "dueDate"
  | "status"
  | "score"; // "score" sorts by earned/planned over possible

// Filters that can be applied to the table
interface AssignmentFilters {
  status?: AssignmentStatus[]; // e.g., ["planned", "submitted"]
  category?: string[]; // e.g., ["Homework", "Exam"]
}

type AssignmentStatus = "planned" | "submitted" | "missed";

// Single action object indicating the interaction channel for this table
interface AssignmentTableInteraction {
  type: "assignment_table_interaction_channel";
  tableId: string; // Correlates events from this table instance, e.g., "calc1-asg-table"
  // Note: The UI will dispatch concrete events (see comments in AssignmentTableProps)
}

interface ProjectedGPAGaugeProps {
  id: string; // Unique identifier for this gauge instance (e.g., "gpa-gauge-fall-2025")
  title: string; // Display title (e.g., "Projected GPA")

  currentGPA: number; // Current cumulative GPA on a 0–4.0 scale (e.g., 3.28)
  projectedGPA: number; // What-if result after planned/slider changes (e.g., 3.45)
  targetGPA: number; // User’s target GPA to compare against (e.g., 3.60). The UI may render a stepper/input to adjust this.

  creditsCompleted: number; // Total earned credits contributing to currentGPA (e.g., 72)
  creditsInProgress: number; // Credits currently in progress counted in projection (e.g., 15)

  onAdjustTargetAction: {
    // Dispatched when the user adjusts the target GPA via the gauge controls
    type: "adjust_target_gpa";
    payload: {
      gaugeId: string; // Should match `id`
      targetGPA: number; // New target GPA value (0–4.0 typical)
    };
  };
}

interface WhatIfScoreSlidersProps {
  id: string; // Unique ID for this slider group instance
  title: string; // e.g., "What-if Scores" or "Plan Your Remaining Scores"
  scope: "class" | "all"; // "class" = sliders for a single class, "all" = across all classes

  // Sliders to simulate future/remaining assessments
  items: WhatIfSliderItem[]; 
  // Example:
  // [
  //   { id: "hw3", label: "Homework 3", minScore: 0, maxScore: 100, value: 88, weightPct: 10 },
  //   { id: "final", label: "Final Exam", minScore: 0, maxScore: 100, value: 92, weightPct: 30 }
  // ]

  // Optional preset buttons for quickly setting values (e.g., "A" applies 90% to all)
  presetButtons?: WhatIfPresetButton[];
  // Example:
  // [
  //   { key: "A", label: "Aim for A (90%)", value: 90 },
  //   { key: "B", label: "Aim for B (80%)", value: 80 }
  // ]

  // Single action object template used for all interactions (component fills dynamic fields)
  // Supported types:
  // - "adjust_item": when a slider changes (provide itemId, value)
  // - "reset_all": reset all sliders to actual/current values
  // - "apply_preset": apply a preset to all items (provide presetKey)
  // - "undo": undo the last change
  onAction: {
    type: "adjust_item" | "reset_all" | "apply_preset" | "undo";
    itemId?: string;     // required when type = "adjust_item"
    value?: number;      // required when type = "adjust_item"
    presetKey?: string;  // required when type = "apply_preset"
    // Note: For "reset_all" and "undo" no additional fields are needed.
  };

  // Optional display/configuration
  showWeights?: boolean;    // Default: true. Show each item's weight percentage.
  decimalPlaces?: number;   // Default: 0. Number of decimals for slider values (e.g., 1 for GPA-style grading).
}

interface WhatIfSliderItem {
  id: string; // Unique item/assessment ID
  label: string; // e.g., "Midterm", "Project 2"
  minScore: number; // e.g., 0
  maxScore: number; // e.g., 100
  value: number; // current planned score shown on the slider
  weightPct: number; // contribution to class grade, e.g., 25 for 25%
  // Note: Due dates or categories can be implied by label; only essentials included here.
}

interface WhatIfPresetButton {
  key: string; // unique short key, e.g., "A" | "B" | "C" | "AVG"
  label: string; // button text, e.g., "Aim for A (90%)"
  value: number; // score to apply to all items, e.g., 90
}