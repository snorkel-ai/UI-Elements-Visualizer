interface CareOverviewBoardProps {
  // Month currently in view for the color-coded calendar
  // Example: new Date(2025, 0, 1) // Jan 2025
  currentMonth: Date;

  // Active task filter controlling upcoming/overdue lists and calendar emphasis
  // - "today": tasks due today
  // - "thisWeek": tasks due in the next 7 days of currentMonth
  selectedFilter: "all" | "overdue" | "today" | "thisWeek";

  // Grid of plant cards with key care signals and a select action per plant
  plants: PlantCard[];

  // Care events that populate the calendar and upcoming/overdue lists
  careEvents: CareEventItem[];

  // Month navigation actions (used by previous/next buttons in the header)
  navigation: {
    // Example payloads: { delta: -1 } for previous month, { delta: 1 } for next month
    prevMonthAction: { type: "navigate_month"; payload: { delta: -1 } };
    nextMonthAction: { type: "navigate_month"; payload: { delta: 1 } };
  };

  // Optional: pre-defined actions for filter buttons/tabs
  // Example: overdue: { type: "change_filter", payload: { filter: "overdue" } }
  filterActions?: {
    all?: { type: "change_filter"; payload: { filter: "all" } };
    overdue?: { type: "change_filter"; payload: { filter: "overdue" } };
    today?: { type: "change_filter"; payload: { filter: "today" } };
    thisWeek?: { type: "change_filter"; payload: { filter: "thisWeek" } };
  };

  // Optional: tweak how overdue items are surfaced in lists
  // Default: true (overdue tasks appear before upcoming)
  showOverdueFirst?: boolean;
}

// A single plant card shown on the board
interface PlantCard {
  id: string; // Unique plant id (e.g., "plant_12")
  name: string; // Display name (e.g., "Snake Plant")
  // Soil moisture indicator for card iconography
  // - "light": soil is lightly moist
  // - "medium": moderate moisture
  // - "dry": needs water soon
  moistureStatus: "light" | "medium" | "dry";
  // Ambient light tolerance/need for the plant
  lightLevel: "low" | "medium" | "high";
  // Next scheduled care date for this plant (used in badges/tooltips)
  // Example: new Date("2025-01-08")
  nextTaskDate?: Date;
  // True if any required care is past due for this plant
  isOverdue?: boolean;
  // Optional image for the card thumbnail
  imageUrl?: string;
  // Action to open plant details or focus the plant on the board
  // Example: { type: "select_plant", payload: { plantId: "plant_12" } }
  selectAction: { type: "select_plant"; payload: { plantId: string } };
}

// An individual care event rendered in the calendar and lists
interface CareEventItem {
  id: string; // Unique event id (e.g., "evt_204")
  plantId: string; // References PlantCard.id
  // Care type determines icon/color-coding in calendar/list
  type: "water" | "fertilize" | "mist" | "rotate";
  // Scheduled date for the event
  // Example: new Date("2025-01-05")
  date: Date;
  // Current state of the task
  status: "pending" | "done" | "overdue";
  // Used to highlight urgent events (e.g., overdue watering)
  priority?: "normal" | "high";
  // Action to mark the event as completed
  // Example: { type: "complete_task", payload: { taskId: "evt_204" } }
  completeAction?: { type: "complete_task"; payload: { taskId: string } };
  // Optional quick link to the plant from the event row
  // Example: { type: "select_plant", payload: { plantId: "plant_12" } }
  openPlantAction?: { type: "select_plant"; payload: { plantId: string } };
}

interface PlantCardProps {
  // Unique identifier for the plant (used for tracking and actions)
  // Example: "plant_123"
  id: string;

  // Display name of the plant
  // Example: "Monstera Deliciosa"
  name: string;

  // Optional species or cultivar name to show under the title
  // Example: "Monstera deliciosa 'Borsigiana'"
  species?: string;

  // Optional image to display on the card (thumbnail URL)
  // Example: "https://cdn.example.com/plants/monstera.jpg"
  imageUrl?: string;

  // Current soil moisture status (used to render a moisture icon/state)
  // - dry: needs water soon
  // - ok: within ideal range
  // - wet: saturated/recently watered
  moistureStatus: "dry" | "ok" | "wet";

  // Ambient light level preference or current placement
  // - low: north-facing/indirect
  // - medium: bright indirect
  // - high: direct/very bright
  lightLevel: "low" | "medium" | "high";

  // Next care task scheduled for this plant
  // dueDate should be an ISO 8601 date string (UTC or local with offset)
  // Example:
  // { type: "water", dueDate: "2025-11-20T09:00:00Z" }
  nextTask: {
    type: "water" | "fertilize" | "mist" | "rotate";
    dueDate: string; // ISO string, e.g., "2025-11-21T00:00:00Z"
  };

  // Whether the next care task is overdue (controls overdue badge)
  // Set by upstream logic considering dueDate and current time.
  isOverdue: boolean;

  // Primary interaction for the card (e.g., click/tap to open plant details)
  // The renderer dispatches this action when the card is selected.
  // Example:
  // { type: "select_plant", payload: { id: "plant_123" } }
  onSelectAction: {
    type: "select_plant";
    payload: { id: string };
  };

  // Optional: show or hide the species line beneath the name (default true)
  showSpecies?: boolean;

  // Optional: compact density for tighter layouts (reduces padding/text)
  // Default: false
  compact?: boolean;
}

interface CareCalendarProps {
  month: Date; // Month to display; day/time ignored. Example: new Date(2025, 4, 1) for May 2025

  events: CareEvent[]; // Primary data: care tasks plotted on the calendar
  // Example:
  // [
  //   { id: "t1", plantId: "p-fern", type: "water", date: "2025-05-03", status: "pending" },
  //   { id: "t2", plantId: "p-snake", type: "rotate", date: "2025-05-03", status: "overdue" },
  //   { id: "t3", plantId: "p-fern", type: "mist", date: "2025-05-05", status: "done" }
  // ]

  colorScheme: CareColorScheme; // Colors used for dots/labels by task type and overdue status
  // Example:
  // {
  //   water: "#3BA7FF",
  //   fertilize: "#9C6ADE",
  //   mist: "#65C1A9",
  //   rotate: "#F5A623",
  //   overdue: "#E74C3C",
  //   done?: "#7F8C8D",
  //   pending?: "#2C3E50"
  // }

  selectedDate?: string; // Optional controlled selection in ISO date (YYYY-MM-DD). If provided, calendar highlights this day
  // Example: "2025-05-03"

  filter?: {
    // Optional server-side or external filter applied to visible tasks
    plantId?: string; // Show tasks for a single plant
    types?: CareEventType[]; // Restrict to specific task types
    status?: CareStatus[]; // Restrict by status
  };

  plantLookup?: PlantLookupItem[]; // Optional mapping to display names/icons in day cells or tooltips
  // Example:
  // [
  //   { plantId: "p-fern", name: "Boston Fern", iconUrl: "/img/fern.png" },
  //   { plantId: "p-snake", name: "Snake Plant", iconUrl: "/img/snake.png" }
  // ]

  selectDateAction: {
    // Emitted when a user clicks a day cell to filter tasks for that date
    type: "select_date";
    // The component will dispatch with payload:
    // { type: "select_date", date: "YYYY-MM-DD" }
  };

  toggleTaskAction: {
    // Emitted when a user marks a task as done/undone from a day cell
    type: "toggle_task";
    // The component will dispatch with payload:
    // { type: "toggle_task", taskId: string, nextStatus: CareStatus }
  };

  markDayDoneAction?: {
    // Optional bulk action to mark all pending tasks on a selected day as done
    type: "mark_day_done";
    // The component will dispatch with payload:
    // { type: "mark_day_done", date: "YYYY-MM-DD" }
  };

  weekStart?: "sun" | "mon"; // Calendar week start preference; default "sun"

  legendVariant?: "dots" | "pill" | "none"; // Legend style for task types; default "dots"

  showOverdueBadge?: boolean; // If true, shows an alert/badge for days containing overdue tasks; default true
}

/* ----- Supporting Types ----- */

type CareEventType = "water" | "fertilize" | "mist" | "rotate";

type CareStatus = "pending" | "done" | "overdue";

interface CareEvent {
  id: string; // Unique ID for the task
  plantId: string; // Reference to a plant in your collection
  type: CareEventType; // Type of care task
  date: string; // ISO date (YYYY-MM-DD). Time is not used in month view
  status: CareStatus; // Current task status
  note?: string; // Optional short note to show in tooltip or detail popover
}

interface CareColorScheme {
  water: string; // Color hex/rgb for watering tasks
  fertilize: string; // Color for fertilizing
  mist: string; // Color for misting
  rotate: string; // Color for rotation
  overdue: string; // Emphasis color for overdue tasks (overrides type color)
  done?: string; // Optional neutral color for completed tasks (if different from type color)
  pending?: string; // Optional text/outline color for pending badges
}

interface PlantLookupItem {
  plantId: string;
  name: string; // Display name used in tooltips or task lists
  iconUrl?: string; // Optional small icon used in day cells or detail views
}

interface UpcomingTaskListProps {
  // Chronological list of upcoming plant-care tasks
  // Example:
  // [
  //   {
  //     id: "t_001",
  //     plantId: "p_12",
  //     plantName: "Snake Plant",
  //     type: "water",
  //     dueAt: "2025-11-20T09:00:00Z",
  //     isOverdue: false
  //   }
  // ]
  tasks: UpcomingTask[];

  // Single action entry point for row interactions.
  // The UI will dispatch this action with a payload describing what occurred.
  // Payload shape:
  // {
  //   action: "complete" | "snooze" | "select_plant";
  //   taskId: string;
  //   plantId?: string;        // included for "select_plant"
  //   snoozeDays?: number;     // included for "snooze"
  // }
  // Example action object: { type: "upcoming_task_action" }
  onItemAction: { type: "upcoming_task_action" };

  // Optional: default snooze length (in days) when user taps a quick-snooze.
  // Example: 3
  defaultSnoozeDays?: number;

  // Optional: list of snooze choices (in days) to offer.
  // Example: [1, 3, 7]
  snoozeChoices?: number[];

  // Optional: whether to visually emphasize overdue items (e.g., red highlight).
  // Default behavior: true
  highlightOverdue?: boolean;

  // Optional: IANA timezone for displaying dueAt (if omitted, use system/device timezone).
  // Example: "America/Los_Angeles"
  timezone?: string;
}

// A single upcoming care task for a plant.
interface UpcomingTask {
  id: string; // unique task id
  plantId: string; // linked plant id
  plantName: string; // display name, e.g., "Monstera Deliciosa"
  type: TaskType; // care type icon inferred from this value
  dueAt: string; // ISO 8601 datetime, e.g., "2025-11-19T14:30:00Z"
  isOverdue?: boolean; // true if dueAt is past now
}

// Supported care task categories
type TaskType = "water" | "fertilize" | "mist" | "rotate";

interface OverdueAlertBannerProps {
  overdueCount: number; 
  // Total number of overdue care tasks across all plants.
  // Example: 5

  topOverdue?: Array<{
    id: string; 
    // Unique task ID. Example: "task_123"
    plantName: string; 
    // Display name. Example: "Monstera Deliciosa"
    type: "water" | "fertilize" | "mist" | "rotate"; 
    // What is overdue.
    daysOverdue: number; 
    // How many days late. Example: 3
  }>;
  // Optional short preview of the most urgent tasks (e.g., top 3).

  severity?: "low" | "medium" | "high";
  // Overall urgency level for visual emphasis.
  // Suggested: low (1–2 overdue), medium (3–5), high (6+).

  viewOverdueAction: {
    type: "open_overdue_view";
    // Trigger to navigate/open a filtered list of overdue tasks.
    filter?: {
      status: "overdue";
      plantIds?: string[]; 
      // Optionally scope to specific plants. Example: ["plant_a", "plant_b"]
    };
  };

  completeAllAction?: {
    type: "bulk_complete_overdue";
    // Trigger to mark multiple overdue tasks as completed in one step.
    taskIds: string[]; 
    // The tasks that will be completed. Example: ["task_123", "task_456"]
  };
}

interface PlantDetailDrawerProps {
  // Core plant identity and quick status shown at the top of the drawer
  plant: {
    id: string; // Unique plant ID, e.g., "plant_01"
    name: string; // Display name, e.g., "Fiddle Leaf Fig"
    species?: string; // Optional species, e.g., "Ficus lyrata"
    imageUrl?: string; // Optional thumbnail photo for the header
    lightLevel: "low" | "medium" | "high"; // Used to show light icon/badge
    moistureStatus: "dry" | "ok" | "wet"; // Used to show soil moisture indicator
  };

  // Simple care frequency used to render schedule and next-due hints
  schedule: {
    waterEveryDays: number; // e.g., 7
    fertilizeEveryDays?: number; // e.g., 30 (optional if not applicable)
  };

  // Key recent care signals displayed prominently
  lastWateredDate?: string; // ISO 8601 date, e.g., "2025-03-10"
  lastFertilizedDate?: string; // ISO 8601 date, optional

  // Optional short notes from the user about this plant
  notes?: string; // e.g., "Prefers bright indirect light. Rotate weekly."

  // Primary interaction: logging care from the drawer
  // The component will dispatch this action with the selected care type and date.
  // Example payload fired on save:
  // { type: "log_care", payload: { plantId: "plant_01", careType: "water", date: "2025-03-12" } }
  onCareAction: {
    type: "log_care";
    payload: {
      plantId: string;
      careType: "water" | "fertilize";
      date: string; // ISO 8601 date selected in the UI
    };
  };

  // Optional configuration
  historyPreviewLimit?: number; // Default suggestion: 5. Limits recent events shown in the drawer.
  timezone?: string; // IANA TZ for due-date calculations, e.g., "America/Los_Angeles"
}