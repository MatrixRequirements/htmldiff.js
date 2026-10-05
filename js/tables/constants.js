"use strict";
/** Attribute and class names the table pass reads and writes. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CELL_DELETED_CLASS = exports.CELL_ADDED_CLASS = exports.ROW_DELETED_CLASS = exports.ROW_ADDED_CLASS = exports.SECTION_ATTRIBUTE = exports.INNER_DIFF_ATTRIBUTE = exports.HTMLDIFF_ID_ATTRIBUTE = exports.TABLE_ID_PREFIX = void 0;
/** Prefix of the identity given to tables that came without one. */
exports.TABLE_ID_PREFIX = "redline-table-";
exports.HTMLDIFF_ID_ATTRIBUTE = "data-htmldiff-id";
exports.INNER_DIFF_ATTRIBUTE = "data-htmldiff-inner-diff";
/** Marks a document section: inside it, rows are about the items they reference. */
exports.SECTION_ATTRIBUTE = "data-shadow-boundary";
exports.ROW_ADDED_CLASS = "table-row-added";
exports.ROW_DELETED_CLASS = "table-row-deleted";
exports.CELL_ADDED_CLASS = "table-cell-added";
exports.CELL_DELETED_CLASS = "table-cell-deleted";
