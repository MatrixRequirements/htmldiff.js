/**
 * Which table of the old document is which table of the new one.
 */
import { Alignment, SequenceAligner } from "./SequenceAligner";
import { countsSize, distinctSharedShare, valueOverlap } from "./similarity";
import { Table } from "./Table";
import { TableVersion } from "./TableVersion";

/** Which table of the old document is which table of the new one. */
export class TableAligner {
    private readonly oldTables: Table[];
    private readonly newTables: Table[];

    /**
     * @param oldTables The old tables.
     * @param newTables The new tables.
     */
    constructor(oldTables: Table[], newTables: Table[]) {
        this.oldTables = oldTables;
        this.newTables = newTables;
    }

    /**
     * A table with an identity of its own is the same table only where that identity is:
     * another item's table is never an edit of it, however alike the two look. The rest is
     * matched by what it contains, then by position. A table whose cells name their rows was
     * generated: the header names it, so two headed ones with different headers are different
     * tables, and the one in the other's place with the same header is the same table, drawn
     * anew each time, whatever its rows now say. Any other table in the other's place is that
     * table edited only when the values the two share account for half of the smaller one's
     * cells, a repeated value counted once: otherwise one was deleted and a new one written,
     * whatever their shapes. Its merged cells are layout: a table whose merged cells changed is
     * another table, a merged cell is never diffed against the cells it swallowed.
     * @returns The table alignments.
     */
    align(): Alignment[] {
        const oldTables = this.oldTables;
        const newTables = this.newTables;
        const oldIds = oldTables.map((table) => table.ownId());
        const newIds = newTables.map((table) => table.ownId());
        const oldVersions = oldTables.map((table) => TableVersion.read(table));
        const newVersions = newTables.map((table) => TableVersion.read(table));
        const oldValueCounts = oldVersions.map((version) => version.valueCounts());
        const newValueCounts = newVersions.map((version) => version.valueCounts());
        const oldHeaders = oldVersions.map((version) => TableAligner.headerSignature(version));
        const newHeaders = newVersions.map((version) => TableAligner.headerSignature(version));
        const keyed = (oldIndex: number, newIndex: number): boolean => oldVersions[oldIndex].hasRowKeys && newVersions[newIndex].hasRowKeys;
        // generated tables are the same table only under the same header
        const headersApart = (oldIndex: number, newIndex: number): boolean =>
            keyed(oldIndex, newIndex) &&
            oldHeaders[oldIndex] !== null &&
            newHeaders[newIndex] !== null &&
            oldHeaders[oldIndex] !== newHeaders[newIndex];
        // outside generated tables, merged cells are layout: other merged cells make another table
        const spansApart = (oldIndex: number, newIndex: number): boolean =>
            !keyed(oldIndex, newIndex) && !oldVersions[oldIndex].hasSameSpanLayoutAs(newVersions[newIndex]);

        return new SequenceAligner({
            oldCount: oldTables.length,
            newCount: newTables.length,
            similarity: (oldIndex, newIndex) => {
                if (oldIds[oldIndex] !== undefined || newIds[newIndex] !== undefined) {
                    return oldIds[oldIndex] === newIds[newIndex] ? 1 : 0;
                }
                if (headersApart(oldIndex, newIndex) || spansApart(oldIndex, newIndex)) {
                    return 0;
                }
                return valueOverlap(oldValueCounts[oldIndex], newValueCounts[newIndex]);
            },
            byPosition: {
                pairsInPlace: (oldIndex, newIndex) => {
                    if (headersApart(oldIndex, newIndex) || spansApart(oldIndex, newIndex)) {
                        return false;
                    }
                    return (
                        distinctSharedShare(oldValueCounts[oldIndex], newValueCounts[newIndex]) >= 0.5 ||
                        (keyed(oldIndex, newIndex) && oldVersions[oldIndex].columnCount === newVersions[newIndex].columnCount)
                    );
                },
                isOldBlank: (oldIndex) => countsSize(oldValueCounts[oldIndex]) === 0,
                isNewBlank: (newIndex) => countsSize(newValueCounts[newIndex]) === 0,
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
    private static headerSignature(version: TableVersion): string | null {
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
