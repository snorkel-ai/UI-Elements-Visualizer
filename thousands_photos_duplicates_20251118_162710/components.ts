interface SimilarPhotoClustersPanelProps {
  // Clusters of visually similar photos to review in bulk.
  // Example:
  // [
  //   {
  //     id: "c_001",
  //     representativeThumbnailUrl: "https://cdn.example.com/t/abc123.jpg",
  //     photoIds: ["p1","p2","p3"],
  //     type: "duplicate",
  //     selected: true,
  //     totalBytes: 5242880 // 5 MB across the cluster
  //   }
  // ]
  clusters: SimilarPhotoCluster[];

  // Aggregate summary for overview cards and savings preview.
  // totalBytes: total size across all photos in the clusters
  // potentialSavingsBytes: estimated bytes reclaimable if duplicates are removed or items are archived
  // counts: number of clusters by category for quick filtering badges
  summary: {
    totalBytes: number;
    potentialSavingsBytes: number;
    counts: {
      duplicate: number;
      nearDuplicate: number;
      series: number;
    };
  };

  // Initial or current selection mode for bulk tools.
  // "all": operate on all clusters user selected
  // "duplicates_only": restrict bulk select to clusters flagged as duplicates
  // Default: "all"
  selectionMode?: "all" | "duplicates_only";

  // Preferred default bulk action when user confirms.
  // "archive": move selected photos to archive
  // "delete": permanently remove (typically after confirmation)
  // "review": open a detailed review flow before applying changes
  // Default: "review"
  defaultBulkAction?: "archive" | "delete" | "review";

  // Single high-level action descriptor the component dispatches when user applies changes.
  // The component will populate payload fields at runtime based on the current UI state.
  // Example dispatched payload:
  // {
  //   type: "apply_photo_cleanup",
  //   payload: {
  //     selectedClusterIds: ["c_001","c_004"],
  //     bulkAction: "archive",
  //     selectionMode: "duplicates_only"
  //   }
  // }
  onApplyAction: {
    type: "apply_photo_cleanup";
    payload: {
      selectedClusterIds: string[];
      bulkAction: "archive" | "delete" | "review";
      selectionMode: "all" | "duplicates_only";
    };
  };

  // Optional display config.
  // showSavingsSummary: toggle the top savings cards (Default: true)
  // thumbnailSize: visual density control for cluster thumbnails (Default: "m")
  showSavingsSummary?: boolean;
  thumbnailSize?: "s" | "m" | "l";
}

// A single cluster of similar or duplicate photos.
interface SimilarPhotoCluster {
  // Unique cluster identifier
  id: string;

  // URL for a representative thumbnail (fast-loading, small image)
  representativeThumbnailUrl: string;

  // IDs of all photos in the cluster (order not guaranteed)
  photoIds: string[];

  // Category of similarity
  // duplicate: exact or near-exact duplicates
  // nearDuplicate: similar shots with minor variations (exposure, crop)
  // series: burst or series shots intended to be grouped
  type: "duplicate" | "nearDuplicate" | "series";

  // Whether the cluster is currently selected for bulk operations
  selected: boolean;

  // Optional total byte size for this cluster (sum of photo sizes)
  totalBytes?: number;
}

interface PhotoClusterCardProps {
  // Unique identifier for this cluster (e.g., "cluster_9f3a2")
  clusterId: string;

  // How the cluster was formed:
  // - "duplicate" => exact file duplicates
  // - "nearDuplicate" => visually similar images (slight edits, crops)
  // - "series" => burst/sequence shots taken close in time
  clusterType: "duplicate" | "nearDuplicate" | "series";

  // The photoId the assistant suggests to keep as the “best” representative of this cluster
  // Example: "photo_12345"
  suggestedKeepPhotoId: string;

  // Thumbnails for each photo in the cluster
  // Provide original size for savings estimates and selection state for bulk operations
  // Example item:
  // {
  //   photoId: "photo_12345",
  //   thumbnailUrl: "https://cdn.example.com/thumbs/12345.jpg",
  //   sizeBytes: 3249876,
  //   selected: false,
  //   duplicateBadge?: true // shows a "duplicate" badge when clusterType is "duplicate"
  // }
  items: {
    photoId: string;
    thumbnailUrl: string; // small/fast image URL used in the strip/grid
    sizeBytes: number; // original file size in bytes for savings calculations
    selected: boolean; // current selection state in this cluster
    // Shows a duplicate indicator on the item (useful when mixing types or confirming exact matches)
    // Default: inferred from clusterType, but can be provided for clarity
    duplicateBadge?: boolean;
  }[];

  // Primary action for this card: bulk-select all items except the suggested keep
  // Dispatch this when the user taps the bulk-select button.
  // Example:
  // {
  //   type: "select_all_but_best",
  //   payload: { clusterId: "cluster_9f3a2", keepPhotoId: "photo_12345" }
  // }
  onBulkSelectAction: {
    type: "select_all_but_best";
    payload: { clusterId: string; keepPhotoId: string };
  };

  // Optional: total bytes that would be saved if all non-keep items are removed
  // Example: 15834987 (≈15.1 MB)
  summarySavingsBytes?: number;

  // Optional: limit of thumbnails to show when collapsed (expand can be handled externally)
  // Default suggestion: 8
  maxVisible?: number;
}

interface StorageSavingsSummaryCardProps {
  // Unique identifier for this card instance (e.g., "savings-summary-1")
  id: string;

  // Short heading for the card (e.g., "Potential Savings")
  title: string;

  // Total bytes that could be recovered if user removes duplicates and archives candidates.
  // Example: 5368709120 for ~5 GB
  bytesRecoverable: number;

  // Bytes currently selected for cleanup (subset of bytesRecoverable). Optional.
  // Example: 2147483648 for ~2 GB selected
  selectedBytes?: number;

  // Breakdown of item counts contributing to savings.
  // - duplicate: exact duplicates identified
  // - nearDuplicate: visually similar photos identified
  // - archiveCandidates: low-value photos (blurry, screenshots, receipts, etc.) suggested for archiving
  counts: {
    duplicate: number;
    nearDuplicate: number;
    archiveCandidates: number;
  };

  // Label for the primary call-to-action button (e.g., "Apply Cleanup", "Free Up Space")
  ctaLabel: string;

  // Optional icon or illustration to visually reinforce the concept of storage savings.
  // Example: "/assets/icons/storage-savings.png"
  imageUrl?: string;

  // Action objects describing the interactions supported by this card.
  // Use these objects to dispatch or route events in your app (no function callbacks).
  actions: {
    // Apply the currently selected cleanup operations (removing duplicates, archiving).
    // Dispatch when the primary CTA is clicked.
    applyCleanup: {
      type: "apply_selected_cleanup";
      payload: { cardId: string };
    };

    // Optional: View a detailed breakdown of where savings come from.
    // Useful to navigate to a modal or details view.
    viewBreakdown?: {
      type: "view_savings_breakdown";
      payload: { cardId: string };
    };

    // Optional: Undo the most recent cleanup action applied via this card.
    // Only include if an undo is available in your app state.
    undoLast?: {
      type: "undo_last_cleanup";
      payload: { cardId: string; lastActionId?: string };
    };
  };
}

// Domain: Digital Photo Cleanup Assistant
// Component: Sticky toolbar for bulk operations and filters across the photo grid.
// Notes:
// - Use action objects (no function callbacks).
// - Keep only essential config: identity, key display fields, one actions entry, minimal optional props.
// - No visual style props like "className" or "open".
// - Comments include examples and guidance.

// Filters used in this assistant.
// Examples: "duplicates" shows exact dupes; "nearDuplicates" shows visually similar shots; "archivable" shows low-value shots.
type ReviewFilter = "all" | "duplicates" | "nearDuplicates" | "series" | "archivable";

// Sort modes across the grid.
// "similarity" is typically used when reviewing clusters/near-duplicates.
type ReviewSort = "date" | "size" | "similarity";

// Declarative action objects the toolbar can emit when a control is activated.
// Include only the actions your app supports in the actions[] array on props.
// enabled=false will render the control disabled (e.g., delete when nothing is selected).
type ReviewToolbarAction =
  | { type: "select_all_visible"; enabled?: boolean; label?: string } // e.g., "Select all (page)"
  | { type: "clear_selection"; enabled?: boolean; label?: string }
  | { type: "delete_selected"; enabled?: boolean; label?: string; confirm?: boolean } // confirm=true to require confirmation
  | { type: "move_to_archive"; enabled?: boolean; label?: string }
  | { type: "mark_not_duplicate"; enabled?: boolean; label?: string }
  | { type: "set_filter"; filter: ReviewFilter; enabled?: boolean; label?: string }
  | { type: "set_sort"; sort: ReviewSort; order?: "asc" | "desc"; enabled?: boolean; label?: string };

interface ReviewToolbarProps {
  // Stable identifier for this toolbar instance (useful for analytics or state keys).
  id: string;

  // Title shown in the sticky bar. Example: "Review duplicates" or "Photo cleanup".
  title: string;

  // Live selection state used to enable/disable bulk actions and to display context.
  // Example: selectedCount=128, selectedBytes=534_000_000 (~509 MB)
  selectedCount: number;
  selectedBytes: number; // total bytes of selected items; 0 when none selected

  // Current grid scope and ordering.
  // Examples: filter="nearDuplicates", sort="similarity", sortOrder="desc"
  filter: ReviewFilter;
  sort: ReviewSort;
  sortOrder?: "asc" | "desc"; // Default may vary by sort (e.g., date="desc")

  // Available toolbar controls as declarative action objects.
  // Provide one entry per control you want rendered (e.g., select all, clear, delete, archive, mark-not-duplicate, set filter/sort).
  // The component will render these in a sensible order and emit the object when activated.
  // Example:
  // actions: [
  //   { type: "select_all_visible", label: "Select all (visible)" },
  //   { type: "clear_selection", enabled: true },
  //   { type: "delete_selected", enabled: selectedCount > 0, confirm: true, label: "Delete" },
  //   { type: "move_to_archive", enabled: selectedCount > 0, label: "Archive" },
  //   { type: "mark_not_duplicate", enabled: selectedCount > 0, label: "Not a duplicate" },
  //   { type: "set_filter", filter: "duplicates", label: "Duplicates" },
  //   { type: "set_sort", sort: "similarity", order: "desc", label: "Sort by similarity" }
  // ]
  actions: ReviewToolbarAction[];

  // Optional small icon for the toolbar (e.g., a review/check icon).
  // Example: "https://cdn.example.com/icons/review.png"
  iconUrl?: string;

  // Optional flag to show potential space savings for current selection/scope.
  // When provided, the toolbar may display "Potential savings: 1.2 GB".
  potentialSavingsBytes?: number;
}

interface CompareAndResolveModalProps {
  // Unique identifier for the duplicate/near-duplicate cluster being resolved
  clusterId: string;

  // 2+ photos to compare side-by-side.
  // Keep the array order stable; UI may use it to paginate or layout pairs.
  photos: ComparePhotoItem[];

  // Optional: system suggestion for which photo to keep (e.g., based on sharpness/date/resolution).
  // Example: "photo_123"
  suggestedKeepId?: string;

  // Optional: current user selection for the photo to keep (pre-seeded from prior steps, if any).
  // When set, the UI highlights this photo initially.
  currentKeepId?: string;

  // Optional: estimated bytes saved if the current selection is applied to the entire cluster.
  // Example: 104857600 for 100 MB
  storageSavingsBytes?: number;

  // Single action object to be dispatched when the user confirms their decision.
  // The UI will populate keepIds/deleteIds (and applyToAll) based on the user's final choices.
  // Example payload at dispatch time:
  // {
  //   type: "resolve_duplicates",
  //   payload: {
  //     clusterId: "cluster_42",
  //     keepIds: ["photo_123"],
  //     deleteIds: ["photo_456", "photo_789"],
  //     applyToAll: true
  //   }
  // }
  resolveAction: {
    type: "resolve_duplicates";
    payload: {
      clusterId: string;
      // IDs chosen to keep. Typically one per duplicate set; may be >1 for sub-groups.
      keepIds: string[];
      // IDs chosen to delete from the cluster.
      deleteIds: string[];
      // If true, apply this decision pattern to all similar sets within the cluster.
      applyToAll?: boolean;
    };
  };

  // Optional: initial zoom level for the compare view (1 = fit, 2 = 2x, etc.). Default: 1
  defaultZoom?: number;

  // Optional: whether metadata overlays (resolution, size, date, sharpness) are shown by default. Default: true
  showMetadataOverlayByDefault?: boolean;
}

interface ComparePhotoItem {
  // Unique photo identifier
  id: string;

  // Image source URL. Prefer a reasonably large preview suitable for zooming.
  // Example: "https://cdn.example.com/photos/abc123_2048.jpg"
  src: string;

  // Pixel dimensions of the source
  resolution: {
    width: number;  // Example: 4032
    height: number; // Example: 3024
  };

  // File size in bytes
  sizeBytes: number; // Example: 5242880 for ~5 MB

  // Original capture time in ISO 8601 format
  capturedAt: string; // Example: "2021-07-04T14:23:11Z"

  // 0.0–1.0 where higher indicates sharper image (edge clarity/contrast)
  sharpnessScore: number;

  // Optional badge to inform the user why this photo is in the set
  // "exact" = byte-identical duplicate, "near-duplicate" = visually similar, "burst" = same moment series
  duplicateBadge?: "exact" | "near-duplicate" | "burst";
}

interface ScanProgressBannerProps {
  status: "idle" | "scanning" | "analyzing" | "complete" | "error"; 
  // Current scan phase. Examples:
  // - "idle" (not started)
  // - "scanning" (reading files, hashing)
  // - "analyzing" (clustering, duplicate detection)
  // - "complete" (finished successfully)
  // - "error" (something failed)

  progressPercent?: number; 
  // Overall progress, 0–100. Example: 42 for 42%. If omitted, component may infer from counts or show an indeterminate bar.

  scannedCount?: number; 
  // Number of photos processed so far. Example: 3500

  totalCount?: number; 
  // Total photos expected to scan. Example: 12000

  primaryAction?: { 
    type: "pause_scan" | "resume_scan" | "cancel_scan" | "retry_scan" | "view_logs"; 
  };
  // Optional action object representing the main button shown by the banner, chosen based on status:
  // - When "scanning" or "analyzing": { type: "pause_scan" } or { type: "cancel_scan" }
  // - When "idle": { type: "resume_scan" }
  // - When "error": { type: "retry_scan" } or { type: "view_logs" }
  // - When "complete": { type: "view_logs" }
}