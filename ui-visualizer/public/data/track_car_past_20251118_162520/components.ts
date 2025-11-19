// Top-level props for the Car Maintenance Timeline overview.
// Notes:
// - Use action objects (no callbacks). The component will dispatch actions derived
//   from `onAction` to signal user interactions (e.g., add service, view details).
// - Keep inputs minimal and high-level. Provide only the data needed to render
//   the overview and compute next-service predictions.

interface MaintenanceOverviewProps {
  // Unique vehicle identifier used to scope data and actions.
  // Example: "veh_12345"
  vehicleId: string;

  // Current odometer reading for the vehicle. Used for mileage-based predictions.
  // Example: 45210
  currentOdometer: number;

  // Timeline of completed services (sorted newest -> oldest is recommended, but not required).
  serviceHistory: ServiceEntry[];

  // Rules used to predict upcoming services based on mileage and/or time.
  upcomingServiceRules: ServiceRule[];

  // Checklist of maintenance tasks with urgency tags.
  checklistItems: MaintenanceChecklistItem[];

  // Single action object used as the interaction "channel".
  // The component will emit derived actions of the following union:
  // - { type: "add_service"; payload: { vehicleId: string } }
  // - { type: "view_service_details"; payload: { vehicleId: string; serviceId: string } }
  // - { type: "toggle_checklist_item"; payload: { vehicleId: string; checklistItemId: string; done: boolean } }
  // Provide vehicleId here so emitted actions can inherit routing context.
  onAction: { type: "maintenance_overview"; vehicleId: string };

  // Optional display/config
  // Units for distance values. Default: "miles"
  units?: "miles" | "km";

  // Optional human-friendly label for the vehicle (shown in headers).
  // Example: "2018 Honda Civic EX"
  vehicleLabel?: string;
}

// Completed service shown in the timeline.
interface ServiceEntry {
  // Unique id for this service record.
  id: string;

  // Human-friendly title of the service.
  // Example: "Oil Change", "Brake Pad Replacement"
  title: string;

  // ISO date string when the service was completed.
  // Example: "2024-08-15"
  date: string;

  // Odometer reading at the time of service.
  // Example: 44120
  odometer: number;

  // Optional short description of what was done or any notes.
  // Example: "Replaced synthetic oil and filter"
  notes?: string;

  // Optional urgency tag based on findings (if any).
  // Example: "medium"
  urgencyTag?: "low" | "medium" | "high";
}

// Rule describing when a service is due next.
interface ServiceRule {
  // Unique id for the rule.
  id: string;

  // Name of the service the rule applies to.
  // Example: "Oil Change"
  serviceName: string;

  // Mileage interval after which the service should be repeated.
  // Example: 5000 (miles or km depending on `units`)
  intervalDistance?: number;

  // Time interval (months) after which the service should be repeated.
  // Example: 6 (months)
  intervalMonths?: number;

  // Optional last-known completion references to help the component compute next due.
  lastServiceOdometer?: number; // Example: 40000
  lastServiceDate?: string;     // ISO date, Example: "2024-05-01"
}

// Checklist items with urgency and completion state.
interface MaintenanceChecklistItem {
  // Unique id for the checklist item.
  id: string;

  // Display label.
  // Example: "Check tire pressure", "Inspect wiper blades"
  label: string;

  // Completion state.
  done: boolean;

  // Urgency indicator for prioritization.
  urgency: "low" | "medium" | "high";
}

interface ServiceTimelineProps {
  // Primary list of completed services shown in the vertical timeline
  // Example item: { id: "svc_102", date: "2024-11-05", odometer: 45672, type: "oil_change", summary: "Full synthetic + filter", cost: 89.99, attachmentsCount: 1, urgency: "low" }
  items: ServiceItem[];

  // Optional predictions for upcoming services; typically mileage-based, time-based, or both
  // Example: { id: "pred_12", serviceType: "tire_rotation", basedOn: "mileage", dueAtOdometer: 60000, urgency: "medium" }
  predictions?: ServicePrediction[];

  // Optional maintenance checklist items the user can tick off
  // Example: { id: "chk_7", label: "Replace cabin air filter", status: "todo", relatedServiceId: "svc_099" }
  checklist?: MaintenanceChecklistItem[];

  // Distance unit used in the UI (applies to odometer and predictions)
  // "mi" for miles (default in US), "km" for kilometers
  unit: "mi" | "km";

  // Currency code for displaying costs (ISO 4217). Example: "USD", "EUR"
  currency?: string;

  // If provided, the timeline will initially expand this service item to show details
  defaultExpandedItemId?: string;

  // User selects a timeline item; component will inject { itemId }
  // Final dispatched shape: { type: "select_item", itemId: string }
  selectItemAction?: { type: "select_item" };

  // User expands/collapses a timeline item; component will inject { itemId, expanded }
  // Final dispatched shape: { type: "expand_item", itemId: string, expanded: boolean }
  expandItemAction?: { type: "expand_item" };

  // User opens an attachment/receipt from an item; component will inject { itemId, attachmentId }
  // Final dispatched shape: { type: "open_attachment", itemId: string, attachmentId: string }
  openAttachmentAction?: { type: "open_attachment" };

  // User taps a button to add a new service entry
  // Final dispatched shape: { type: "add_service" }
  addServiceAction: { type: "add_service" };

  // User chooses to schedule a predicted service; component will inject { predictionId } or { serviceType }
  // Final dispatched shape: { type: "schedule_service", predictionId?: string, serviceType?: string }
  scheduleServiceAction?: { type: "schedule_service" };

  // User updates a checklist item status; component will inject { checklistItemId, status }
  // Final dispatched shape: { type: "update_checklist_item", checklistItemId: string, status: "done" | "todo" | "overdue" }
  markChecklistAction?: { type: "update_checklist_item" };
}

// DOMAIN TYPES

// A completed maintenance record shown on the timeline
interface ServiceItem {
  id: string; // unique ID for the service record
  date: string; // ISO date string, e.g., "2025-03-14"
  odometer: number; // reading at service time, in the 'unit' provided in props
  type: string; // e.g., "oil_change", "tire_rotation", "brake_service"
  summary: string; // brief description for quick scan
  cost?: number; // cost in 'currency' (if provided)
  attachmentsCount?: number; // how many receipts/photos are linked
  receiptThumbnailUrl?: string; // small preview for the latest/primary receipt
  urgency?: UrgencyTag; // "low" | "medium" | "high" to highlight critical or notable services
  notes?: string; // optional longer notes; shown when expanded
}

// A prediction for the next service due (mileage and/or date based)
interface ServicePrediction {
  id: string; // unique ID for the prediction
  serviceType: string; // e.g., "oil_change"
  basedOn: "mileage" | "time" | "both";
  dueAtOdometer?: number; // when the next service is expected by mileage
  dueByDate?: string; // ISO date string, e.g., "2026-01-01"
  urgency: UrgencyTag; // indicates how soon the user should act
  notes?: string; // optional rationale, e.g., "Avg 1,000 mi/month → due in ~2 months"
}

// A checklist item the user can track alongside the timeline
interface MaintenanceChecklistItem {
  id: string;
  label: string; // e.g., "Replace cabin air filter"
  status: "done" | "todo" | "overdue";
  relatedServiceId?: string; // optional link to a completed service
  urgency?: UrgencyTag; // optional urgency to reflect priority
}

type UrgencyTag = "low" | "medium" | "high";

interface NextServiceCardProps {
  id: string; // Unique identifier for this card (e.g., "svc_1234")
  serviceType: string; // Human-readable service name (e.g., "Oil Change", "Tire Rotation")
  dueMileage?: number; // Next due odometer reading (e.g., 45000). Provide either dueMileage or dueDate (or both)
  dueDate?: string; // ISO date string when service is due (e.g., "2026-03-15"). Provide either dueMileage or dueDate (or both)
  currentOdometer: number; // Current vehicle odometer reading (e.g., 42150)
  urgency: "low" | "medium" | "high"; // Urgency tag derived from proximity to due date/mileage
  reason?: string; // Brief explanation of why this is predicted (e.g., "Based on last oil change at 38,000 mi on 2024-05-10")

  // Single action object used when the user interacts with the card.
  // The component will dispatch one of these action shapes depending on the button pressed:
  // - schedule_service: when user taps "Schedule"
  // - snooze_service: when user taps "Snooze"
  // Example dispatch (schedule): { type: "schedule_service", payload: { cardId: "svc_1234", serviceType: "Oil Change", targetMileage: 45000 } }
  // Example dispatch (snooze): { type: "snooze_service", payload: { cardId: "svc_1234", days: 14 } }
  onUserAction:
    | {
        type: "schedule_service";
        payload: {
          cardId: string; // Should match id
          serviceType: string; // Should match serviceType
          targetDate?: string; // Optional ISO date override if scheduling by date
          targetMileage?: number; // Optional mileage override if scheduling by mileage
        };
      }
    | {
        type: "snooze_service";
        payload: {
          cardId: string; // Should match id
          days: number; // Number of days to snooze the reminder (e.g., 7, 14, 30)
        };
      };
}

interface MaintenanceChecklistProps {
  // List of maintenance tasks the user can track and mark as done
  items: MaintenanceChecklistItem[];

  // Current vehicle odometer reading, used to compute mileage-based due status
  // Example: 48210
  currentMileage?: number;

  // Single action channel for all interactions in the checklist
  // The component will dispatch one of the action shapes below when the user interacts
  // Examples:
  // { type: "toggle_done", payload: { itemId: "wipers" } }
  // { type: "edit_item", payload: { itemId: "coolant" } }
  // { type: "set_intervals", payload: { itemId: "air_filter", intervalMiles: 12000, intervalMonths: 12 } }
  onItemAction: MaintenanceChecklistAction;

  // Optional: how to order items in the list
  // "dueSoon" considers mileage/month intervals vs lastDoneDate + currentMileage
  sortBy?: "urgency" | "dueSoon" | "alphabetical";

  // Optional: show colored urgency tags next to each item (low, medium, high)
  // Default: true
  showUrgencyTags?: boolean;
}

interface MaintenanceChecklistItem {
  // Unique ID for the task
  id: string;

  // Display label for the task
  // Examples: "Windshield wipers", "Brake fluid", "Cabin air filter"
  label: string;

  // ISO date string of when the task was last completed
  // Example: "2025-03-15"
  lastDoneDate: string;

  // Optional mileage interval after which the task is due again
  // Example: 6000 (miles)
  intervalMiles?: number;

  // Optional time interval after which the task is due again
  // Example: 6 (months)
  intervalMonths?: number;

  // Current completion state in the checklist
  status: "pending" | "done";

  // Visual urgency tag to hint priority
  urgency: "low" | "medium" | "high";

  // Optional small icon or image for the item
  // Example: "/icons/wipers.svg"
  iconUrl?: string;

  // Optional short note shown in details or row subtitle
  // Example: "Streaking on driver side"
  note?: string;
}

type MaintenanceChecklistAction =
  | {
      type: "toggle_done";
      payload: {
        itemId: string;
      };
    }
  | {
      type: "edit_item";
      payload: {
        itemId: string;
      };
    }
  | {
      type: "set_intervals";
      payload: {
        itemId: string;
        intervalMiles?: number;
        intervalMonths?: number;
      };
    };

interface ServiceEntryTypeOption {
  id: string; // e.g., "oil_change", "tire_rotation"
  label: string; // e.g., "Oil Change"
  iconUrl?: string; // optional icon used in the select list
}

interface AttachmentRef {
  id: string; // stable id for an attachment (could be a client-generated UUID)
  name: string; // filename or display name
  url?: string; // optional URL if referencing an existing file
}

interface ServiceEntryInitialValues {
  date?: string; // ISO 8601 date, e.g., "2024-10-05"
  odometer?: number; // numeric value in the unit specified by odometerUnit
  serviceType?: string; // must match an availableServiceTypes.id
  notes?: string; // free-form text
  cost?: number; // major currency units, e.g., 89.99
  attachments?: AttachmentRef[]; // optional pre-attached files
}

/*
Emitted submit payload (for reference):
{
  vehicleId: string;
  date: string; // ISO date
  odometer: number; // in selected unit
  serviceType: string; // one of availableServiceTypes.id
  notes?: string;
  cost?: number; // major currency units
  attachments?: AttachmentRef[];
}
*/

interface ServiceEntryFormProps {
  vehicleId: string; // required: the vehicle being updated
  title?: string; // e.g., "Add Past Service" or "Log Maintenance"

  // Options for the "Service Type" select input
  availableServiceTypes: ServiceEntryTypeOption[];

  // Pre-fill form fields when editing or quick-adding
  initialValues?: ServiceEntryInitialValues;

  // Actions (component will dispatch on interaction)
  // onSubmitAction will be dispatched with a payload shaped like the "Emitted submit payload" above.
  onSubmitAction: { type: "submit_service_entry" };
  onCancelAction?: { type: "cancel_service_entry" };

  // Optional configuration
  odometerUnit?: "mi" | "km"; // Default: "mi"
  currencyCode?: string; // ISO 4217 code, Default: "USD"
}