"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColumnAligner = void 0;
/**
 * Which column of the old table is which column of the new one, and the colgroup of the
 * merged table.
 */
const constants_1 = require("./constants");
const helpers_1 = require("./helpers");
const html_1 = require("./html");
const SequenceAligner_1 = require("./SequenceAligner");
const similarity_1 = require("./similarity");
/** Which column of the old table is which column of the new one. */
class ColumnAligner {
    /**
     * @param oldVersion The old version.
     * @param newVersion The new version.
     */
    constructor(oldVersion, newVersion) {
        this.oldVersion = oldVersion;
        this.newVersion = newVersion;
    }
    /**
     * Columns are identified by the values they hold, order ignored, so row inserts and
     * reorders do not shift them. The header cell, when there is one, is just one more value.
     * @returns The column alignments.
     */
    align() {
        const oldValueCounts = this.oldVersion.columnValueCounts();
        const newValueCounts = this.newVersion.columnValueCounts();
        return new SequenceAligner_1.SequenceAligner({
            oldCount: this.oldVersion.columnCount,
            newCount: this.newVersion.columnCount,
            similarity: (oldIndex, newIndex) => (0, similarity_1.sharedShare)(oldValueCounts[oldIndex], newValueCounts[newIndex]),
            byPosition: {
                // too few values in a small table to tell a new column from changed rows
                pairsInPlace: () => true,
                isOldBlank: (oldIndex) => (0, similarity_1.countsSize)(oldValueCounts[oldIndex]) === 0,
                isNewBlank: (newIndex) => (0, similarity_1.countsSize)(newValueCounts[newIndex]) === 0,
            },
        }).align();
    }
    /**
     * A column paired by position is another column when no kept row keeps what it said in it:
     * the old column was deleted and a new one added in its place. One kept row is not enough
     * to tell that from a cell edit. A line number column renumbers whenever rows move, it is
     * never replaced.
     * @param columns The column alignments.
     * @param rows The row alignments.
     * @returns The column alignments, replaced columns split in two.
     */
    splitReplaced(columns, rows) {
        const keptRows = rows.filter((row) => row.kind === "same");
        return (0, helpers_1.flatten)(columns.map((column) => {
            if (column.kind !== "same" ||
                (this.oldVersion.isSequenceColumn(column.oldIndex) && this.newVersion.isSequenceColumn(column.newIndex))) {
                return [column];
            }
            const compared = keptRows
                .map((row) => [this.oldVersion.signatureAt(row.oldIndex, column.oldIndex), this.newVersion.signatureAt(row.newIndex, column.newIndex)])
                .filter((pair) => pair[0] !== "" && pair[1] !== "");
            const isReplaced = compared.length >= 2 && compared.every((pair) => (0, similarity_1.cellSimilarity)(pair[0], pair[1]) < 0.5);
            return isReplaced
                ? [
                    { kind: "deleted", oldIndex: column.oldIndex },
                    { kind: "added", newIndex: column.newIndex },
                ]
                : [column];
        }));
    }
    /**
     * One col per merged column, so a deleted column keeps the width it had. The column class
     * on the col lets side by side hide the whole column: chrome keeps a col's width even when
     * all its cells are hidden.
     * @param columns The column alignments.
     * @param mergedInner The inner html of the merged table.
     * @returns The inner html with the colgroup rebuilt, untouched when neither table has one.
     */
    rebuildColgroup(columns, mergedInner) {
        const oldCols = ColumnAligner.colTags(this.oldVersion.table.inner);
        const newCols = ColumnAligner.colTags(this.newVersion.table.inner);
        if (oldCols.length === 0 && newCols.length === 0) {
            return mergedInner;
        }
        const inner = (0, html_1.replaceRanges)(mergedInner, (0, html_1.findElements)(mergedInner, ["colgroup"]).map((colgroup) => ({ start: colgroup.start, end: colgroup.end, html: "" })));
        const colgroup = "<colgroup>" +
            columns
                .map((column) => {
                let col = column.kind === "deleted" ? oldCols[column.oldIndex] || "<col />" : newCols[column.newIndex] || "<col />";
                if (column.kind !== "same") {
                    col = (0, html_1.addTagClass)(col, column.kind === "added" ? constants_1.CELL_ADDED_CLASS : constants_1.CELL_DELETED_CLASS);
                }
                return col;
            })
                .join("") +
            "</colgroup>";
        const caption = (0, html_1.findElements)(inner, ["caption"])[0];
        const at = caption ? caption.end : 0;
        return inner.slice(0, at) + colgroup + inner.slice(at);
    }
    /**
     * The col tags of a table's colgroups.
     * @param tableInner The inner html of the table.
     * @returns The col tags in order.
     */
    static colTags(tableInner) {
        const cols = [];
        (0, html_1.findElements)(tableInner, ["colgroup"]).forEach((colgroup) => {
            (0, html_1.scanTags)(colgroup.inner, (tag) => {
                if (tag.name === "col" && !tag.isClosing) {
                    cols.push(tag.text);
                }
            });
        });
        return cols;
    }
}
exports.ColumnAligner = ColumnAligner;
