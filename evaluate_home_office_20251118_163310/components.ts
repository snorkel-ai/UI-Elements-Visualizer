interface ErgonomicsChecklistDashboardProps {
  // Short, human-readable title for the dashboard (used as a heading and for accessibility)
  // Example: "Home Office Ergonomics Checklist"
  title: string;

  // Primary checklist items displayed with completion toggles and impact indicators
  checklistItems: ChecklistItem[];

  // Card summarizing posture guidance and its expected effect on risk
  postureRecommendation: PostureRecommendation;

  // Card with current vs. recommended desk height and step-by-step adjustments
  deskHeightRecommendation: DeskHeightRecommendation;

  // Overall current risk level derived from assessment
  // Drives color/status of the risk indicator
  riskLevel: "low" | "moderate" | "high";

  // Before/after overall ergonomic scores (e.g., 0–100 scale)
  // "after" typically reflects expected score if recommendations are applied
  scores: BeforeAfterScores;

  // Action dispatched when the user chooses to apply all recommendations
  // Example: { type: "apply_recommendations" }
  applyRecommendationsAction: {
    type: "apply_recommendations";
  };

  // Optional toggles for showing auxiliary UI elements
  displayOptions?: {
    // Show a mini legend explaining risk colors and impact badges
    showRiskLegend?: boolean;
    // Show an overall checklist completion progress bar
    showCompletionProgress?: boolean;
  };

  // Optional links for deeper guidance or references in the UI
  infoLinks?: {
    postureGuideUrl?: string; // Detailed posture guide
    deskHeightGuideUrl?: string; // Desk height calculator or guide
  };

  // Optional ISO date string of when the assessment was taken
  // Example: "2025-03-14"
  assessmentDate?: string;
}

// Individual checklist entry with a toggle action for completion state
interface ChecklistItem {
  id: string; // Stable identifier for the item
  label: string; // User-facing label, e.g., "Monitor top at eye level"
  completed: boolean; // Current completion status
  // Relative impact of this item on ergonomic risk reduction
  impact: "low" | "moderate" | "high";
  note?: string; // Optional helper text or condition, e.g., "Use a monitor riser if needed"
  iconUrl?: string; // Optional visual indicator for the item
  // Action dispatched when user toggles the item.
  // If nextCompleted is omitted, the consumer can infer a boolean flip.
  // Example: { type: "toggle_checklist_item", itemId: "monitor-eye-level", nextCompleted: true }
  toggleAction: {
    type: "toggle_checklist_item";
    itemId: string;
    nextCompleted?: boolean;
  };
}

// Summarized posture guidance
interface PostureRecommendation {
  summary: string; // Brief overview, e.g., "Keep elbows at ~90°, shoulders relaxed"
  action: string; // Concrete next step, e.g., "Adjust chair armrests to support forearms"
  // 0–1 fraction indicating expected risk reduction from following this guidance
  // Example: 0.2 -> 20% reduction
  estimatedRiskReduction: number;
  illustrationUrl?: string; // Optional diagram or image
}

// Desk height recommendation and change steps
interface DeskHeightRecommendation {
  currentHeightCm: number; // Measured current desk height in cm
  recommendedHeightCm: number; // Target desk height in cm
  // Ordered steps to achieve the recommended height
  // Example: ["Raise desk by 3 cm", "Re-test elbow angle at keyboard"]
  adjustmentSteps: string[];
  referenceUrl?: string; // Optional link for methodology or calculator
}

// Before/after score pair shown as improvement indicator
interface BeforeAfterScores {
  before: number; // Current score, e.g., 62
  after: number; // Expected score post-adjustments, e.g., 85
  // Optional max for rendering gauges/bars; default handled by component (e.g., 100)
  scaleMax?: number;
}

interface PostureRecommendationCardProps {
  // Unique identifier for this card instance (e.g., "posture-sit-001")
  id: string;

  // Short, user-facing title (e.g., "Sitting Posture", "Standing Posture")
  title: string;

  // Indicates the posture context this guidance applies to
  postureType: "sitting" | "standing";

  // One-paragraph summary of why this matters and what to aim for
  // Example: "Keep ears over shoulders, shoulders relaxed, and hips slightly above knees."
  summary: string;

  // 3–7 concise cues a user can scan quickly
  // Example: ["Feet flat", "Neutral wrists", "Elbows ~90°–100°", "Screen at eye height"]
  keyCues: string[];

  // Actionable steps or adjustments to make; order implies priority
  // Example: ["Raise chair by 2–3 cm", "Add footrest", "Lower keyboard tray"]
  recommendedActions: string[];

  // Estimated risk reduction if recommendations are followed; range 0–1
  // Example: 0.35 means a 35% relative reduction in ergonomic risk
  estimatedRiskReduction: number;

  // Optional image or icon illustrating posture (SVG/PNG/GIF). Can be a local path or CDN URL.
  // Example: "/img/posture/sitting-neutral.svg"
  imageUrl?: string;

  // User intent to acknowledge they've reviewed or understood the guidance.
  // Triggered by a UI control like "Got it" or "Mark understood".
  // Consumers should handle persistence/analytics based on this action.
  onMarkUnderstoodAction: {
    type: "mark_understood";
    payload: {
      // Echo the card id to help reducers/handlers identify the item
      id: string;
      // ISO timestamp when user confirmed understanding (optional; can be set by UI layer)
      understoodAt?: string; // e.g., "2025-03-01T10:15:00Z"
    };
  };

  // Optional UI config:
  // If true (default), show a visual gauge or badge for estimatedRiskReduction.
  showRiskGauge?: boolean; // Default: true
}

interface UserMetrics {
  // User's standing height from floor to top of head
  // Example: 175.0
  heightCm: number;

  // Height from floor to the top of the chair seat cushion
  // Example: 45.0
  chairSeatHeightCm: number;

  // Thickness of the keyboard at the home-row keycaps
  // Example: 18 (millimeters)
  keyboardThicknessMm: number;
}

interface RecalculateDeskHeightAction {
  // Dispatched when the user edits metrics and requests a new recommendation
  // The UI should provide updated userMetrics in the payload
  type: "recalculate_desk_height";
  payload: {
    userMetrics: UserMetrics;
  };
}

interface DeskHeightCalculatorCardProps {
  // Unique identifier for this card instance
  id: string;

  // Short internal name for analytics or debugging
  // Example: "desk_height_calc_primary"
  name: string;

  // User-facing title of the card
  // Example: "Ideal Desk Height Calculator"
  title: string;

  // Optional small illustration or icon URL to visually represent the calculator
  imageUrl?: string;

  // Current known desk height; omit if unknown
  // Example: 76.0
  currentDeskHeightCm?: number;

  // Recommended desk height based on the provided userMetrics
  // Example: 73.5
  recommendedDeskHeightCm: number;

  // Inputs used to determine the recommendation
  userMetrics: UserMetrics;

  // Ordered, concise steps to adjust the desk to the recommended height
  // Examples:
  // - "Raise desk by 2.5 cm"
  // - "Set desk to 73.5 cm"
  adjustmentSteps: string[];

  // Optional helper copy shown beneath the title
  // Example: "Align desk so your elbows are at ~90° when typing."
  description?: string;

  // Action dispatched when the user edits metrics and taps Recalculate
  onRecalculateAction: RecalculateDeskHeightAction;

  // Optional unit display overrides for internationalization
  // Defaults assumed: length in cm, keyboard thickness in mm
  units?: {
    length: "cm" | "in";
    keyboardThickness: "mm" | "in";
  };
}

interface RiskLevelIndicatorProps {
  level: 'low' | 'moderate' | 'high'; 
  // Overall ergonomic risk level.
  // Example: 'moderate'

  rationale: string; 
  // Brief explanation of why this level was assigned.
  // Example: "Chair lacks lumbar support and monitor is below eye level."

  hotspots: Array<{
    id: string;
    // Stable identifier for the hotspot.
    // Example: "monitor_height"

    label: string;
    // Short, user-facing name for the area/issue.
    // Example: "Monitor height"

    severity: 'low' | 'moderate' | 'high';
    // Local severity for this hotspot.
    // Example: 'high'
  }>;
  // Key areas contributing to the risk score. Keep this list short (e.g., 1–5 items).

  viewDetailsAction?: {
    type: 'view_details';
    // Triggered when the user requests more info (e.g., taps the card).
    // No payload required; the container can use current context.
  };

  isLoading?: boolean;
  // Optional: show a loading/skeleton state instead of content.
}

interface ImprovementScoreBadgeProps {
  // Ergonomics score before improvements; integer 0–100
  // e.g., 58
  beforeScore: number;

  // Ergonomics score after applying improvements; integer 0–100
  // e.g., 82
  afterScore: number;

  // Numeric change between afterScore and beforeScore.
  // Positive = improved, 0 = unchanged, negative = worse.
  // e.g., 24 (82 - 58) or -5
  delta: number;

  // Overall status based on the change in score.
  // Use "improved" when delta > 0, "unchanged" when delta === 0, "worse" when delta < 0.
  status: "improved" | "unchanged" | "worse";

  // Optional action to view detailed score breakdown (e.g., posture, desk height).
  // Example: { type: "view_breakdown", assessmentId: "erg-2025-11-19-xyz" }
  viewBreakdownAction?: {
    type: "view_breakdown";
    // Optional identifier to help the host app route to the correct assessment details
    assessmentId?: string;
  };
}