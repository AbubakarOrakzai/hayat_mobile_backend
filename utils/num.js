// Turns "123", 123 into a number. Empty or invalid values become NaN.
export const num = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v))