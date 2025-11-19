interface PetHealthOverviewProps {
  // Pet identity used in header/title areas
  pet: {
    name: string; // e.g., "Buddy"
    id?: string; // Optional stable ID
    avatarUrl?: string; // Optional pet photo URL
  };

  // High-level health summary for quick glance
  summary?: {
    ageYears?: number; // e.g., 4.5
    weightKg?: number; // e.g., 23.2
    lastVisitDate?: string; // ISO 8601 date, e.g., "2025-07-12"
    nextVisitDate?: string; // ISO 8601 date, e.g., "2025-12-05"
    primaryVet?: string; // e.g., "Dr. Nguyen, Happy Paws Clinic"
  };

  // Chronological items for the timeline (past and upcoming)
  visits: Array<{
    id: string;
    dateTime: string; // ISO 8601, e.g., "2025-11-20T14:30:00Z"
    title: string; // e.g., "Annual Wellness Exam" or "Rabies Booster"
    type: "Visit" | "Vaccine" | "Medication";
    status: "Past" | "Upcoming" | "Missed";
  }>;

  // Track vaccines/medications with due status and next dose when relevant
  checklistItems: Array<{
    id: string;
    name: string; // e.g., "Heartworm Preventative", "Rabies Vaccine"
    type: "Medication" | "Vaccine";
    status: "Due" | "Completed" | "Overdue";
    dueDate: string; // ISO 8601 date, e.g., "2025-12-01"
    nextDoseAt?: string; // Optional ISO 8601 date-time for next dose if recurring
  }>;

  // Reminders for upcoming actions/doses/visits
  reminders: Array<{
    id: string;
    title: string; // e.g., "Give Heartworm Tablet"
    dueAt: string; // ISO 8601 date-time, e.g., "2025-11-21T09:00:00-05:00"
    relatedType: "Medication" | "Vaccine" | "Visit";
  }>;

  // Single action object to route all interactions from this component.
  // The component will emit events to this "channel".
  // Expected emitted event shapes (examples) are documented in PetHealthOverviewEvent below.
  onAction: { type: "pet_health_overview_action_channel" };

  // Optional config
  timezone?: string; // IANA timezone for display, e.g., "America/New_York" (defaults to system/UTC)
  initialView?: "timeline" | "checklist" | "summary"; // Which subview to focus first (default: "timeline")
}

/*
Emitted Events (for reference):
- { type: "open_record_detail"; payload: { recordId: string; recordKind: "Visit" | "Vaccine" | "Medication" } }
- { type: "mark_item_done"; payload: { checklistItemId: string; completedAt?: string } }
- { type: "snooze_reminder"; payload: { reminderId: string; snoozeForMinutes: number } }
- { type: "add_new_record"; payload: { kind: "Visit" | "Vaccine" | "Medication"; suggestedDateTime?: string } }

All date/time strings should be ISO 8601. Keep IDs stable across renders for accurate updates.
*/

interface SummaryHealthCardProps {
  // Stable unique identifier for the pet record (e.g., UUID from your DB)
  id: string;

  // Display name of the pet
  // Example: "Buddy"
  petName: string;

  // Optional avatar image for the pet
  // Example: "https://cdn.example.com/pets/buddy.jpg"
  avatarUrl?: string;

  // Pet age in years (decimals allowed)
  // Example: 3.5 means 3 years and 6 months
  ageYears: number;

  // Latest known weight in kilograms (optional if unknown)
  // Example: 12.3
  weightKg?: number;

  // Primary veterinarian name or clinic (compact text shown on the card)
  // Example: "Dr. Lopez, Greenfield Animal Clinic"
  primaryVet?: string;

  // Compact visit info for timeline context
  // Dates should be ISO 8601 strings: "YYYY-MM-DD" or full datetime "YYYY-MM-DDTHH:mm:ssZ"
  visits?: {
    // Most recent completed vet visit
    // Example: "2025-06-12"
    last?: string;

    // Next scheduled appointment, vaccine, or medication check
    // Example: "2025-12-01T09:30:00Z"
    next?: string;
  };

  // Single high-level action triggered by primary user interaction on the card.
  // Use union types to indicate intent; the renderer can route accordingly.
  // Examples:
  // - { type: "open_full_profile", payload: { petId: "abc123" } }
  // - { type: "edit_summary", payload: { petId: "abc123", fields: ["weightKg","primaryVet"] } }
  primaryAction:
    | { type: "open_full_profile"; payload: { petId: string } }
    | { type: "edit_summary"; payload: { petId: string; fields?: ("weightKg" | "primaryVet")[] } };
}

interface VetVisitTimelineProps {
  // Primary chronological list of events to render
  // dateTime should be ISO-8601 (e.g., "2025-01-20T14:30:00Z")
  items: VetTimelineItem[];

  // Optional initial filters applied when the component mounts
  // If omitted, defaults to showing all subtypes and statuses
  initialFilters?: TimelineFilters;

  // Timezone identifier used to display dates/times (IANA format, e.g., "America/New_York")
  // If omitted, the component may fall back to the environment's locale/timezone
  timezone?: string;

  // Group items in the timeline under headers (e.g., by day or month)
  // "none" shows a flat chronological list
  groupBy?: "none" | "day" | "week" | "month";

  // Visually emphasize missed items (e.g., badges/labels)
  // Only a behavior flag; no style controls are exposed
  showMissedHighlight?: boolean;

  // Optional empty state content shown when no items match current filters
  emptyState?: {
    title: string; // e.g., "No visits yet"
    description?: string; // e.g., "Add your first vet visit to get started."
    illustrationUrl?: string; // e.g., an image to display in the empty state
  };

  // Action dispatched when a user selects an item to view or edit details
  // The component will populate itemId at dispatch time
  onSelectAction: {
    type: "select_item";
    itemId?: string; // filled by the component
  };

  // Action dispatched when filters change (e.g., subtype/status toggles)
  // The component will populate filters at dispatch time
  onFilterChangeAction?: {
    type: "update_filters";
    filters?: TimelineFilters; // filled by the component
  };

  // Action dispatched to add a new entry (visit, vaccine, or medication)
  // The component may include a suggested subtype based on the user’s choice
  onAddNewAction?: {
    type: "add_new_entry";
    subtype?: TimelineSubtype; // filled by the component if user specified a type
  };

  // Action dispatched when marking a vaccine/medication dose as taken or skipped
  // The component will populate itemId and doseId at dispatch time
  onMarkDoseAction?: {
    type: "mark_dose";
    itemId?: string; // parent item id
    doseId?: string; // specific dose marker id
    outcome?: "taken" | "skipped"; // the result of the action
  };
}

// Individual timeline entry
interface VetTimelineItem {
  id: string; // unique item id
  dateTime: string; // ISO-8601 UTC or local (paired with timezone prop)
  title: string; // e.g., "Annual Checkup", "Rabies Booster", "Heartworm Medication"
  subtype: TimelineSubtype; // Visit | Vaccine | Medication
  status: TimelineStatus; // Past | Upcoming | Missed
  clinicName?: string; // for visits, e.g., "Happy Paws Veterinary Clinic"
  notesPreview?: string; // short single-line summary
  iconUrl?: string; // optional icon for item type (e.g., stethoscope, syringe, pill)
  // Optional dose markers for Vaccine/Medication items to show scheduled/taken doses within the timeline context
  markers?: DoseMarker[]; 
}

type TimelineSubtype = "Visit" | "Vaccine" | "Medication";

type TimelineStatus = "Past" | "Upcoming" | "Missed";

// Filters used to narrow the timeline
interface TimelineFilters {
  subtype?: "All" | TimelineSubtype;
  status?: "All" | TimelineStatus;
}

// Represents a scheduled dose or booster associated with a Vaccine/Medication item
interface DoseMarker {
  id: string; // unique dose id
  scheduledAt: string; // ISO-8601 scheduled time
  status: "Due" | "Taken" | "Missed";
  takenAt?: string; // ISO-8601 when marked taken
  // Optional short label, e.g., "Dose 2 of 3" or "Monthly dose"
  label?: string;
}

interface MedVaxChecklistProps {
  // The pet this checklist belongs to
  // Example: "pet_12345"
  petId: string;

  // Optional header/title to display above the checklist
  // Example: "Milo’s Medications & Vaccines"
  title?: string;

  // Optional avatar/icon for the pet (square or circle, small)
  // Example: "https://cdn.example.com/pets/milo.jpg"
  petAvatarUrl?: string;

  // List of vaccines/medications to render in the checklist
  items: MedVaxChecklistItem[];

  // Single action sink for all item-level interactions.
  // The component will populate/override payload fields at runtime with the
  // appropriate itemId, timestamps, etc., based on the user’s action.
  // Example emitted payloads:
  // { type: "medvax_item_action", payload: { action: "mark_administered", itemId: "it_1", date: "2025-01-15" } }
  // { type: "medvax_item_action", payload: { action: "toggle_pause", itemId: "it_2", paused: true } }
  // { type: "medvax_item_action", payload: { action: "view_schedule", itemId: "it_3" } }
  // { type: "medvax_item_action", payload: { action: "add_new_item", prefill: { itemType: "Vaccine", name: "Rabies" } } }
  onItemAction?: MedVaxItemActionSink;

  // Optional display configuration
  // If true, overdue items bubble to the top (default: true)
  showOverdueFirst?: boolean;

  // IANA timezone used for due/next dose rendering and date calculations.
  // Example: "America/Los_Angeles". Default: browser/device timezone.
  timezone?: string;
}

// Minimal item model for the checklist. Dates should be ISO 8601 strings.
interface MedVaxChecklistItem {
  // Unique identifier for the item
  // Example: "it_abc123"
  id: string;

  // Display name
  // Example (Medication): "Carprofen"
  // Example (Vaccine): "DHPP"
  name: string;

  // Type of item
  itemType: "Medication" | "Vaccine";

  // Human-friendly dosage or series information
  // Example (Medication): "25 mg, 2x/day"
  // Example (Vaccine): "Dose 2 of 3"
  dosageOrSeries?: string;

  // Current status in the checklist
  // "Active" typically indicates an ongoing medication schedule.
  // "Paused" is allowed for medications when temporarily halted.
  status: "Due" | "Completed" | "Overdue" | "Active" | "Paused";

  // When this item is/was due (for past or upcoming events)
  // Example: "2025-01-15"
  dueDate?: string;

  // Next scheduled dose/time (for recurring meds or vaccine series)
  // Example: "2025-01-20T08:00:00Z"
  nextDoseAt?: string;

  // Last administration date/time
  // Example: "2025-01-13T18:30:00Z"
  lastGivenDate?: string;

  // Optional small icon for the item (e.g., pill, syringe)
  // Example: "https://cdn.example.com/icons/syringe.png"
  iconUrl?: string;
}

// Single action sink prop used by the component to emit user-intended actions.
// The component fills in payload fields (e.g., itemId) as interactions occur.
interface MedVaxItemActionSink {
  type: "medvax_item_action";
  payload: {
    // The specific sub-action the user is taking.
    action: "mark_administered" | "toggle_pause" | "view_schedule" | "add_new_item";

    // The item being acted on (if applicable). Not required for add_new_item.
    itemId?: string;

    // For marking a dose as administered; if omitted, the component may use "now".
    // Example: "2025-01-15T09:00:00Z"
    date?: string;

    // For pausing/resuming a medication.
    paused?: boolean;

    // For pre-filling the add-new flow (optional convenience).
    prefill?: Partial<MedVaxChecklistItemInput>;
  };
}

// Input shape for creating a new item via add_new_item; used for prefill only.
interface MedVaxChecklistItemInput {
  name: string; // Example: "Rabies"
  itemType: "Medication" | "Vaccine";
  dosageOrSeries?: string; // Example: "10 mg, 1x/day" or "Booster in 1 year"
  firstDueDate?: string; // Example: "2025-02-01"
}

interface ReminderListProps {
  // List of upcoming reminders to show (meds, vaccines, vet visits)
  reminders: ReminderItem[];

  // Current time in ms since Unix epoch; used to compute "due soon" / "overdue"
  nowTimestamp: number;

  // Single action channel for all interactions on items.
  // The component will dispatch this action with the payload filled in when a user interacts.
  // Example dispatched payloads:
  // - { type: "reminder_action", payload: { itemId: "r1", action: "mark_done" } }
  // - { type: "reminder_action", payload: { itemId: "r2", action: "snooze", snoozeForMinutes: 60 } }
  // - { type: "reminder_action", payload: { itemId: "r3", action: "dismiss" } }
  // - { type: "reminder_action", payload: { itemId: "r4", action: "open_related" } }
  onItemAction: {
    type: "reminder_action";
    payload: {
      itemId: string;
      action: "mark_done" | "snooze" | "dismiss" | "open_related";
      snoozeForMinutes?: number; // required only when action === "snooze"
    };
  };

  // Optional: snooze preset options (in minutes). Default: [60, 1440] => +1h, +1d
  snoozePresetsMinutes?: number[];

  // Optional: show overdue reminders before upcoming ones. Default: true
  showOverdueFirst?: boolean;

  // Optional: mapping to override icons per related type (URL to image/icon).
  // If provided, these will be used unless an item defines its own iconUrl.
  relatedTypeIcons?: Partial<Record<ReminderRelatedType, string>>;
}

type ReminderRelatedType = "Medication" | "Vaccine" | "Visit";

interface ReminderItem {
  id: string; // Unique ID of the reminder, e.g., "rx_heartworm_apr"
  title: string; // Display text, e.g., "Heartworm chewable"
  dueAt: number; // When it's due (ms since Unix epoch)
  relatedType: ReminderRelatedType; // What this reminder is about
  relatedId: string; // ID of the related record, e.g., medicationId or visitId
  // Optional small icon specific to this reminder (overrides relatedTypeIcons if present)
  iconUrl?: string;
  // Optional short note, e.g., dosage or location: "Give with food" or "Dr. Lee @ Paws Clinic"
  notes?: string;
}

interface HealthRecordFormProps {
  // Controls whether the form creates a new record or edits an existing one
  // Examples: "create" when adding a new vaccine; "edit" when updating a past visit
  mode: "create" | "edit";

  // Determines which minimal field set to render and validate
  // - "Visit": uses title, dateTime, optional clinicName, notes
  // - "Vaccine": uses name, dateTime, optional dosage/frequency, notes
  // - "Medication": uses name, dateTime, optional dosage/frequency, notes
  recordType: "Visit" | "Vaccine" | "Medication";

  // Pre-fill values for the form; varies by recordType
  // dateTime should be ISO 8601 (e.g., "2025-03-15T10:30:00Z")
  // For mode:"edit", id should be provided
  initialData: HealthRecordInitialData;

  // Single action channel for all interactions (save, delete, cancel)
  // - Save example:
  //   { type: "save_health_record",
  //     payload: { mode:"create", recordType:"Vaccine",
  //       data:{ title: undefined, name:"Rabies", dateTime:"2025-12-01T09:00:00Z", clinicName: undefined, dosage:"1 mL", frequency:"annually", notes:"Booster due next year", id: undefined } } }
  // - Delete example (only in edit mode):
  //   { type:"delete_health_record", payload:{ id:"rec_123" } }
  // - Cancel example:
  //   { type:"cancel_health_record" }
  onAction: HealthRecordFormAction;

  // Optional icon or image to visually represent the record or the pet
  // Example: "https://cdn.app/pets/dog-avatar.png" or a vaccine/medication icon
  iconUrl?: string;

  // Optional IANA timezone for date handling and reminder previews
  // Example: "America/Los_Angeles" (default assumed to system timezone if not set)
  timezone?: string;
}

/* Data shapes */

interface BaseHealthRecordData {
  // Unique ID for existing records (omit for create)
  id?: string;
  // ISO 8601 datetime string for the primary event (visit date, dose time, etc.)
  dateTime: string;
  // Free-text notes (symptoms, vet advice, side effects, etc.)
  notes?: string;
}

interface VisitRecordData extends BaseHealthRecordData {
  // Short label for the visit, e.g., "Annual Checkup", "Dental Cleaning"
  title: string;
  // Optional clinic or vet name, e.g., "Happy Paws Clinic"
  clinicName?: string;

  // Fields not used for visits should be omitted
  name?: never;
  dosage?: never;
  frequency?: never;
}

interface VaccineRecordData extends BaseHealthRecordData {
  // Vaccine name, e.g., "Rabies", "DHPP"
  name: string;
  // Example: "1 mL", "Small dog dose"
  dosage?: string;
  // Example: "annually", "every 3 years"
  frequency?: string;

  // Visit-only fields not used for vaccines
  title?: never;
  clinicName?: never;
}

interface MedicationRecordData extends BaseHealthRecordData {
  // Medication name, e.g., "Heartgard", "Carprofen"
  name: string;
  // Example: "25 mg", "1 tablet"
  dosage?: string;
  // Example: "daily", "every 12h", "as needed"
  frequency?: string;

  // Visit-only fields not used for medications
  title?: never;
  clinicName?: never;
}

// Union for initialData; select fields based on recordType
type HealthRecordInitialData =
  | VisitRecordData
  | VaccineRecordData
  | MedicationRecordData;

/* Action objects */

type HealthRecordFormAction =
  | {
      type: "save_health_record";
      payload: {
        // Mirrors top-level mode to clarify the intended operation
        mode: "create" | "edit";
        // Mirrors top-level recordType for downstream handling
        recordType: "Visit" | "Vaccine" | "Medication";
        // Normalized data to be saved (must match the recordType shape)
        data: HealthRecordInitialData;
      };
    }
  | {
      // Only applicable when mode === "edit"
      type: "delete_health_record";
      payload: { id: string };
    }
  | {
      // User dismissed or closed the form without saving
      type: "cancel_health_record";
    };