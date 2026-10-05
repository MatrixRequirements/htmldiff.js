"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableAligner = void 0;
/**
 * Which table of the old document is which table of the new one.
 */
const SequenceAligner_1 = require("./SequenceAligner");
const similarity_1 = require("./similarity");
const TableVersion_1 = require("./TableVersion");
/** Which table of the old document is which table of the new one. */
class TableAligner {
    /**
     * @param oldTables The old tables.
     * @param newTables The new tables.
     */
    constructor(oldTables, newTables) {
        this.oldTables = oldTables;
        this.newTables = newTables;
    }
    /**
     * A table with an identity of its own is the same table only where that identity is:
     * another item's table is never an edit of it, however alike the two look. The rest is
     * matched by what it contains, then by position. In a document section the header names
     * the table: two headed tables with different headers are different tables, and the table
     * in the other's place with the same header is the section's table, generated anew each
     * time, whatever its rows now say. In a text a table in the other's place is that table
     * edited only when the values the two share account for half of the smaller one's cells,
     * a repeated value counted once: otherwise one was deleted and a new one written, whatever
     * their shapes. Merged cells in a text are layout: a table whose merged cells changed is
     * another table, a merged cell is never diffed against the cells it swallowed.
     * @returns The table alignments.
     */
    align() {
        const oldTables = this.oldTables;
        const newTables = this.newTables;
        const oldIds = oldTables.map((table) => table.ownId());
        const newIds = newTables.map((table) => table.ownId());
        const oldVersions = oldTables.map((table) => TableVersion_1.TableVersion.read(table));
        const newVersions = newTables.map((table) => TableVersion_1.TableVersion.read(table));
        const oldValueCounts = oldVersions.map((version) => version.valueCounts());
        const newValueCounts = newVersions.map((version) => version.valueCounts());
        const oldHeaders = oldVersions.map((version) => TableAligner.headerSignature(version));
        const newHeaders = newVersions.map((version) => TableAligner.headerSignature(version));
        // in a section, two headed tables are the same table only under the same header
        const headersApart = (oldIndex, newIndex) => oldTables[oldIndex].inSection &&
            newTables[newIndex].inSection &&
            oldHeaders[oldIndex] !== null &&
            newHeaders[newIndex] !== null &&
            oldHeaders[oldIndex] !== newHeaders[newIndex];
        // in a text, merged cells are layout: other merged cells make another table
        const spansApart = (oldIndex, newIndex) => !oldTables[oldIndex].inSection && !newTables[newIndex].inSection && !oldVersions[oldIndex].hasSameSpanLayoutAs(newVersions[newIndex]);
        return new SequenceAligner_1.SequenceAligner({
            oldCount: oldTables.length,
            newCount: newTables.length,
            similarity: (oldIndex, newIndex) => {
                if (oldIds[oldIndex] !== undefined || newIds[newIndex] !== undefined) {
                    return oldIds[oldIndex] === newIds[newIndex] ? 1 : 0;
                }
                if (headersApart(oldIndex, newIndex) || spansApart(oldIndex, newIndex)) {
                    return 0;
                }
                return (0, similarity_1.valueOverlap)(oldValueCounts[oldIndex], newValueCounts[newIndex]);
            },
            byPosition: {
                pairsInPlace: (oldIndex, newIndex) => {
                    if (headersApart(oldIndex, newIndex) || spansApart(oldIndex, newIndex)) {
                        return false;
                    }
                    const inSection = oldTables[oldIndex].inSection && newTables[newIndex].inSection;
                    return ((0, similarity_1.distinctSharedShare)(oldValueCounts[oldIndex], newValueCounts[newIndex]) >= 0.5 ||
                        (inSection && oldVersions[oldIndex].columnCount === newVersions[newIndex].columnCount));
                },
                isOldBlank: (oldIndex) => (0, similarity_1.countsSize)(oldValueCounts[oldIndex]) === 0,
                isNewBlank: (newIndex) => (0, similarity_1.countsSize)(newValueCounts[newIndex]) === 0,
                hasOldIdentity: (oldIndex) => oldIds[oldIndex] !== undefined,
                hasNewIdentity: (newIndex) => newIds[newIndex] !== undefined,
            },
        }).align();
    }
    /**
     * What a table's header says.
     * @param version The table.
     * @returns The header rows' signatures joined, null when the table has no header row.
     */
    static headerSignature(version) {
        const headerRowCount = version.headerRowCount();
        if (headerRowCount === 0) {
            return null;
        }
        return version
            .slice(0, headerRowCount)
            .signatures.map((row) => row.join("|"))
            .join("||");
    }
}
exports.TableAligner = TableAligner;
