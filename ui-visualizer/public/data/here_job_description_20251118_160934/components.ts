interface SkillGapOverviewProps {
  // Unique identifier for this analysis/dashboard instance
  id: string;

  // Human-readable title, e.g., "Skill Match: Senior Frontend Engineer vs. Jane Doe"
  title: string;

  // Candidate being compared (shown in header or summary card)
  candidateName: string;

  // Optional icon to represent the job or company (shown in header)
  // Example: "https://cdn.example.com/icons/react-role.png"
  jobIconUrl?: string;

  // Core data powering the matrix, radar chart, missing-skills checklist, and strengths summary
  data: {
    // Target role requirements (used as the "job" column in the match matrix)
    // Example:
    // [{ name: "React", level: 4, priority: "high" }, { name: "TypeScript", level: 3, priority: "medium" }]
    jobSkills: SkillRef[];

    // Candidate skills parsed from resume (used as the "resume" column in the match matrix)
    // Example:
    // [{ name: "React", level: 5 }, { name: "TypeScript", level: 3 }, { name: "GraphQL", level: 2 }]
    resumeSkills: SkillRefMinimal[];

    // Competency radar values (0–100) derived from skills or NLP scoring
    // Example:
    // [{ name: "Frontend", score: 82 }, { name: "Architecture", score: 60 }]
    competencyScores: CompetencyScore[];

    // Missing or underrepresented skills vs. job requirements (drives checklist)
    // Example:
    // [{ name: "Unit Testing", priority: "high" }, { name: "CI/CD", priority: "medium" }]
    missingSkills: MissingSkill[];

    // Strengths to highlight with a brief reason
    // Example:
    // [{ name: "React", reason: "Consistent high proficiency and recent projects" }]
    strengths: StrengthItem[];
  };

  // Primary interaction: select a skill to highlight across all sections (matrix, radar, checklist)
  // Example:
  // { type: "select_skill", payload: { name: "TypeScript" } }
  onSelectSkillAction: {
    type: "select_skill";
    payload: { name: string };
  };

  // Optional: initial filter on the missing-skills checklist
  // Default: "all"
  // Example: "high" to focus on critical gaps first
  defaultPriorityFilter?: Priority;

  // Optional: pre-highlight a skill upon load (e.g., from deep-link or prior selection)
  // Example: "React"
  highlightSkillName?: string;
}

/* ---- Supporting types ---- */

// Standardized skill representation for job requirements
interface SkillRef {
  name: string; // e.g., "React", "TypeScript"
  level: number; // 0–5 scale (0 = none, 5 = expert)
  priority: Priority; // importance from the job description
}

// Minimal skill representation for resume side
interface SkillRefMinimal {
  name: string;
  level: number; // 0–5 scale derived from resume evidence
}

type Priority = "high" | "medium" | "low" | "all";

interface CompetencyScore {
  name: string; // e.g., "Frontend", "Backend", "DevOps", "Communication"
  score: number; // 0–100 normalized score
}

interface MissingSkill {
  name: string; // missing or under-threshold skill vs. job requirement
  priority: Exclude<Priority, "all">; // only "high" | "medium" | "low"
}

interface StrengthItem {
  name: string; // standout skill or competency
  reason: string; // brief evidence/explanation, e.g., "Led 3 projects using React and Hooks"
}

interface SkillMatchMatrixProps {
  id: string; // Unique component instance id (e.g., "skill-matrix-001")
  title: string; // Display title (e.g., "Skill Match Matrix")
  jobTitle: string; // Contextual label (e.g., "Senior Frontend Engineer")
  rows: SkillMatchRow[]; // Core data aligning job-required skills vs. resume skills
  initialView?: "all" | "gaps" | "matches"; // Default: "all" — filters the visible rows
  defaultSort?: {
    by: "priority" | "matchStatus" | "skillName"; // Default: "priority"
    order?: "asc" | "desc"; // Default: "desc" for priority, "asc" otherwise
  };
  onSelectSkillAction?: {
    // Fired when a row is clicked to view improvement tips or details
    type: "select_skill";
    payload: { skillId: string }; // The id from the clicked row
  };
}

// Represents a single row in the two-column matrix aligning job vs. resume skill levels
interface SkillMatchRow {
  id: string; // Stable identifier for the skill (e.g., "react", "data-analysis")
  skillName: string; // Human-readable label (e.g., "React", "Data Analysis")
  jobLevel: number; // Expected proficiency level from job (0-5 recommended)
  resumeLevel: number; // Detected proficiency level from resume (0-5 recommended)
  matchStatus: "match" | "partial" | "missing"; // Derived status comparing jobLevel vs. resumeLevel
  priority: number | "high" | "medium" | "low"; 
  // Priority guides sorting and attention:
  // - Numeric (e.g., 1-5 where 5 = highest urgency), or
  // - Categorical ("high" | "medium" | "low")
  iconUrl?: string; // Optional icon for the skill (e.g., a tech logo)
}

interface CompetencyRadarChartProps {
  // Primary data: each axis on the radar chart representing a competency
  competencies: Array<{
    id: string; // Stable identifier for cross-component coordination and filtering
    competencyName: string; // e.g., "Data Analysis", "Leadership"
    jobScore: number; // Score from the job description (use the scale defined in scoreRange)
    resumeScore: number; // Score inferred from the resume (same scale as jobScore)
    relatedSkillIds?: string[]; // Optional: skill identifiers used by other components for filtering
  }>;

  // Series labels displayed in legend/tooltips
  labels?: {
    job: string; // e.g., "Job Target"
    resume: string; // e.g., "Your Resume"
  };

  // Declares the input scale of the provided scores prior to any normalization
  // Example: { min: 0, max: 100 }
  scoreRange?: { min: number; max: number };

  // Normalization controls: compare on a common scale; toggled by the user if enabled
  normalization?: {
    enabledByDefault?: boolean; // If true, chart initially renders normalized
    method?: "min-max" | "z-score"; // Default normalization technique when toggled on
    clampToRange?: boolean; // If true, clamp normalized values to [0, 1] for display
    allowUserToggle?: boolean; // If false, normalization state is fixed by enabledByDefault
  };

  // Visual variant of the radar drawing
  radarStyle?: "lines" | "filled"; // "filled" draws semi-transparent areas; "lines" draws outlines only

  // Whether to show a legend distinguishing job vs. resume series
  showLegend?: boolean;

  // Controlled highlight: set to a competency id to emphasize and drive filtering in sibling components
  highlightedCompetencyId?: string | null;

  // Fired when a competency is highlighted/unhighlighted (e.g., via click or keyboard focus)
  // Use to filter related skills in other components.
  onHighlightAction?: {
    type: "highlight_competency";
    competencyId: string | null; // null indicates clearing the highlight
  };

  // Fired when the normalization toggle state changes in the UI
  onToggleNormalizationAction?: {
    type: "toggle_normalization";
    normalized: boolean; // true when normalization is active
    method?: "min-max" | "z-score"; // Method in effect after the toggle, if applicable
  };

  // Accessible context for screen readers and analytics-friendly titles
  title?: string; // e.g., "Competency Match: Job vs. Resume"
  ariaDescription?: string; // e.g., "Radar chart comparing five competencies between the job and your resume."
}

interface MissingSkillsChecklistProps {
  id: string; // Unique component instance id (e.g., "missing-skills-checklist-1")
  title: string; // Display title (e.g., "Missing or Under-Threshold Skills")
  jobContext: {
    jobId: string; // Job description reference id
    jobTitle?: string; // Optional: "Senior Frontend Engineer"
  };
  items: MissingSkillItem[]; // Data to render the checklist (sorted by `sortBy`)
  sortBy?: "priority" | "gapSize"; // Initial sort. Default: "priority"
  showResourceCount?: boolean; // Show suggested resource badges per item. Default: true
  onInteractionAction: {
    // Single action descriptor; the component will dispatch detailed actions derived from this
    // Example emitted actions:
    // - { type: "select_item", itemId: "skill-1", selected: true }
    // - { type: "toggle_expand", itemId: "skill-1", expanded: true }
    // - { type: "change_sort", sortBy: "gapSize" }
    type: "missing_skills_interaction";
  };
}

// Individual checklist entry representing a missing or under-threshold skill
interface MissingSkillItem {
  id: string; // Stable id for the skill item (e.g., "skill-react")
  skillName: string; // Human-readable name (e.g., "React", "Kubernetes")
  priority: "high" | "medium" | "low"; // Importance based on job match
  gapSize: number; // 0–100 (higher = larger gap vs. job requirement)
  suggestedResourcesCount?: number; // e.g., 3 (quick tips/courses/articles available)
  selected?: boolean; // Initially checked to add to upskilling plan
  expanded?: boolean; // Initially expanded to show tips/resources
  iconUrl?: string; // Optional icon for the skill (e.g., badge or tech logo)
}

// Actions the component emits via onInteractionAction (examples above)
type MissingSkillsChecklistAction =
  | { type: "select_item"; itemId: string; selected: boolean }
  | { type: "toggle_expand"; itemId: string; expanded: boolean }
  | { type: "change_sort"; sortBy: "priority" | "gapSize" };

interface StrengthsSummaryCardProps {
  // Unique identifier for this card instance (useful for tracking or analytics)
  id: string; // e.g., "strengths-card-001"

  // Short header/title for the card
  title: string; // e.g., "Top Strengths Exceeding Job Expectations"

  // Human-readable summary that synthesizes why these strengths matter for the role
  // Keep concise (1–3 sentences) for quick scanning
  summaryText: string; // e.g., "Your cloud architecture and leadership competencies significantly exceed the role's expectations, enabling faster delivery and higher reliability."

  // Ranked list of top strengths where the candidate exceeds job expectations
  strengths: StrengthItem[]; // typically 3–6 items

  // Optional icon or image to visually reinforce the concept
  imageUrl?: string; // e.g., "/icons/trophy.svg"

  // Action dispatched when user copies the summary (or full strengths) to clipboard
  // The component should populate the text field when dispatching this action
  onCopySummaryAction: {
    type: "copy_strengths_summary";
    payload: {
      id: string; // same as card id
      text: string; // the actual text copied (e.g., summaryText + formatted strengths)
    };
  };

  // Optional action dispatched when a user pins a specific strength
  // Use this to include the pinned item in downstream "resume suggestions" flows
  onPinStrengthAction?: {
    type: "pin_strength";
    payload: {
      strengthId: string; // StrengthItem.id
      skill: string; // StrengthItem.skillOrCompetency
    };
  };

  // Optional cap on how many strengths to display (extra can be collapsed or ignored)
  maxVisible?: number; // Default suggestion: 4
}

// A single strength where the resume exceeds the job expectation
interface StrengthItem {
  id: string; // e.g., "strength-aws-arch"
  skillOrCompetency: string; // e.g., "Cloud Architecture (AWS)"
  // Candidate's demonstrated level for this skill/competency
  // Use either numeric scale (1–5) or labels ("Beginner" | "Intermediate" | "Advanced" | "Expert")
  resumeLevel: number | string; // e.g., 5 or "Expert"
  // Required/expected level derived from the job description (same scale as resumeLevel)
  jobLevel: number | string; // e.g., 3 or "Intermediate"
  // Why this strength is impactful for the role/company (e.g., outcomes, scope, reliability)
  impactReason: string; // e.g., "Led migration to AWS with 35% cost reduction and 99.99% uptime."
  // Optional short evidence snippet or reference from the resume/portfolio
  evidenceSnippet?: string; // e.g., "Built multi-account landing zone; implemented IaC with Terraform."
}

interface SkillUpskillingPlanProps {
  id: string; // Unique plan identifier (e.g., "plan_2025_q1_engineering")
  title: string; // Display name (e.g., "Q1 Upskilling Plan: Backend Engineering")
  overallPriority: "low" | "medium" | "high"; // High-level urgency for the plan
  planItems: SkillPlanItem[]; // Selected gaps with targets, timeline, and resources
  totalEffortEstimateHours?: number; // Optional roll-up of all item efforts (e.g., 42)
  iconUrl?: string; // Optional plan icon (e.g., roadmap or checklist image)
  defaultDueInDays?: number; // Optional helper for new items (e.g., 30 => default due date in 30 days)
  onPlanAction: SkillPlanAction; 
  // Single action object to dispatch interactions. Examples:
  // { type: "add_skill_to_plan", payload: { skillName: "Kubernetes", targetLevel: "intermediate", dueDate: "2025-02-01" } }
  // { type: "update_target_level", payload: { itemId: "item_k8s_1", targetLevel: "advanced" } }
  // { type: "export_plan", payload: { format: "pdf" } }
}

interface SkillPlanItem {
  id: string; // Unique item id (e.g., "item_sql_01")
  skillName: string; // Gap or competency to improve (e.g., "SQL Performance Tuning")
  currentLevel?: SkillLevel; // Optional current proficiency (if known)
  targetLevel: SkillLevel; // Desired level (e.g., "advanced")
  dueDate: string; // ISO 8601 date (e.g., "2025-03-15")
  effortEstimateHours: number; // Estimated effort in hours (e.g., 12.5)
  suggestedResources: SuggestedResource[]; 
  // Curated learning or practice materials
  // Examples:
  // [{ title: "SQL Indexing Deep Dive", type: "course", url: "https://provider.com/sql" }]
  progress?: {
    percent: number; // 0-100 (e.g., 40)
    status: "not_started" | "in_progress" | "blocked" | "completed";
  };
}

interface SuggestedResource {
  id?: string; // Optional resource id (e.g., "res_aws_001")
  title: string; // Resource title (e.g., "AWS SA Pro Exam Guide")
  type: "course" | "article" | "book" | "project" | "mentorship" | "certification"; // Resource category
  url?: string; // Optional deep link
  provider?: string; // Optional source/vendor (e.g., "Coursera", "AWS", "Internal LMS")
}

type SkillLevel = "beginner" | "intermediate" | "advanced" | "expert";

type SkillPlanAction =
  | {
      type: "add_skill_to_plan";
      payload: {
        skillName: string;
        targetLevel: SkillLevel;
        dueDate?: string; // ISO date; if omitted, component may use defaultDueInDays
        effortEstimateHours?: number;
        suggestedResources?: SuggestedResource[];
      };
    }
  | {
      type: "remove_skill_from_plan";
      payload: { itemId: string };
    }
  | {
      type: "update_target_level";
      payload: { itemId: string; targetLevel: SkillLevel };
    }
  | {
      type: "update_due_date";
      payload: { itemId: string; dueDate: string }; // ISO date
    }
  | {
      type: "mark_progress";
      payload: {
        itemId: string;
        percent: number; // 0-100
        status?: "not_started" | "in_progress" | "blocked" | "completed";
      };
    }
  | {
      type: "export_plan";
      payload?: { format: "pdf" | "csv" | "json" }; // Default could be "pdf" if omitted
    };