interface PerformanceOverviewPanelProps {
  // Overall timeframe of analytics shown in the dashboard (ISO 8601 strings).
  // Example: { start: "2025-01-01T00:00:00Z", end: "2025-02-01T00:00:00Z" }
  timeframe: { start: string; end: string };

  // Up to the last 20 posts with key performance fields for the thumbnail grid.
  posts: PostSummary[];

  // Points for the engagement vs reach scatter plot. Each point links back to a post.
  scatterPoints: EngagementPoint[];

  // Aggregated hashtag stats for the hashtag cloud.
  hashtags: HashtagStat[];

  // Ranked posting time recommendations (e.g., top 3-10 slots).
  recommendedTimes: PostingTimeRecommendation[];

  // Single action channel for user interactions within the panel.
  // Dispatches when: selecting a post, changing filters, clicking a hashtag,
  // or accepting a recommended posting time.
  onAction:
    | { type: "select_post"; payload: { postId: string } }
    | {
        type: "filter_change";
        payload: {
          platform?: "instagram" | "tiktok" | "youtube" | "twitter" | "facebook" | "linkedin";
          contentTypes?: ("photo" | "video" | "carousel" | "reel" | "short" | "story")[];
          timeframe?: { start: string; end: string };
          hashtags?: string[];
        };
      }
    | { type: "click_hashtag"; payload: { tag: string } }
    | { type: "accept_recommended_time"; payload: { weekday: number; hour: number } };

  // Optional: primary platform context for labels/legend defaults.
  platform?: "instagram" | "tiktok" | "youtube" | "twitter" | "facebook" | "linkedin";

  // Optional: initial filter presets applied on first render.
  defaultFilters?: {
    contentTypes?: ("photo" | "video" | "carousel" | "reel" | "short" | "story")[];
    hashtags?: string[];
  };
}

interface PostSummary {
  // Unique identifier from the source platform.
  id: string;
  // Thumbnail image used in the grid.
  thumbnailUrl: string;
  // Content format/type for filter chips and badges.
  contentType: "photo" | "video" | "carousel" | "reel" | "short" | "story";
  // ISO timestamp for when the post was published.
  postedAt: string;
  // Total reach/impressions.
  reach: number;
  // Engagement rate as a decimal (e.g., 0.0625 for 6.25%).
  engagementRate: number;
  // Optional badge for quick performance labeling in the grid.
  // Example usage: "top_performer" for top 10%, "above_avg" for upper quartile, etc.
  badge?: "top_performer" | "above_avg" | "needs_improvement";
}

interface EngagementPoint {
  // Ties the point back to a specific post.
  postId: string;
  // X-axis value: reach/impressions.
  reach: number;
  // Y-axis value: engagement metric (count or rate normalized to a number).
  // If using rate, keep consistent with other views (e.g., 0.08 for 8%).
  engagement: number;
}

interface HashtagStat {
  // Hashtag text without the leading '#'.
  tag: string;
  // Number of posts in the timeframe using this hashtag.
  count: number;
  // Average engagement metric for posts using this hashtag.
  avgEngagement: number;
}

interface PostingTimeRecommendation {
  // 0 = Sunday, 6 = Saturday. Use local timezone of the account unless noted.
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  // Hour in 24h format (0-23).
  hour: number;
  // Relative score (0-1 or any normalized scale) indicating expected performance.
  // Higher is better.
  score: number;
}

interface StyleInsightsSummaryProps {
  // Unique identifier for this summary (e.g., analytics run or card id)
  id: string;

  // Short heading displayed on the card
  // Example: "Best Performing Content Style"
  title: string;

  // The winning style to highlight
  topStyle: {
    name: string; // Example: "Behind-the-Scenes Reels"
    description?: string; // Brief rationale or what defines the style
    imageUrl?: string; // Optional icon/thumbnail to represent the style
  };

  // Core KPIs summarizing why this style performs best
  // Percentages should be provided as 0–100 (not 0–1)
  keyMetrics: {
    avgEngagementRate: number; // Example: 7.3 (meaning 7.3%)
    avgReach: number; // Absolute average reach per post, e.g., 15420
    saveRate?: number; // Example: 2.1 (2.1%)
    clickThru?: number; // Example: 1.4 (1.4% CTR)
  };

  // Confidence of the conclusion that this is the top style
  // 0–1 where 1 is highest confidence
  confidenceScore: number;

  // A small set of representative posts for thumbnails or quick drill-in
  // Provide platform-specific IDs or internal post IDs
  // Example: ["ig_123", "ig_456", "ig_789"]
  representativePostIds: string[];

  // Optional label for data scope shown near the title
  // Example: "Last 20 posts"
  timeRangeLabel?: string;

  // Single action object used when a representative post is clicked
  // The component will populate postId with the clicked representativePostIds[] value
  onOpenPostAction: {
    type: "open_post_details";
    postId: string; // Should be one of representativePostIds
  };
}

interface PostDetailDrawerProps {
  // Unique identifier for the post to deep-dive into
  // Example: "ig_17895695668004550"
  postId: string;

  // Media asset used for the drawer header/preview.
  // Can be a static image URL or a thumbnail for videos/carousels.
  // Example: "https://cdn.example.com/posts/17895695668004550_thumb.jpg"
  mediaUrl: string;

  // Short excerpt of the caption to preview in the drawer.
  // Full caption can be revealed via an action.
  // Example: "Behind-the-scenes from our latest shoot..."
  captionSnippet: string;

  // Time the post was published, ISO 8601 string.
  // Example: "2025-09-12T14:30:00Z"
  postedAt: string;

  // Core performance metrics for the post
  metrics: {
    reach: number;            // Unique accounts reached (e.g., 15432)
    impressions: number;      // Total impressions (e.g., 20105)
    likes: number;            // Reactions/hearts (e.g., 823)
    comments: number;         // Comment count (e.g., 57)
    saves: number;            // Saves/bookmarks (e.g., 112)
    shares: number;           // Shares/reposts (e.g., 31)
    engagementRate: number;   // 0-1 fraction or percentage basis; UI decides (e.g., 0.0721 for 7.21%)
    outboundClicks?: number;  // Optional: link clicks from the post (e.g., 45)
  };

  // Hashtags associated with the post, used for copy and hashtag cloud.
  // Examples: ["#behindthescenes", "#studio", "#lighting"]
  hashtags: string[];

  // High-level content type for display context
  // Examples: "image", "video", "carousel", "reel", "story"
  contentType: "image" | "video" | "carousel" | "reel" | "story";

  // Single action dispatcher for all interactions within the drawer.
  // Implementers can route on "type" to handle user intents like close, next/prev, open caption, copy hashtags,
  // and hover-to-view mini time-series.
  action: PostDetailDrawerAction;

  // Optional: lightweight time-series used for the hover mini-chart
  // If omitted, the drawer can fetch lazily or disable hover chart.
  // Example metric: "engagement" over time in ISO timestamps.
  timeSeriesMini?: {
    metric: "engagement" | "reach" | "impressions";
    points: Array<{ t: string; value: number }>; // t in ISO 8601; value is numeric metric
  };

  // Optional: locale for number/date formatting (defaults to environment)
  // Example: "en-US"
  locale?: string;
}

/* Action object union for all drawer interactions */
type PostDetailDrawerAction =
  // Close the drawer
  | { type: "close_drawer"; payload: { postId: string } }

  // Navigate between posts visible in the parent grid/list
  | { type: "navigate_post"; payload: { currentPostId: string; direction: "prev" | "next" } }

  // Reveal full caption text
  | { type: "open_full_caption"; payload: { postId: string } }

  // Copy post hashtags to clipboard
  | { type: "copy_hashtags"; payload: { postId: string; hashtags: string[] } }

  // User hovered/inspected mini time-series for a metric
  | { type: "hover_timeseries"; payload: { postId: string; metric: "engagement" | "reach" | "impressions" } }

  // Optional: jump to a specific post from within the drawer (e.g., via related content)
  | { type: "select_post"; payload: { postId: string } };

type Platform = "instagram" | "tiktok" | "x" | "youtube" | "facebook";

type ContentType =
  | "photo"
  | "video"
  | "reel"
  | "story"
  | "carousel"
  | "short"
  | "live";

/**
 * Timeframe can be a preset or a custom ISO date range.
 * Examples:
 * - { preset: "30d" }
 * - { customRange: { startISO: "2025-01-01", endISO: "2025-01-31" } }
 */
type Timeframe =
  | { preset: "7d" | "14d" | "30d" | "90d" | "YTD" | "ALL" }
  | { customRange: { startISO: string; endISO: string } };

type SortBy = "engagementRate" | "reach";

/**
 * Normalized filter state emitted by the component.
 * - contentTypes: if omitted or empty array, treat as "any"
 * - hashtags.include/exclude: case-insensitive, values without the '#' prefix are allowed
 */
interface FiltersState {
  platform: Platform;
  timeframe: Timeframe;
  contentTypes?: ContentType[]; // e.g., ["reel", "photo"]
  hashtags?: {
    include?: string[]; // e.g., ["fitness", "workout"]
    exclude?: string[]; // e.g., ["ad", "sponsored"]
  };
  sortBy?: SortBy; // Default behavior may be "engagementRate"
}

/**
 * Single action channel for all interactions from the FiltersBar.
 * - update_filters: emitted on any change with full normalized FiltersState
 * - clear_all: emitted when user clears all filters
 * - save_default: emitted when user saves current filters as default
 */
type FiltersAction =
  | { type: "update_filters"; payload: FiltersState }
  | { type: "clear_all" }
  | { type: "save_default"; payload: FiltersState };

interface FiltersBarProps {
  id: string; // Unique identifier for telemetry and state scoping
  title: string; // Display label, e.g., "Refine analysis"

  platform: Platform; // Current platform selection, e.g., "instagram"
  timeframe: Timeframe; // Preset or custom range

  contentTypes?: ContentType[]; // Multi-select; omit or [] for "any"
  hashtags?: {
    // Hashtag filters (values may be provided with or without '#')
    include?: string[]; // Posts must include at least one of these
    exclude?: string[]; // Posts must not include any of these
  };

  sortBy?: SortBy; // "engagementRate" | "reach"

  onFiltersAction: FiltersAction; // Action object describing the interaction to dispatch
}

type ExportFormat = "PNG" | "CSV" | "PDF";
type AnalysisSection = "overview" | "styles" | "hashtags" | "scatter";

/**
 * Discriminated action describing a user intent from the Export/Share control.
 * Only one action is emitted/handled at a time.
 */
type ExportShareAction =
  | {
      type: "export_analysis";
      payload: {
        // e.g., "analysis-2025-03-01"
        filename: string;
        // File format to export; PNG for visuals, CSV/PDF for data/reports
        format: ExportFormat;
        // If omitted, use the provided includeSections from props
        includeSections?: AnalysisSection[];
        // If omitted, use the provided includeRawData from props
        includeRawData?: boolean;
      };
    }
  | {
      type: "copy_share_link";
      payload: {
        // Fully-resolved URL to share the current analysis view
        url: string; // e.g., "https://app.example.com/a/abc123?view=performance"
        // Optional ISO timestamp when the link expires
        expiresAtISO?: string; // e.g., "2025-11-19T18:30:00Z"
      };
    }
  | {
      type: "schedule_email_report";
      payload: {
        // Recipient emails for the scheduled report
        to: string[]; // e.g., ["analytics@brand.com", "me@domain.com"]
        // ISO timestamp for when to send
        sendAtISO: string; // e.g., "2025-11-20T14:00:00Z"
        // Email-friendly formats
        format: "PDF" | "CSV";
        // If omitted, use the provided includeSections from props
        includeSections?: AnalysisSection[];
        // If omitted, use the provided includeRawData from props
        includeRawData?: boolean;
      };
    };

/**
 * Props for the ExportShareActions component in the Social Media Content Performance Analyzer.
 * Focus: simple controls to export or share the current analysis.
 */
interface ExportShareActionsProps {
  // Unique identifier for this instance (useful for analytics/telemetry)
  id: string;

  // Short label shown beside action controls
  title: string; // e.g., "Export & Share Analysis"

  // Base filename used for exports (suffix/extension applied automatically)
  filenameBase: string; // e.g., "last-20-posts-analysis"

  // Which export formats to offer in the UI
  availableFormats: ExportFormat[]; // e.g., ["PNG", "CSV", "PDF"]

  // Which analysis sections are eligible for inclusion in exports/reports
  includeSections: AnalysisSection[]; // e.g., ["overview", "styles", "hashtags", "scatter"]

  // Include raw data table alongside visuals when supported (default: false)
  includeRawData?: boolean;

  // Optional icon shown next to the title (brand/app icon or share/export glyph)
  iconUrl?: string; // e.g., "https://cdn.example.com/icons/share-export.svg"

  // Single action object representing the user's chosen export/share operation
  action: ExportShareAction;
}