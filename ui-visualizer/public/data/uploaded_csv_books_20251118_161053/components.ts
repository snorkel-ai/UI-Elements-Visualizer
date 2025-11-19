interface ReadingInsightsOverviewProps {
  // Unique identifier for this dashboard instance (e.g., "reading-insights-2025-q1")
  id: string;

  // Display title for the dashboard (e.g., "Reading Insights: Last 3 Years")
  title: string;

  // Donut chart data: distribution of books by genre
  // Example: [{ genre: "Fantasy", count: 42, percent: 0.28, color: "#7C3AED" }]
  genreSlices: Array<{
    genre: string;       // Case-insensitive genre label used for filtering and legend
    count: number;       // Absolute number of books for this genre
    percent: number;     // 0..1; component may compute if not exact
    color?: string;      // Optional hex color override for the slice (e.g., "#FF6B6B")
  }>;

  // Line chart data: reading pace over time
  // Example: [{ date: "2024-01-01", booksRead: 3 }]
  readingPaceSeries: Array<{
    date: string;        // ISO date (YYYY-MM-DD) representing the time bucket start
    booksRead: number;   // Count of books read in that period (day/week/month)
  }>;

  // Leaderboard data: most-read authors
  // Example: [{ author: "Brandon Sanderson", count: 12 }]
  authorCounts: Array<{
    author: string;      // Display name of the author
    count: number;       // Total books read by this author
  }>;

  // Thematic mood tags derived from book themes/notes
  // Example: [{ tag: "uplifting", weight: 0.76 }]
  moodTags: Array<{
    tag: string;         // Lowercase slug or human-readable tag
    weight: number;      // 0..1 significance; used for tag sizing/emphasis
  }>;

  // Reading streak summary
  // Example: { currentStreak: 12, longestStreak: 45, lastReadDate: "2025-03-18" }
  streak: {
    currentStreak: number;  // Consecutive days with reading activity (today-inclusive if applicable)
    longestStreak: number;  // All-time longest streak (days)
    lastReadDate: string;   // ISO date of most recent reading activity
  };

  // Single action object emitted when the user interacts:
  // - Click a genre slice -> filter_by_genre
  // - Click a mood tag -> filter_by_mood
  // - Click an author in the leaderboard -> open_author_detail
  // The component will populate the payload according to the clicked item.
  onInteractAction:
    | { type: "filter_by_genre"; payload: { genre: string } }
    | { type: "filter_by_mood"; payload: { tag: string } }
    | { type: "open_author_detail"; payload: { author: string } };
}

interface TimeRangeSelectorProps {
  // Unique identifier for the selector instance (useful for analytics or wiring actions)
  id: string;

  // Short title shown above or alongside the control, e.g., "Analysis Window"
  title: string;

  // Currently selected range value
  // Examples: "30d" for last 30 days, "1y" for last year, "custom" when using specific dates
  selectedRange: '30d' | '90d' | '1y' | '3y' | 'all' | 'custom';

  // Preset options rendered as compact chips/buttons
  // Example: [{ label: "30 days", value: "30d" }, { label: "All time", value: "all" }]
  presets: Array<{
    label: string; // Human-readable label, e.g., "90 days"
    value: '30d' | '90d' | '1y' | '3y' | 'all' | 'custom';
  }>;

  // When selectedRange === "custom", these dates define the window (inclusive)
  // Use ISO 8601 date strings (YYYY-MM-DD) or full timestamps (YYYY-MM-DDTHH:mm:ssZ)
  // Example: { startDate: "2023-01-01", endDate: "2023-12-31" }
  customRange?: {
    startDate: string;
    endDate: string;
  };

  // Single action object emitted by the component on user interaction
  // The component will dispatch this action with an augmented payload:
  // - For preset selection: { ...payload, source: "preset", selectedRange: "90d" }
  // - For custom apply:     { ...payload, source: "custom", startDate: "...", endDate: "..." }
  // Recommended type naming aligns with domain: Book Collection Insights
  onRangeAction: {
    type: 'update_time_range'; // Consumer listens for this to update ReadingInsightsOverview and BookListTable
    payload?: {
      // You may include a correlation id or context key if needed by your app
      contextId?: string; // e.g., "reading_insights_overview"
    };
  };

  // Optional: interpret provided dates as UTC (default: true). If false, treat as local dates.
  utc?: boolean;

  // Optional: hide or disable the custom range picker (default: false)
  disableCustomRange?: boolean;
}

interface FiltersBarProps {
  // Primary identity and labeling
  id: string; // Unique component instance ID, e.g., "filters-main"
  title?: string; // Optional heading for the strip, e.g., "Filter Insights"

  // Current filter state (drives the insights and book list)
  selectedGenres: string[]; // Example: ["Fantasy", "Non-Fiction"]
  selectedAuthors: string[]; // Example: ["Ursula K. Le Guin", "Brandon Sanderson"]
  selectedMoods: string[]; // Example: ["Uplifting", "Dark", "Cozy"]
  searchText: string; // Free-text query across title/author/notes, e.g., "space opera"
  onlyCompleted: boolean; // When true, limits to books marked as completed

  // Optional option lists to populate controls (chips/dropdowns/autocomplete)
  genreOptions?: string[]; // Example: ["Fantasy", "Sci-Fi", "Mystery", "Memoir"]
  authorOptions?: string[]; // Example: ["Le Guin", "Atwood", "Ishiguro"]
  moodOptions?: string[]; // Example: ["Cozy", "Gritty", "Inspiring", "Dark"]

  // Optional display configuration
  searchPlaceholder?: string; // Example: "Search books, authors, keywords"
  iconUrl?: string; // Optional icon for the bar (e.g., filter icon)

  // Actions (intent objects) emitted by the component
  // Dispatch this when any filter control changes.
  // Example payload:
  // {
  //   genres: ["Fantasy"],
  //   authors: ["Le Guin"],
  //   moods: ["Cozy"],
  //   searchText: "earthsea",
  //   onlyCompleted: true
  // }
  onChangeAction: {
    type: "update_filters";
    payload: {
      genres: string[];
      authors: string[];
      moods: string[];
      searchText: string;
      onlyCompleted: boolean;
    };
  };

  // Dispatch this when the user clicks "Clear All" to reset every filter.
  onClearAllAction?: {
    type: "clear_all_filters";
  };
}

interface BookListTableProps {
  // Array of books to display in the table.
  // Example:
  // [
  //   { id: "b1", title: "Dune", author: "Frank Herbert", genre: "Sci-Fi", dateRead: "2023-04-12", rating: 4.5, pages: 688 },
  //   { id: "b2", title: "The Hobbit", author: "J.R.R. Tolkien", genre: "Fantasy", dateRead: "2022-11-05", rating: 4.8, pages: 310 }
  // ]
  rows: BookRow[];

  // Current sort applied to the table.
  // field must be one of the allowed data fields.
  // dir: "asc" | "desc". Example: { field: "dateRead", dir: "desc" }
  sort?: {
    field: SortField;
    dir: "asc" | "desc";
  };

  // Pagination state for the table.
  // index is zero-based page index. size is items per page.
  // total is optional; if provided, enables total pages display.
  // Example: { index: 0, size: 25, total: 240 }
  page?: {
    index: number;
    size: number;
    total?: number;
  };

  // Optional summary string that reflects currently active filters/time range,
  // shown above the table for context.
  // Example: "Time range: 2022-01-01 → 2024-12-31 • Genres: Sci-Fi, Fantasy"
  filtersSummary?: string;

  // Action dispatched when a table row is clicked.
  // The component will augment this action with payload: { bookId: string }.
  // Example: { type: "select_book" }
  onRowClickAction?: {
    type: "select_book" | string;
    // payload is added by the component: { bookId: string }
  };

  // Action dispatched when sorting changes via header clicks.
  // The component will augment this action with payload: { field: SortField; dir: "asc" | "desc" }.
  // Example: { type: "change_sort" }
  onSortChangeAction?: {
    type: "change_sort" | string;
    // payload is added by the component: { field, dir }
  };

  // Action dispatched when the page changes (pagination controls).
  // The component will augment this action with payload: { index: number; size: number }.
  // Example: { type: "change_page" }
  onPageChangeAction?: {
    type: "change_page" | string;
    // payload is added by the component: { index, size }
  };
}

// Represents a single book row in the table.
// dateRead should be an ISO date string: "YYYY-MM-DD" (or full ISO 8601).
// rating is typically 0–5 with up to one decimal (e.g., 4.5).
// pages is an integer count of pages.
interface BookRow {
  id: string;          // Unique identifier (stable across re-renders)
  title: string;       // Book title
  author: string;      // Primary author
  genre: string;       // Normalized genre label (e.g., "Sci-Fi", "Fantasy")
  dateRead: string;    // ISO date string, e.g., "2023-04-12"
  rating?: number;     // Optional rating (0–5). Example: 4.5
  pages?: number;      // Optional number of pages. Example: 688
}

// Fields that can be sorted by in the table.
// Tip: "dateRead" often uses "desc" by default to show most recent first.
type SortField = "title" | "author" | "genre" | "dateRead" | "rating" | "pages";

interface AuthorDetailDrawerProps {
  // Optional stable identifier for the author (e.g., from your CSV or database)
  // Example: "auth_42"
  authorId?: string;

  // Display name of the author
  // Example: "Ursula K. Le Guin"
  authorName: string;

  // Aggregate stats for this author, derived from the user's reading history
  summary: {
    // Total number of books read by this author
    bookCount: number;

    // Average rating given by the user to this author's books (0–5, e.g., 4.2)
    avgRating: number;

    // Average page count across books read by this author
    avgPages: number;

    // First and last read dates for this author's books (ISO 8601 strings)
    // Example: "2022-01-15"
    firstRead: string;
    lastRead: string;
  };

  // Top genres for this author within the user's reads
  // Percent is 0–100 (not 0–1). Sum need not be exactly 100 due to rounding.
  // Example: [{ genre: "Fantasy", percent: 62 }, { genre: "Sci-Fi", percent: 28 }]
  topGenres: {
    genre: string;
    percent: number;
  }[];

  // Time series of books read for this author
  // date: ISO 8601 (e.g., "2023-07-01")
  // booksRead: count for the given period (not cumulative)
  // Example: [{ date: "2023-01-01", booksRead: 1 }, { date: "2023-02-01", booksRead: 0 }]
  timelineSeries: {
    date: string;
    booksRead: number;
  }[];

  // Optional author avatar or image
  // Example: "https://images.example.com/authors/ursula.jpg"
  avatarUrl?: string;

  // Action object for interactions originating in the drawer
  // - close: dispatched when user closes the drawer
  // - filterByAuthor: dispatched when user applies a filter to see only this author's books
  actions: {
    close: { type: "close_author_drawer" };
    filterByAuthor: { type: "filter_by_author"; authorName: string };
  };

  // Optional configuration for how the timeline buckets are interpreted
  // Default: "month"
  // Choose based on the density of data in the uploaded CSV
  dateGranularity?: "day" | "week" | "month";
}

interface ReadingGoalProgressProps {
  goalType: "books" | "pages"; 
  // What the user is tracking toward. 
  // Example: "books" for count of books; "pages" for total pages read.

  targetNumber: number; 
  // The goal target to reach within the chosen period.
  // Examples: 24 (books in a year), 10000 (pages in a year).

  progressNumber: number; 
  // Current progress toward the target.
  // Examples: 7 (books read so far), 3450 (pages read so far).

  period: "year" | "custom"; 
  // Timeframe for the goal.
  // "year" implies the current calendar year; "custom" means a user-defined window managed elsewhere.

  onEditGoalAction?: { type: "open_edit_goal" }; 
  // Action to open the goal editor. 
  // Use this to let users adjust goalType/target/period. 
  // Example: { type: "open_edit_goal" }
}