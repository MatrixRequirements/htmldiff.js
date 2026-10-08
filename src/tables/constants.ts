/** Class names and the id prefix the table pass writes. */

/** Prefix of the identity given to tables that came without one. */
export const TABLE_ID_PREFIX = "redline-table-";
export const ROW_ADDED_CLASS = "table-row-added";
export const ROW_DELETED_CLASS = "table-row-deleted";
export const CELL_ADDED_CLASS = "table-cell-added";
export const CELL_DELETED_CLASS = "table-cell-deleted";

/** Diffs the content of two cells; the pass gets it injected by the diff entry point. */
export type CellDiff = (before: string, after: string) => string;
