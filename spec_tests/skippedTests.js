/**
 * hed-tests cases that hed-typescript does not pass yet, keyed by test case name.
 *
 * The runner (jsonTests.spec.js) skips a whole case by name and reports the reason in the jest
 * summary. Remove an entry once the case passes. Reasons record what was observed when the entry
 * was added (hed-tests a5c66bb), not a diagnosis. Set HED_RUN_SKIPPED=1 to run the listed cases anyway.
 */
export const skippedTests = {
  'definition-invalid-second-part-not-placeholder':
    'A Definition whose second part is not "#" (Definition/NewDef/3) gives no error; DEFINITION_INVALID expected.',
  'duplicate-schema-in-merge-group': 'A schema listed twice in one merge group loads without SCHEMA_LOAD_FAILED.',
  'sidecar-invalid-key-whitespace':
    'A top-level sidecar key that begins or ends with whitespace gives no SIDECAR_INVALID.',
  'sidecar-invalid-value-key-whitespace':
    'A categorical key under HED that begins or ends with whitespace gives no SIDECAR_INVALID.',
  'tabular-invalid-duplicate-column-name': 'A repeated column name in a TSV header gives no TABULAR_INVALID.',
  'tabular-invalid-column-name-whitespace':
    'A column name that begins or ends with whitespace gives no TABULAR_INVALID.',
  'tabular-invalid-blank-column-name': 'A blank column name gives no TABULAR_INVALID.',
  'tabular-invalid-value-whitespace':
    'A value that begins or ends with whitespace in a column with HED annotations gives no TABULAR_INVALID.',
  'tag-group-error-deferred-in-splice':
    'Valid sidecars whose reserved-tag group is completed by a {column} splice give TAG_GROUP_ERROR or TEMPORAL_TAG_ERROR.',
  'tag-group-error-event-context-braces':
    'Event-context with a {column} splice in its group gives neither SIDECAR_BRACES_INVALID nor TAG_GROUP_ERROR.',
  'tag-requires-child-reserved-value-in-8-2-0':
    'Duration and Delay without a value under HED 8.2.0 give no error; TEMPORAL_TAG_ERROR or TAG_REQUIRES_CHILD expected.',
  'temporal-tag-error-delay-not-convertible':
    'A Delay whose unit has no conversionFactor (month) in a timeline file gives no TEMPORAL_TAG_ERROR.',
  'temporal-tag-error-duration-not-convertible':
    'A Duration whose unit has no conversionFactor (year) in a timeline file gives no TEMPORAL_TAG_ERROR.',
  'temporal-tag-error-rules-apply-in-8-1-0': '(Duration, (Red)) under HED 8.1.0 gives no error.',
  'temporal-tag-error-no-conversion-factor-in-8-0-0':
    'Duration/2 minute under HED 8.0.0 in a timeline file gives no TEMPORAL_TAG_ERROR.',
  'temporal-tag-error-delay-missing-group': '(Delay/3 s) without an inner group gives no error.',
  'units-invalid-compound-units': 'Valid compound units such as cm-per-us give UNITS_INVALID.',
  'units-invalid-any-units':
    'Valid units on a unitClass=anyUnits placeholder (Quantity/3 ms, Quantity/3 dB) give UNITS_INVALID.',
  'bad-value-in-curly-column':
    'An invalid value in a column referenced in curly braces, in a row that does not substitute it, gives no error.',
  'value-invalid-date-time-format':
    'dateTimeClass values outside the BIDS Datetime format or calendar (2026-09-30T24:00:00, 2026-02-31) give no error.',
}
