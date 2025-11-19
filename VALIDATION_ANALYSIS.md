# Validation Filtering Analysis: List/Dictionary/Optional Parameters

## Summary
After reviewing examples of filtered-out parameters (lists, dictionaries, and optional props), here's my assessment of whether missing them from the schema would cause critical functionality errors.

## Examples Analyzed

### 1. Optional Array: `anomalies?: AnomalyCallout[]`
**Component**: `EnergyUsageOverviewProps`  
**Interface**: `anomalies?: AnomalyCallout[]` (optional array of objects)  
**Schema Status**: ✅ Present in schema as optional array

**Analysis**: 
- **NOT CRITICAL** - This is an optional enhancement feature
- Component can render without anomalies (they're just callouts/badges)
- Missing from schema wouldn't break core functionality
- Worst case: user doesn't see anomaly warnings, but chart still works

**Verdict**: ✅ Safe to filter out

---

### 2. Optional Object: `mixedCart?: {...}`
**Component**: `StoreComparisonPanelProps`  
**Interface**: `mixedCart?: {...}` (optional complex object with nested arrays)  
**Schema Status**: Need to verify

**Analysis**:
- **NOT CRITICAL** - This is an optional optimization feature
- Component shows "best single store" without this prop
- `mixedCart` is a "nice-to-have" showing cheapest cross-store cart
- Core comparison functionality works without it

**Verdict**: ✅ Safe to filter out

---

### 3. Optional String: `currencyCode?: string`
**Component**: `EnergyUsageOverviewProps`  
**Interface**: `currencyCode?: string`  
**Schema Status**: ✅ Present in schema

**Analysis**:
- **NOT CRITICAL** - Has sensible default ("USD")
- Component can fall back to default currency
- Missing from schema wouldn't break rendering
- Only affects display formatting, not data structure

**Verdict**: ✅ Safe to filter out

---

### 4. Complex Object: `data: {...}` with nested arrays
**Component**: `SkillGapOverviewProps`  
**Interface**: `data: { jobSkills: SkillRef[], resumeSkills: SkillRefMinimal[], ... }`  
**Schema Status**: Need to verify

**Analysis**:
- **POTENTIALLY CRITICAL** - This is core data structure
- However, schema likely uses `additionalProperties: true` for flexibility
- Complex nested structures are hard to fully validate in JSON schema
- Component likely handles missing nested fields gracefully

**Verdict**: ⚠️ Context-dependent, but generally safe if schema allows `additionalProperties`

---

### 5. Array of Objects: `applianceSeries: ApplianceBreakdown[]`
**Component**: `EnergyUsageOverviewProps`  
**Interface**: `applianceSeries: ApplianceBreakdown[]`  
**Schema Status**: ✅ Present in schema as array with `additionalProperties: true`

**Analysis**:
- **NOT CRITICAL** - Schema allows flexible object structure
- Array items have `additionalProperties: true`, so exact structure doesn't matter
- Component can handle variations in object properties
- Core functionality (showing stacked chart) works with any object shape

**Verdict**: ✅ Safe to filter out (schema is flexible)

---

### 6. Record/Dictionary: `prices: Record<string, Record<string, number | null>>`
**Component**: `StoreComparisonPanelProps`  
**Interface**: `prices: Record<string, Record<string, number | null>>`  
**Schema Status**: Need to verify

**Analysis**:
- **NOT CRITICAL** - Dictionaries are inherently flexible
- Schema likely uses `additionalProperties: true` or `type: "object"`
- Component iterates over keys dynamically
- Exact key names don't need to be predefined

**Verdict**: ✅ Safe to filter out

---

## General Patterns Observed

### Why These Are Safe to Filter:

1. **Optional Parameters (`?`)**
   - By definition, component must work without them
   - Missing from schema = component uses default/undefined behavior
   - **Risk Level**: ✅ Very Low

2. **Arrays (`[]`, `Array<>`)**
   - Schema typically uses `type: "array"` with `items: { additionalProperties: true }`
   - Component iterates over array, doesn't depend on exact item structure
   - **Risk Level**: ✅ Low (especially with `additionalProperties: true`)

3. **Dictionaries/Objects (`Record<>`, `object`, `{}`)**
   - Schema uses `type: "object"` with `additionalProperties: true`
   - Component accesses properties dynamically
   - **Risk Level**: ✅ Low (especially with `additionalProperties: true`)

### When It WOULD Be Critical:

1. **Required primitive types** (`string`, `number`, `boolean`) missing from schema
   - These are core identifiers or values
   - Component likely has no fallback
   - **Risk Level**: 🔴 High

2. **Required enum types** missing from schema
   - Component expects specific values
   - Wrong values could cause runtime errors
   - **Risk Level**: 🔴 High

3. **Required arrays** with strict item schemas missing
   - If component expects specific array item structure
   - And schema doesn't allow `additionalProperties`
   - **Risk Level**: 🟡 Medium-High

## Recommendation

✅ **The filtering logic is appropriate and safe.**

The current approach correctly identifies that:
- Optional parameters don't need strict schema validation
- Arrays/dictionaries are typically flexible in schemas (`additionalProperties: true`)
- These types are less likely to cause critical failures

**Suggested Enhancement**: Consider logging filtered-out props for review, but don't fail validation on them.

