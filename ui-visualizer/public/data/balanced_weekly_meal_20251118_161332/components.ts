interface WeeklyMealPlannerBoardProps {
  // Unique identifier for this weekly plan (useful for persistence or export)
  planId: string;

  // Display title for the board
  // Example: "Balanced Week • Cutting Phase" or "Family Meal Plan"
  title: string;

  // ISO 8601 date string indicating the Monday/Sunday (your convention) that this week starts on
  // Example: "2025-03-17"
  weekStartDate: string;

  // Seven daily entries containing meals and macro compliance for each day
  // Expected length: 7 (one per day in the week)
  schedule: DailyPlan[];

  // Consolidated shopping list across the week
  // Quantities reflect the sum needed for all planned meals (respecting units)
  shoppingList: ShoppingItem[];

  // Single action object (discriminated union) describing user interactions from this board
  // The component should emit/forward this action when users interact (select/swap/mark/export/etc.)
  // Example: { type: "select_meal", payload: { date: "2025-03-17", slot: "Dinner", mealId: "meal_42" } }
  onAction: WeeklyMealPlannerBoardAction;

  // Optional configuration:
  // - units: affects display of ingredient quantities in the shopping list and meal cards
  // Default: "metric"
  units?: "metric" | "imperial";
}

/* -------- Supporting Types -------- */

interface DailyPlan {
  // ISO date for the day. Should align with weekStartDate + offset
  date: string; // Example: "2025-03-18"

  // Meals planned for this day, keyed by slot
  // Typical slots: Breakfast, Lunch, Dinner, Snack (but allow custom labels)
  meals: MealItem[];

  // Aggregated macros for the day vs. the user's goals (used for compliance bars)
  macros: {
    totals: Macros; // Sum of all meals in the day
    goals: Macros;  // Target macros for the day
  };
}

interface MealItem {
  // Unique ID of the meal entry on the plan
  mealId: string;

  // Slot name for display and grouping (e.g., "Breakfast", "Lunch", "Dinner", "Snack")
  slot: string;

  // Human-readable meal name
  // Example: "Grilled Chicken with Quinoa"
  name: string;

  // Optional image to show inline on the grid/card
  imageUrl?: string;

  // Per-meal nutrition used for per-meal cards and daily totals
  macros: Macros;

  // Status enables simple progress tracking
  // "planned" (default), "cooked", "eaten"
  status?: "planned" | "cooked" | "eaten";
}

interface Macros {
  // Energy in kcal
  kcal: number;
  // Grams of protein/carbs/fat
  protein: number;
  carbs: number;
  fat: number;
}

interface ShoppingItem {
  // Unique item ID (stable across list updates if possible)
  id: string;

  // Ingredient name
  // Example: "Chicken Breast", "Quinoa", "Spinach"
  name: string;

  // Total quantity needed for the week aggregated across meals
  quantity: number;

  // Unit for the quantity
  // Examples: "g", "kg", "oz", "lb", "ml", "l", "cup", "tbsp", "tsp", "count"
  unit: string;

  // Optional category to group items in the UI
  // Examples: "Produce", "Protein", "Pantry", "Dairy"
  category?: string;
}

/* -------- Action Union (single action object carried via onAction) -------- */

type WeeklyMealPlannerBoardAction =
  // Expand a meal to show its nutrition card/details
  | {
      type: "select_meal";
      payload: { date: string; slot: string; mealId: string };
    }
  // Replace a meal in a given slot with another meal (e.g., from suggestions/favorites)
  | {
      type: "swap_meal";
      payload: { date: string; slot: string; newMealId: string };
    }
  // Update progress state for a meal
  | {
      type: "set_meal_status";
      payload: { date: string; slot: string; status: "planned" | "cooked" | "eaten" };
    }
  // Open or focus the consolidated shopping list panel
  | {
      type: "view_shopping_list";
    }
  // Toggle display units across the board (e.g., metric <-> imperial)
  | {
      type: "toggle_units";
      payload: { units: "metric" | "imperial" };
    }
  // Export or print the current plan
  // format defaults to "pdf" if not provided
  | {
      type: "export_plan";
      payload?: { format?: "pdf" | "csv" | "json" };
    };

interface MacroBreakdown {
  // Energy in kilocalories (kcal). Example: 2200
  calories: number;
  // Grams of each macronutrient. Examples: protein: 150, carbs: 250, fat: 70
  protein: number;
  carbs: number;
  fat: number;
}

interface DailyMacroComplianceBarProps {
  // Unique identifier for the day (stable across renders). Example: "2025-11-19"
  dayId: string;

  // ISO date string for the day. Example: "2025-11-19"
  dateISO: string;

  // Optional short label for display. Examples: "Mon", "Tue", "Rest Day"
  label?: string;

  // Target macros for the day (goal values).
  targets: MacroBreakdown;

  // Planned/intended macros for the day (sum of meals).
  planned: MacroBreakdown;

  // Overall compliance status comparing planned vs targets with a tolerance
  // under: below target range, on: within tolerance, over: above target range
  status: "under" | "on" | "over";

  // Action dispatched when the bar is clicked/selected to filter/highlight that day.
  // Example:
  // { type: "select_day", payload: { dayId: "2025-11-19", dateISO: "2025-11-19" } }
  onSelectAction?: {
    type: "select_day";
    payload: { dayId: string; dateISO: string };
  };

  // Optional visualization/configuration tweaks
  options?: {
    // Whether to include calories in the bar visualization/tooltip. Default: true
    showCalories?: boolean;
    // Number formatting for macros in tooltips/labels. Default: 0
    decimals?: number;
    // Unit system for labels; macros are still grams and kcal internally.
    // Used for UI copy (e.g., "kcal" vs "Calories"). Default: "metric"
    unit?: "metric" | "imperial";
  };
}

interface MealCardProps {
  // Unique identifier for this meal within the plan (used for actions/navigation)
  mealId: string; // e.g., "meal_12345"

  // Display title of the meal
  title: string; // e.g., "Chicken Rice Bowl"

  // Key nutrition figures to render small bars/text on the card
  macros: {
    calories: number; // in kcal, e.g., 520
    protein_g: number; // grams, e.g., 35
    carbs_g: number;   // grams, e.g., 55
    fat_g: number;     // grams, e.g., 18
  };

  // Compact, human-readable ingredients summary suitable for a single line
  // Example: "6 items: chicken, rice, broccoli, olive oil, garlic, soy sauce"
  ingredientsSummary: string;

  // Estimated active prep time in minutes (not including passive cook time)
  prepTimeMinutes: number; // e.g., 20

  // Optional tags used for quick badges/filters; include "favorite" if user marked it
  // Common tags: "favorite", "vegetarian", "vegan", "gluten_free"
  tags?: Array<"favorite" | "vegetarian" | "vegan" | "gluten_free" | string>;

  // Optional card image/thumbnail for visual appeal
  imageUrl?: string; // e.g., "https://cdn.example.com/meals/chicken-rice.jpg"

  // Primary interaction for the card (tap/click). Typically expands details or opens a drawer.
  onOpenDetailsAction: {
    type: "open_meal_details";
    mealId: string; // should mirror the mealId prop
  };
}

interface ShoppingListPanelProps {
  // Unique id for this consolidated list (e.g., a weekly plan id)
  id: string;

  // Display title for the panel (e.g., "Shopping List • Week of 2025-11-17")
  title: string;

  // Aggregated ingredient items across the weekly meal plan
  items: ShoppingListItem[];

  // Optional grouping preference for rendering the list; default: "aisle"
  // "aisle" groups by store aisle when available; "category" uses broad food categories
  groupBy?: "aisle" | "category";

  // Optional initial filter for scoping the list to specific days/meals
  // Example: { days: ["2025-11-17", "2025-11-18"], meals: ["dinner"], includeCompleted: false }
  filterOptions?: {
    days?: string[]; // ISO date strings (YYYY-MM-DD)
    meals?: string[]; // e.g., ["breakfast", "lunch", "dinner", "snack"]
    includeCompleted?: boolean; // default: true
  };

  // Single action channel for all interactions on the panel
  // Dispatch with one of the union types below as the user interacts
  onAction: ShoppingListPanelAction;
}

// A single consolidated shopping list item (unique ingredient across the week)
interface ShoppingListItem {
  // Stable reference to the ingredient in the meal/recipe data graph
  ingredientId: string;

  // Human-readable ingredient name (e.g., "Chicken Breast", "Spinach")
  name: string;

  // Total aggregated quantity for the week (e.g., 750 for grams, 3 for pcs)
  quantity: number;

  // Unit for the quantity (e.g., "g", "kg", "oz", "lb", "ml", "l", "pcs", "bunch")
  unit: string;

  // Whether this item has been checked off by the user
  completed: boolean;

  // Optional categorization for grouping when aisle is not available (e.g., "Produce", "Dairy")
  category?: string;

  // Where to find or prefer buying this item; can include multiple options
  // Example: [{ store: "Costco", aisle: "Meat" }, { store: "Whole Foods", aisle: "Butcher" }]
  sources?: {
    store?: string;
    aisle?: string;
  }[];

  // Optional small thumbnail/icon for quick recognition (e.g., product or ingredient icon)
  imageUrl?: string;

  // Free-form note for substitutions/brand preferences (e.g., "ripe", "organic", "no added sugar")
  notes?: string;

  // Provenance indicating which day/meal/recipe contributed to this item
  // Example: [{ day: "2025-11-17", mealId: "dinner", recipeId: "chicken_tacos" }]
  from?: Array<{
    day: string; // ISO date
    mealId: string; // e.g., "breakfast" | "lunch" | "dinner" | "snack" | custom id
    recipeId?: string;
  }>;
}

// Unified action object for all user interactions on the shopping list panel
type ShoppingListPanelAction =
  // Check off or uncheck an item
  | {
      type: "toggle_item";
      payload: { ingredientId: string; completed: boolean };
    }
  // Adjust the aggregated quantity and/or unit for an item
  | {
      type: "adjust_quantity";
      payload: { ingredientId: string; quantity: number; unit?: string };
    }
  // Substitute an ingredient with another (e.g., swap "Greek Yogurt" for "Skyr")
  | {
      type: "substitute_ingredient";
      payload: {
        ingredientId: string;
        substitute: { ingredientId: string; name: string };
      };
    }
  // Export the entire list to a destination (e.g., device notes or PDF)
  | {
    type: "export_list";
    payload: { format: "notes" | "pdf"; includeCompleted?: boolean };
  }
  // Apply or update filters to show only a subset of items by day/meal/completion
  | {
      type: "apply_filter";
      payload: { days?: string[]; meals?: string[]; includeCompleted?: boolean };
    };

interface MacroGoalsEditorProps {
  // Starting values for the editor. Calories are per-day; macros in grams per-day.
  initialTargets: MacroTargets;

  // How macro targets are interpreted:
  // - "absolute": calories/macros are fixed values
  // - "percent_of_maintenance": calories is % of maintenanceCalories; macros can be % splits
  targetMode: "absolute" | "percent_of_maintenance";

  // Required if targetMode = "percent_of_maintenance".
  // Example: 2400 means estimated daily maintenance calories = 2400 kcal.
  maintenanceCalories?: number;

  // Number of meals per day to plan for (e.g., 3 for breakfast/lunch/dinner, 4-6 for smaller meals).
  mealCountPerDay: number;

  // Allergies and exclusions to respect (e.g., "peanuts", "shellfish", "pork").
  exclusions: ExclusionItem[];

  // Specific ingredients or dishes the user prefers. Use likeLevel to bias planning.
  // Example: { kind: "ingredient", name: "chicken breast", likeLevel: 5 }
  preferredFoods?: FoodPreference[];

  // Preferred cuisines to bias recipe selection.
  // Example: { name: "mexican", likeLevel: 4 }
  preferredCuisines?: CuisinePreference[];

  // Optional additional nutrition constraints beyond macros.
  // Example: { maxSodiumMg: 2000, minFiberG: 25 }
  nutrientLimits?: NutrientLimits;

  // Provide current validation status (e.g., after user edits) for display.
  // The editor may surface these to guide user corrections before saving.
  validation?: ValidationState;

  // Optional link to a help doc or FAQ about setting macro goals.
  helpDocUrl?: string;

  // Declarative action objects emitted by the component for integration.
  actions: MacroGoalsEditorActions;
}

/* ---------------------- Supporting Types ---------------------- */

interface MacroTargets {
  // Daily calories (kcal). Example: 2200
  calories: number;
  // Daily grams. Example: protein: 150, carbs: 230, fat: 70
  proteinG: number;
  carbsG: number;
  fatG: number;

  // Optional when targetMode = "percent_of_maintenance":
  // If provided, the editor can show helpful % guidance.
  // Example: { proteinPercent: 30, carbsPercent: 40, fatPercent: 30 }
  macroPercents?: {
    proteinPercent?: number; // 0-100
    carbsPercent?: number;   // 0-100
    fatPercent?: number;     // 0-100
  };
}

interface ExclusionItem {
  // "allergy" for medically necessary exclusions; "avoid" for preferences.
  type: "allergy" | "avoid";
  // Ingredient or category to exclude. Example: "peanuts", "gluten", "pork"
  name: string;
  // Optional severity tag for allergies to prioritize strictness.
  severity?: "low" | "moderate" | "high";
}

interface FoodPreference {
  // "ingredient" for single foods (e.g., "salmon"), "dish" for recipes (e.g., "chicken tikka")
  kind: "ingredient" | "dish";
  name: string;
  // 1-5 scale; 5 means strongly preferred
  likeLevel: 1 | 2 | 3 | 4 | 5;
}

interface CuisinePreference {
  name: string; // Example: "italian", "thai", "mediterranean"
  // 1-5 scale; 5 means strongly preferred
  likeLevel: 1 | 2 | 3 | 4 | 5;
}

interface NutrientLimits {
  // Upper bounds
  maxSodiumMg?: number;        // e.g., 2000
  maxAddedSugarG?: number;     // e.g., 36
  maxSaturatedFatG?: number;   // e.g., 20

  // Lower bounds / minimums
  minFiberG?: number;          // e.g., 25

  // Optional cholesterol cap
  maxCholesterolMg?: number;   // e.g., 300
}

interface ValidationState {
  isValid: boolean;
  // Example warnings:
  // - "calorie_mismatch": calories implied by macros differ from calories field
  // - "macro_percent_sum": macro percentage split does not equal 100
  // - "unreachable_constraints": nutrient limits conflict with macro targets
  warnings?: ValidationWarning[];
}

interface ValidationWarning {
  code:
    | "calorie_mismatch"
    | "macro_percent_sum"
    | "unreachable_constraints"
    | "invalid_meal_count"
    | "missing_maintenance";
  message: string; // Human-readable guidance for the user
}

interface MacroGoalsEditorActions {
  // Persist the current goals; planId may be provided to link a specific plan.
  save: { type: "save_goals"; planId?: string };

  // Validate current inputs; component may update ValidationState UI.
  validate: { type: "validate_goals" };

  // Trigger plan recalculation with the edited goals.
  recalcPlan: {
    type: "recalculate_plan";
    scope: "entire_week" | "from_today" | "next_shopping_cycle";
  };

  // Optional: abandon changes.
  cancel?: { type: "cancel_edit" };

  // Optional: import or estimate maintenance calories to assist percent-based targeting.
  importMaintenance?: {
    type: "import_maintenance";
    source: "basal_estimator" | "apple_health" | "fitbit" | "manual_entry";
  };
}

// Domain: Meal Planning and Nutrition Balancer
// Component: MealSwapDialog
// Purpose: Modal to replace a selected meal with alternatives matching macros and user favorites.
// Notes:
// - Do NOT add `export` (per guidelines).
// - Uses action objects instead of function callbacks.
// - Only essential, high-level configuration is included.

interface MealSwapDialogProps {
  // Context about the currently selected meal slot the user wants to replace.
  // Example:
  // {
  //   day: "2025-11-20",
  //   mealSlot: "lunch",
  //   currentMeal: { id: "m123", title: "Chicken Salad", macros: { kcal: 520, protein: 45, carbs: 30, fat: 22 } },
  //   targetMacros: { kcal: 550, protein: 40, carbs: 45, fat: 18 } // Used to compute delta vs. plan goal
  // }
  context: {
    day: string; // ISO date string (e.g., "2025-11-20")
    mealSlot: "breakfast" | "lunch" | "dinner" | "snack";
    currentMeal: MealListItem;
    // Macros the plan is targeting for this meal (used to show delta/fit)
    targetMacros: MacroBreakdown;
  };

  // Candidate meals to choose from as replacements.
  // Keep this list pre-filtered and reasonably sized; client-side search/filter can refine further.
  // Example item:
  // {
  //   id: "m456",
  //   title: "Tofu Stir-Fry",
  //   macros: { kcal: 540, protein: 38, carbs: 50, fat: 16 },
  //   tags: ["vegetarian", "quick"],
  //   cuisine: "Asian",
  //   prepTimeMinutes: 20,
  //   imageUrl: "https://cdn.example.com/meals/tofu-stirfry.jpg",
  //   isFavorite: true
  // }
  candidateMeals: MealListItem[];

  // Initial filter and search configuration for the dialog.
  // The UI may allow users to tweak these interactively.
  // - favoritesOnly: show only user-favorited meals
  // - cuisines: restrict to one or more cuisines (e.g., ["Mediterranean", "Asian"])
  // - maxPrepTimeMinutes: only show meals <= this prep time
  // - searchQuery: basic text match on title/tags
  filters?: {
    favoritesOnly?: boolean;
    cuisines?: string[];
    maxPrepTimeMinutes?: number;
    searchQuery?: string;
  };

  // Action dispatched when the user selects a meal to swap in.
  // UI will fill in `toMealId` based on the user's selection.
  // Example dispatched object:
  // {
  //   type: "swap_meal",
  //   payload: {
  //     day: "2025-11-20",
  //     mealSlot: "lunch",
  //     fromMealId: "m123",
  //     toMealId: "m456"
  //   }
  // }
  onSelectAction: {
    type: "swap_meal";
    payload: {
      day: string;
      mealSlot: "breakfast" | "lunch" | "dinner" | "snack";
      fromMealId: string; // context.currentMeal.id
      toMealId: string;   // filled by UI upon selection
    };
  };

  // Optional action to preview a meal's details (nutrition card, ingredients).
  // Fired when a user taps "Preview" on a candidate.
  // Example: { type: "preview_meal", payload: { mealId: "m456" } }
  onPreviewAction?: {
    type: "preview_meal";
    payload: { mealId: string };
  };

  // Optional display config.
  // - showMacroDelta: when true, show the difference from targetMacros (default true)
  // - units: controls any displayed measures (e.g., ingredient amounts in preview)
  display?: {
    showMacroDelta?: boolean; // Default: true
    units?: "metric" | "imperial"; // Default: "metric"
  };
}

/* ===== Supporting Types ===== */

interface MacroBreakdown {
  // Energy in kilocalories and macronutrients in grams
  kcal: number;
  protein: number; // grams
  carbs: number;   // grams
  fat: number;     // grams
}

interface MealListItem {
  id: string;
  title: string;
  macros: MacroBreakdown;
  // Optional display helpers
  imageUrl?: string; // square or 4:3 recommended
  tags?: string[];   // e.g., ["high-protein", "gluten-free"]
  cuisine?: string;  // e.g., "Mediterranean", "Asian"
  prepTimeMinutes?: number; // end-to-end prep time
  isFavorite?: boolean;
}