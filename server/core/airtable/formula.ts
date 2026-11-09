export function escapeFormulaString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

/** Case-insensitive, trimmed equality on a text field. */
export function byNameFormula(fieldId: string, name: string): string {
  return `LOWER(TRIM({${fieldId}}))=LOWER('${escapeFormulaString(name.trim().toLowerCase())}')`
}

/** The device field may hold several ids separated by commas (one per installation). */
export function byDeviceFormula(fieldId: string, deviceId: string): string {
  return `FIND(',${escapeFormulaString(deviceId)},', ','&SUBSTITUTE({${fieldId}},' ','')&',')>0`
}

export function byIdsFormula(ids: string[]): string {
  return `OR(${ids.map((id) => `RECORD_ID()='${escapeFormulaString(id)}'`).join(',')})`
}

export function byFieldEquals(fieldId: string, value: string): string {
  return `{${fieldId}}='${escapeFormulaString(value)}'`
}
