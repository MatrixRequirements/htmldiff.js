"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RowAligner = void 0;
/**
 * Which row of the old table is which row of the new one. In a document section a row is
 * about the item it references; elsewhere it is about whatever its cells say.
 */
const helpers_1 = require("./helpers");
const SequenceAligner_1 = require("./SequenceAligner");
const similarity_1 = require("./similarity");
/** Which row of the old table is which row of the new one. */
class RowAligner {
    /**
     * @param oldVersion The old version.
     * @param newVersion The new version.
     * @param columns The column alignments: rows are compared on kept columns only.
     */
    constructor(oldVersion, newVersion, columns) {
        this.oldVersion = oldVersion;
        this.newVersion = newVersion;
        this.comparedColumns = columns.filter((column) => column.kind === "same" && (!oldVersion.isSequenceColumn(column.oldIndex) || !newVersion.isSequenceColumn(column.newIndex)));
    }
    /**
     * Refs only added to a cell, or only removed from it, leave it the same cell with other
     * content. A ref swapped for another makes it another cell, and its row another row: a
     * trace or an execution is named by its ref.
     * @param oldRefs The old cell's refs.
     * @param newRefs The new cell's refs.
     * @returns True when one side's refs contain the other's.
     */
    static haveCompatibleRefs(oldRefs, newRefs) {
        const contains = (refs, others) => others.every((ref) => refs.indexOf(ref) !== -1);
        return contains(newRefs, oldRefs) || contains(oldRefs, newRefs);
    }
    /**
     * Rows are compared on kept columns only, so a column change can never make a row look
     * edited. Blank cells carry no identity; a line number column renumbers on every insert
     * and is ignored. A row that keeps less than half of what its cells said is deleted and
     * added, never diffed. In a document section a row is about the item it references first:
     * a row about another item is another row, so is a row where a ref was swapped. The rest is
     * content; a row with nothing beside its item was emptied or filled, not replaced. Where
     * both versions' cells carry their own identity, those cells alone decide: the same keys
     * are the same row whatever its other cells say, other keys another row.
     * @returns The row alignments.
     */
    align() {
        const oldVersion = this.oldVersion;
        const newVersion = this.newVersion;
        const comparedColumns = this.comparedColumns;
        const oldItemRefs = oldVersion.itemRefsByRow();
        const newItemRefs = newVersion.itemRefsByRow();
        const oldItemCells = oldItemRefs.map((refs, rowIndex) => (refs.length > 0 ? oldVersion.itemCellIndex(rowIndex) : -1));
        const newItemCells = newItemRefs.map((refs, rowIndex) => (refs.length > 0 ? newVersion.itemCellIndex(rowIndex) : -1));
        const keyed = oldVersion.hasRowKeys && newVersion.hasRowKeys;
        const sameKeys = (oldKeys, newKeys) => oldKeys.length === newKeys.length && oldKeys.every((key, index) => key === newKeys[index]);
        const similarity = (oldIndex, newIndex) => {
            if (keyed) {
                return sameKeys(oldVersion.rowKeys(oldIndex), newVersion.rowKeys(newIndex)) ? 1 : 0;
            }
            const oldRefs = oldItemRefs[oldIndex];
            const newRefs = newItemRefs[newIndex];
            const aboutItems = oldRefs.length > 0 || newRefs.length > 0;
            if (aboutItems) {
                if (oldRefs.length === 0 || newRefs.length === 0 || oldRefs[0] !== newRefs[0]) {
                    return 0;
                }
                const compatible = comparedColumns.every((column) => RowAligner.haveCompatibleRefs(oldVersion.cellRefs(oldIndex, column.oldIndex), newVersion.cellRefs(newIndex, column.newIndex)));
                if (!compatible) {
                    return 0;
                }
            }
            let compared = 0;
            let kept = 0;
            let oldBlank = true;
            let newBlank = true;
            comparedColumns.forEach((column) => {
                // the cell naming the item is the row's identity, not its content
                if (column.oldIndex === oldItemCells[oldIndex] || column.newIndex === newItemCells[newIndex]) {
                    return;
                }
                const oldSignature = oldVersion.signatureAt(oldIndex, column.oldIndex);
                const newSignature = newVersion.signatureAt(newIndex, column.newIndex);
                oldBlank = oldBlank && oldSignature === "";
                newBlank = newBlank && newSignature === "";
                if (oldSignature === "" && newSignature === "") {
                    return;
                }
                compared++;
                kept += (0, similarity_1.cellSimilarity)(oldSignature, newSignature);
            });
            // an item's row with nothing beside the item was emptied or filled, not replaced
            if (compared === 0 || (aboutItems && (oldBlank || newBlank))) {
                return aboutItems ? 1 : NaN;
            }
            return kept / compared;
        };
        return new SequenceAligner_1.SequenceAligner({
            oldCount: oldVersion.rows.length,
            newCount: newVersion.rows.length,
            similarity,
            byPosition: {
                isOldBlank: (oldIndex) => comparedColumns.every((column) => oldVersion.signatureAt(oldIndex, column.oldIndex) === ""),
                isNewBlank: (newIndex) => comparedColumns.every((column) => newVersion.signatureAt(newIndex, column.newIndex) === ""),
                hasOldIdentity: (oldIndex) => oldItemRefs[oldIndex].length > 0,
                hasNewIdentity: (newIndex) => newItemRefs[newIndex].length > 0,
            },
        }).align();
    }
    /**
     * Where rows were replaced, each deleted row is followed by the added row in its place, so
     * the reader sees old and new together. A group (a row and the rows its merged cell spans)
     * moves as one.
     * @param rows The row alignments.
     * @returns The row alignments, replaced runs alternated.
     */
    alternateReplaced(rows) {
        let result = [];
        let run = [];
        const flushRun = () => {
            const deletedUnits = RowAligner.groupIntoUnits(run.filter((row) => row.kind === "deleted"), (row) => row.kind === "deleted" && this.oldVersion.isContinuationRow(row.oldIndex));
            const addedUnits = RowAligner.groupIntoUnits(run.filter((row) => row.kind === "added"), (row) => row.kind === "added" && this.newVersion.isContinuationRow(row.newIndex));
            (0, helpers_1.range)(0, Math.max(deletedUnits.length, addedUnits.length)).forEach((index) => {
                result = result.concat(deletedUnits[index] || [], addedUnits[index] || []);
            });
            run = [];
        };
        rows.forEach((row) => {
            if (row.kind === "same") {
                flushRun();
                result.push(row);
                return;
            }
            run.push(row);
        });
        flushRun();
        return result;
    }
    /**
     * Consecutive rows, split before every row that starts a new unit.
     * @param rows The rows.
     * @param continuesUnit Whether a row belongs to the unit before it.
     * @returns The units.
     */
    static groupIntoUnits(rows, continuesUnit) {
        const units = [];
        rows.forEach((row) => {
            const unit = (0, helpers_1.last)(units);
            if (unit && continuesUnit(row)) {
                unit.push(row);
                return;
            }
            units.push([row]);
        });
        return units;
    }
}
exports.RowAligner = RowAligner;
