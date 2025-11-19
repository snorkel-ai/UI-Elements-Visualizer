interface CourseProgressOverviewProps {
  // Courses to display as cards with completion circles and time remaining
  // Example:
  // [
  //   { id: "c1", title: "React Basics", provider: "Coursera", progressPercent: 65, estimatedHoursRemaining: 4.5 },
  //   { id: "c2", title: "Data Structures", provider: "edX", progressPercent: 20, estimatedHoursRemaining: 12 }
  // ]
  courses: Array<{
    id: string; // Stable id, e.g., "c1"
    title: string; // Course name, e.g., "React Basics"
    provider?: string; // Optional platform, e.g., "Coursera"
    progressPercent: number; // 0–100
    estimatedHoursRemaining: number; // e.g., 4.5 for 4.5 hours remaining
  }>;

  // Weekly study schedule grid starting from a specific week date (Monday recommended)
  // weekStartDate is ISO date string (YYYY-MM-DD) representing the first day of the displayed week
  // Slots are planned sessions tied to courses
  // Example:
  // {
  //   weekStartDate: "2025-11-17",
  //   slots: [
  //     { id: "s1", courseId: "c1", day: 1, start: "18:00", end: "19:30" }, // Tuesday 6–7:30pm
  //     { id: "s2", courseId: "c2", day: 4, start: "08:00", end: "09:00" }  // Friday 8–9am
  //   ]
  // }
  scheduleWeek: {
    weekStartDate: string; // ISO date, e.g., "2025-11-17"
    slots: Array<{
      id: string; // Session id
      courseId: string; // Must match one of the courses.id
      day: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sunday, 6=Saturday
      start: string; // 24h time "HH:MM", e.g., "18:00"
      end: string; // 24h time "HH:MM", e.g., "19:30"
    }>;
  };

  // Earned badges for streaks or milestones
  // Example:
  // [
  //   { id: "b1", type: "streak", label: "7-Day Streak", level: 7 },
  //   { id: "b2", type: "milestone", label: "50% Complete", level: 50 }
  // ]
  badges?: Array<{
    id: string;
    type: "streak" | "milestone";
    label: string; // Display text
    level?: number; // e.g., streak length or % milestone
  }>;

  // Optional: toggle showing estimated hours remaining on course cards
  // Default behavior if omitted: true (show estimated hours)
  showEstimatedHours?: boolean;

  // Simple action object for when a user selects a course card
  // The component sets this when a card is selected; host app reads it to handle navigation, etc.
  // Example: { type: "select_course", courseId: "c2" }
  onSelectCourseAction?: {
    type: "select_course";
    courseId: string;
  };
}

interface CourseCardAction {
  // Type of action to trigger when the card is activated (e.g., tap or click)
  // Examples:
  // { type: "open_course", payload: { id: "course_123" } }
  // { type: "plan_study_sessions", payload: { id: "course_123" } }
  // { type: "toggle_favorite", payload: { id: "course_123" } }
  type: "open_course" | "plan_study_sessions" | "toggle_favorite";
  payload: {
    id: string; // Must match the CourseCardProps.id
  };
}

interface CourseCardProps {
  id: string; // Unique course identifier (e.g., "course_123")
  title: string; // Course title (e.g., "Intro to TypeScript")
  provider: string; // Platform or instructor (e.g., "Coursera", "Udemy", "MITx")

  progressPercent: number; // 0-100 inclusive; displayed as a progress ring
  estimatedHoursRemaining: number; // Estimated hours to finish; non-negative number
  nextLessonTitle?: string; // Optional: title of the upcoming lesson (e.g., "Generics and Utility Types")

  thumbnailUrl?: string; // Optional: course cover image URL (HTTPS recommended)

  // Single action object for the primary interaction with this card.
  // Recommended default: { type: "open_course", payload: { id } }
  primaryAction: CourseCardAction;
}

interface WeeklyStudyScheduleProps {
  // ISO date string (YYYY-MM-DD) representing the Monday of the week being shown
  // Example: "2025-03-17"
  weekStartDate: string;

  // Pre-scheduled sessions visible in the grid for this week
  sessions: StudySession[];

  // Fast lookup for course display info used in the grid cards
  // Keyed by courseId found in sessions[]
  coursesIndex: {
    [courseId: string]: CourseInfo;
  };

  // Grid density for time slots
  // Default: "60m"
  timeScale?: "30m" | "60m";

  // Show a vertical marker for the current time when the week includes "today"
  // Default: true
  showCurrentTimeMarker?: boolean;

  // Single action object for all user interactions in the schedule (add/move/edit/delete)
  // The rendering layer should dispatch this action with one of the payload variants below.
  scheduleAction: {
    type: "schedule_interaction";
    payload:
      | {
          // User quick-added a new session on the grid
          event: "add_session";
          // ISO date (YYYY-MM-DD) within the shown week
          day: string;
          // 24h time "HH:mm" in local time
          start: string;
          // 24h time "HH:mm" in local time; must be after start
          end: string;
          // Optional pre-selection; if omitted, UI may prompt
          courseId?: string;
          // Optional quick title; if omitted, UI may derive from course
          title?: string;
        }
      | {
          // User dragged/resized a session
          event: "move_session";
          id: string;
          newDay: string; // ISO date (YYYY-MM-DD)
          newStart: string; // "HH:mm"
          newEnd: string; // "HH:mm"
        }
      | {
          // User opened edit for a session (e.g., via click)
          event: "edit_session";
          id: string;
        }
      | {
          // User requested deletion of a session
          event: "delete_session";
          id: string;
        };
  };
}

// A single scheduled study block within the displayed week
interface StudySession {
  id: string; // Stable unique id
  courseId: string; // Must exist in coursesIndex
  title: string; // Display name for the session (e.g., "Module 3: Arrays")
  // ISO date (YYYY-MM-DD) within the shown week; not a full datetime
  day: string;
  // 24h local time strings; UI assumes same day
  // Examples: "09:00", "13:30"
  start: string;
  end: string;
}

// Minimal info needed to render course labels and colors in the grid
interface CourseInfo {
  title: string; // Course title as shown on session cards
  // CSS color token or hex; used for accent/badge
  color: string; // Examples: "#4F46E5", "var(--accent)"
  // Optional icon shown on session cards or legend
  // Example: "https://cdn.example.com/icons/python.svg"
  iconUrl?: string;
}

interface StudySessionPlannerModalProps {
  // The course this planning session is for
  courseId: string; // e.g., "course_123"
  courseTitle: string; // e.g., "Intro to Data Structures"
  courseIconUrl?: string; // Optional small icon to show next to title

  // Key progress and planning fields
  remainingHours: number; // Total estimated hours left to finish the course; e.g., 12.5
  targetHoursThisWeek: number; // Target study hours to allocate this week; e.g., 6

  // Suggested and existing study blocks to guide/seed the plan
  suggestedBlocks?: StudyPlannerBlock[]; // System suggestions; non-binding
  existingBlocks?: StudyPlannerBlock[]; // Already scheduled blocks; can be edited/removed

  // Single action entry point for all interactions
  // The UI should dispatch one of the action types below with the appropriate payload
  onAction: StudySessionPlannerAction;

  // Optional configuration
  weekStart?: "Mon" | "Sun"; // Default assumed "Mon"
  use24hTime?: boolean; // If true, show times in 24h format; default false (12h)
}

/**
 * Represents a study block within a week schedule.
 * - day: Day of week the block occurs
 * - start: Start time in "HH:MM" 24h format (UI may convert based on use24hTime)
 * - durationMins: Duration in minutes; e.g., 90 for 1.5 hours
 * - id: Optional stable id for existing blocks (useful for edits/deletions)
 *
 * Example:
 * { id: "blk_1", day: "Tue", start: "18:30", durationMins: 90 }
 */
interface StudyPlannerBlock {
  id?: string;
  day: DayOfWeek;
  start: string; // "HH:MM", 00:00 - 23:59
  durationMins: number;
}

/**
 * Restrict day values for schedule grid alignment.
 */
type DayOfWeek = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

/**
 * All interactions are represented as actions.
 * The host app should listen and handle accordingly.
 *
 * Examples:
 * - { type: "save_plan", payload: { courseId: "course_123", blocks: [...] } }
 * - { type: "auto_distribute", payload: { courseId: "course_123", hours: 6 } }
 * - { type: "close_modal", payload: { courseId: "course_123" } }
 */
type StudySessionPlannerAction =
  | {
      type: "save_plan";
      payload: {
        courseId: string;
        // The finalized set of blocks for the week after user edits
        blocks: StudyPlannerBlock[];
      };
    }
  | {
    type: "auto_distribute";
    payload: {
      courseId: string;
      // Number of hours to auto-spread across the week; e.g., targetHoursThisWeek
      hours: number;
    };
  }
  | {
    type: "close_modal";
    payload: {
      courseId: string;
    };
  };

interface BadgeListProps {
  badges: Array<{
    id: string; // Unique badge id, e.g., "streak_7_days"
    type: 'streak' | 'milestone'; // Badge category
    label: string; // Display name, e.g., "7-Day Streak"
    level: number | string; // e.g., 7 or "Gold"
    progressPercent: number; // 0–100; for upcoming badges show progress toward earning
    earnedAt?: string; // ISO date when earned, e.g., "2025-01-15T10:00:00Z"
  }>;

  filter?: 'all' | 'earned' | 'upcoming'; // Optional initial filter; default: 'all'

  compact?: boolean; // Optional condensed layout (smaller badges/text); default: false

  // Dispatched when a badge is clicked. Runtime will include { badgeId } of the clicked badge.
  badgeClickAction?: { type: 'badge_click' };

  // Dispatched when the filter changes. Runtime will include { filter } with one of 'all' | 'earned' | 'upcoming'.
  filterChangeAction?: { type: 'change_filter' };
}