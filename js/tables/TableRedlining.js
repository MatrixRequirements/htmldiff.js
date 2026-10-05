"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableRedlining = void 0;
/**
 * The table pass. Before the flat diff, every table is compared with its counterpart as a
 * structure: columns, then rows, then cells. A merged table is written into the after HTML in
 * place of the new table: added and deleted rows and columns are whole rows and columns with
 * a class, kept cells hold the diff of their content. Both versions get the same
 * data-htmldiff-id, so the flat diff keeps the table as one equal token and emits the merged
 * markup as it is.
 *
 * Classes used on the merged table: table-row-added, table-row-deleted on tr;
 * table-cell-added, table-cell-deleted on td, th and col.
 */
const constants_1 = require("./constants");
const html_1 = require("./html");
const Table_1 = require("./Table");
const TableAligner_1 = require("./TableAligner");
const TableMerger_1 = require("./TableMerger");
/** The table pass. */
class TableRedlining {
    /**
     * @param diffContent Diffs the content of kept cells.
     */
    constructor(diffContent) {
        this.diffContent = diffContent;
    }
    /**
     * Diffs every table pair structurally and writes the merged table into the after HTML. Both
     * versions of a pair get the same data-htmldiff-id, a table only one version has gets one
     * of its own, so the flat diff keeps every table whole.
     * @param before The HTML content before the changes.
     * @param after The HTML content after the changes.
     * @returns The before and after HTML with the tables prepared.
     */
    redline(before, after) {
        const oldTables = Table_1.Table.findTopLevel(before);
        const newTables = Table_1.Table.findTopLevel(after);
        if (oldTables.length === 0 && newTables.length === 0) {
            return { before, after };
        }
        const beforeReplacements = [];
        const afterReplacements = [];
        const oldOpenTags = oldTables.map((table) => table.openTag);
        const newOpenTags = newTables.map((table) => table.openTag);
        const openTagReplacement = (table, original) => ({
            start: table.start,
            end: table.start + original.length,
            html: table.openTag,
        });
        new TableAligner_1.TableAligner(oldTables, newTables).align().forEach((alignment, index) => {
            // a table only one version has needs an identity of its own, so htmldiff keeps it whole
            if (alignment.kind === "added") {
                const addedTable = newTables[alignment.newIndex];
                addedTable.ensureId(`${constants_1.TABLE_ID_PREFIX}added-${index}`);
                afterReplacements.push(openTagReplacement(addedTable, newOpenTags[alignment.newIndex]));
                return;
            }
            if (alignment.kind === "deleted") {
                const deletedTable = oldTables[alignment.oldIndex];
                deletedTable.ensureId(`${constants_1.TABLE_ID_PREFIX}deleted-${index}`);
                beforeReplacements.push(openTagReplacement(deletedTable, oldOpenTags[alignment.oldIndex]));
                return;
            }
            const oldTable = oldTables[alignment.oldIndex];
            const newTable = newTables[alignment.newIndex];
            const mergedInner = new TableMerger_1.TableMerger(oldTable, newTable, this.diffContent).merge();
            // the same identity on both makes htmldiff emit the merged markup as it is, whatever the
            // old table holds. no inner diff, that would diff inside the merged markup again
            const id = newTable.ensureId(`${constants_1.TABLE_ID_PREFIX}${index}`);
            oldTable.openTag = (0, html_1.setTagAttribute)(oldTable.openTag, constants_1.HTMLDIFF_ID_ATTRIBUTE, id);
            newTable.openTag = (0, html_1.removeTagAttribute)(newTable.openTag, constants_1.INNER_DIFF_ATTRIBUTE);
            beforeReplacements.push(openTagReplacement(oldTable, oldOpenTags[alignment.oldIndex]));
            afterReplacements.push({
                start: newTable.start,
                end: newTable.end,
                html: newTable.openTag + mergedInner + newTable.closeTag,
            });
        });
        return {
            before: (0, html_1.replaceRanges)(before, beforeReplacements),
            after: (0, html_1.replaceRanges)(after, afterReplacements),
        };
    }
}
exports.TableRedlining = TableRedlining;
