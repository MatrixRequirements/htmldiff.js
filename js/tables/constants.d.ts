/** Attribute and class names the table pass reads and writes. */
/** Prefix of the identity given to tables that came without one. */
export declare const TABLE_ID_PREFIX = "redline-table-";
export declare const HTMLDIFF_ID_ATTRIBUTE = "data-htmldiff-id";
export declare const INNER_DIFF_ATTRIBUTE = "data-htmldiff-inner-diff";
/** Marks a document section: inside it, rows are about the items they reference. */
export declare const SECTION_ATTRIBUTE = "data-shadow-boundary";
export declare const ROW_ADDED_CLASS = "table-row-added";
export declare const ROW_DELETED_CLASS = "table-row-deleted";
export declare const CELL_ADDED_CLASS = "table-cell-added";
export declare const CELL_DELETED_CLASS = "table-cell-deleted";
/** Diffs the content of two cells; the pass gets it injected by the diff entry point. */
export declare type CellDiff = (before: string, after: string) => string;
