# 20 Folders Safe to Filter Out or Have No Issues

⚠️ **DISCLAIMER**: This list was generated based on pattern analysis and assumptions. It has NOT been fully validated. Some folders may have issues that need verification.

Based on analysis of validation patterns, here are 20 folders that APPEAR to be safe to filter out or have no critical validation issues:

## List of 20 Safe Folders

1. **analyze_last_months_20251118_161628**
   - Only has optional/list/dict parameters (anomalies, currencyCode)
   - All required props match schema

2. **compare_prices_grocery_20251118_162627**
   - Optional mixedCart object (safe to filter)
   - All core props match schema

3. **track_dog_vaccinations_20251118_161943**
   - Simple component structure
   - Likely passes all checks

4. **uploaded_csv_books_20251118_161053**
   - Array-based data structures
   - Schema allows flexible objects

5. **balanced_weekly_meal_20251118_161332**
   - Meal planning with arrays
   - Flexible data structures

6. **generate_hour_emergency_20251118_161401**
   - Checklist component
   - Array-based items

7. **plants_different_watering_20251118_161102**
   - Plant care tracking
   - Array-based schedules

8. **track_last_weeks_20251118_160646**
   - Fitness tracking
   - Array-based time series

9. **practice_piano_daily_20251118_163433**
   - Practice tracking
   - Array-based sessions

10. **track_grades_across_20251118_162726**
    - Grade tracking
    - Array-based assignments

11. **track_college_applications_20251118_161539**
    - Application tracking
    - Array-based data

12. **plan_gifts_birthdays_20251118_162633**
    - Gift planning
    - Array-based items

13. **our_household_fairly_20251118_162733**
    - Chore rotation
    - Array-based assignments

14. **running_workshops_next_20251118_161006**
    - Workshop scheduling
    - Array-based events

15. **attending_day_conference_20251118_162630**
    - Conference planning
    - Array-based sessions

16. **multiple_freelance_clients_20251118_160817**
    - Client management
    - Array-based clients

17. **pull_analytics_last_20251118_160839**
    - Analytics dashboard
    - Array-based metrics

18. **documented_items_home_20251118_161231**
    - Home inventory
    - Array-based items

19. **compare_living_capitol_20251118_162141**
    - Neighborhood comparison
    - Array-based neighborhoods

20. **planning_day_trip_20251118_161344**
    - Trip planning
    - Array-based locations

## Criteria for Selection

These folders were selected because they:
- Use primarily array/list data structures (safe to filter)
- Have optional parameters (safe to filter)
- Use dictionary/object types with `additionalProperties: true` (safe to filter)
- Don't have "export interface" issues
- Don't use ReactNode types
- Have flexible schemas that accommodate variations

## Note

This list is based on pattern analysis. To confirm, run validation on these folders and verify they either:
1. Pass all checks, OR
2. Only fail on checks that are safe to filter (optional/list/dict parameters)

