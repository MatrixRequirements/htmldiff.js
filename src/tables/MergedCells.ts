/**
 * Merged cells: while the table is aligned, a merged cell is split into plain cells. The
 * merged cell keeps the content, empty parts take the other slots, both carry the merged
 * cell's key so it can be put back together after. Groups whose item stays keep their item
 * cell on a row every view shows.
 */
import { Cell } from "./Cell";
import { range } from "./helpers";
import { removeTagAttribute, setTagAttribute } from "./html";
import { Alignment, SameAlignment } from "./SequenceAligner";
import { Table } from "./Table";
import { TableVersion } from "./TableVersion";

/** An item both versions have, none of whose rows matched. */
export interface ReplacedItemGroup {
    oldIndexes: number[];
    newIndexes: number[];
    /** The merged column the item cell is in. */
    column: number;
    key: string;
    /** The new version's item cell, shown once on the first old row. */
    itemCell: Cell;
    oldItemCell: Cell;
    placed: boolean;
}

/** The merged cells of two versions of a table. */
export class MergedCells {
    private readonly oldVersion: TableVersion;
    private readonly newVersion: TableVersion;

    /**
     * @param oldVersion The old version, spans expanded.
     * @param newVersion The new version, spans expanded.
     */
    constructor(oldVersion: TableVersion, newVersion: TableVersion) {
        this.oldVersion = oldVersion;
        this.newVersion = newVersion;
    }

    /**
     * Turns every merged cell of a table into plain cells: the content stays in the first slot,
     * empty parts take the rest.
     * @param table The table.
     * @param versionKey Prefix of the merged cell keys, 'old' or 'new'.
     */
    static expand(table: Table, versionKey: string): void {
        // per row, the columns covered by a merged cell from above and its key
        const coveredByRow: Record<number, Record<number, string>> = {};
        const coveredIn = (rowIndex: number): Record<number, string> => {
            coveredByRow[rowIndex] = coveredByRow[rowIndex] || {};
            return coveredByRow[rowIndex];
        };

        table.rows().forEach((row, rowIndex) => {
            const covered = coveredIn(rowIndex);
            const cells = row.cells;
            const expanded: Cell[] = [];
            let column = 0;

            cells.forEach((cell, cellIndex) => {
                while (covered[column] !== undefined) {
                    expanded.push(Cell.part(covered[column], [cell]));
                    column++;
                }

                const columnSpan = cell.span("colspan");
                const rowSpan = cell.span("rowspan");
                expanded.push(cell);
                if (columnSpan === 1 && rowSpan === 1) {
                    column++;
                    return;
                }

                const mergedCellKey = `${versionKey}-${rowIndex}-${cellIndex}`;
                cell.mergedKey = mergedCellKey;
                cell.openTag = removeTagAttribute(removeTagAttribute(cell.openTag, "colspan"), "rowspan");

                for (let offset = 1; offset < columnSpan; offset++) {
                    expanded.push(Cell.part(mergedCellKey, [cell]));
                }
                for (let rowOffset = 1; rowOffset < rowSpan; rowOffset++) {
                    range(column, column + columnSpan).forEach((index) => {
                        coveredIn(rowIndex + rowOffset)[index] = mergedCellKey;
                    });
                }
                column += columnSpan;
            });

            while (covered[column] !== undefined) {
                expanded.push(Cell.part(covered[column], cells));
                column++;
            }
            row.cells = expanded;
        });
    }

    /**
     * The merged table is laid out, so every merged cell spans again over the largest block of
     * its own empty parts next to it. A side by side view hides the deleted rows or the added
     * rows: a cell spanning a hidden row would reach into the rows below it, so a merged cell
     * only spans rows that are shown together with its own row, and a cell carrying a change
     * never spans rows at all. A part cut off from its merged cell stays a plain cell.
     */
    fold(): void {
        const rows = this.newVersion.table.rows();
        const cells = rows.map((row) => row.cells);
        const mergedCells: Record<string, string> = Object.create(null) as Record<string, string>;
        Object.keys(this.oldVersion.mergedCells).forEach((key) => {
            mergedCells[key] = this.oldVersion.mergedCells[key];
        });
        Object.keys(this.newVersion.mergedCells).forEach((key) => {
            mergedCells[key] = this.newVersion.mergedCells[key];
        });
        const isSameMergedCell = (key: string, otherKey: string): boolean =>
            key === otherKey || (mergedCells[key] !== "" && mergedCells[key] === mergedCells[otherKey]);
        const isEmptyPartOf = (mergedCellKey: string, rowIndex: number, columnIndex: number, rowKind: string): boolean => {
            const cell = cells[rowIndex] && cells[rowIndex][columnIndex];
            return (
                !!cell &&
                cell.partOf !== null &&
                cell.inner === "" &&
                isSameMergedCell(mergedCellKey, cell.partOf) &&
                rows[rowIndex].kind() === rowKind
            );
        };

        cells.forEach((rowCells, rowIndex) => {
            rowCells.forEach((cell, columnIndex) => {
                const mergedCellKey = cell.mergedKey;
                if (mergedCellKey === null) {
                    return;
                }
                const rowKind = rows[rowIndex].kind();
                // a cell carrying a change hides in one side by side view: it may span the columns
                // of its own row, never the rows below it
                const spansRows = !(rows[rowIndex].changedInGroup && cell.hasChangeClass());

                let columnSpan = 1;
                while (isEmptyPartOf(mergedCellKey, rowIndex, columnIndex + columnSpan, rowKind)) {
                    columnSpan++;
                }
                let rowSpan = 1;
                while (
                    spansRows &&
                    range(columnIndex, columnIndex + columnSpan).every((index) => isEmptyPartOf(mergedCellKey, rowIndex + rowSpan, index, rowKind))
                ) {
                    rowSpan++;
                }

                range(rowIndex, rowIndex + rowSpan).forEach((spannedRow) => {
                    range(columnIndex, columnIndex + columnSpan).forEach((spannedColumn) => {
                        if (spannedRow !== rowIndex || spannedColumn !== columnIndex) {
                            cells[spannedRow][spannedColumn].removed = true;
                        }
                    });
                });
                if (columnSpan > 1) {
                    cell.openTag = setTagAttribute(cell.openTag, "colspan", columnSpan);
                }
                if (rowSpan > 1) {
                    cell.openTag = setTagAttribute(cell.openTag, "rowspan", rowSpan);
                }
            });
        });

        // a part left on its own in a changed row is an empty cell of that row: it carries the change too
        rows.forEach((row) => {
            if (!row.changedInGroup || !row.changeClass) {
                return;
            }
            const changeClass = row.changeClass;
            row.cells.forEach((cell) => {
                if (!cell.removed && cell.partOf !== null && !cell.hasChangeClass()) {
                    cell.addClass(changeClass);
                }
            });
        });
    }

    /**
     * A group's merged cell goes onto the group's first kept row, in both versions: a row only
     * one version has is hidden in one side by side view, and the group's item has to stay in
     * sight. A plain kept cell showing what the old merged cell showed is that merged cell: the
     * group shrank to this row, and the cell still spans the rows the group lost.
     * @param columns The column alignments.
     * @param rows The row alignments.
     */
    moveOwnersToKeptRows(columns: Alignment[], rows: Alignment[]): void {
        const moveOwners = (version: TableVersion, keptIndexes: number[]): void => {
            version.cells.forEach((rowCells, rowIndex) => {
                if (keptIndexes.indexOf(rowIndex) !== -1) {
                    return;
                }
                rowCells.forEach((cell, columnIndex) => {
                    if (cell.mergedKey === null) {
                        return;
                    }
                    const target = keptIndexes
                        .filter((keptIndex) => {
                            const keptCell = version.cells[keptIndex][columnIndex];
                            return keptIndex > rowIndex && !!keptCell && keptCell.partOf === cell.mergedKey;
                        })
                        .sort((first, second) => first - second)[0];
                    if (target === undefined) {
                        return;
                    }
                    rowCells[columnIndex] = version.cells[target][columnIndex];
                    version.cells[target][columnIndex] = cell;
                    const signature = version.signatures[rowIndex][columnIndex];
                    version.signatures[rowIndex][columnIndex] = version.signatures[target][columnIndex];
                    version.signatures[target][columnIndex] = signature;
                });
            });
        };
        const keptRows = rows.filter((row): row is SameAlignment => row.kind === "same");
        moveOwners(
            this.oldVersion,
            keptRows.map((row) => row.oldIndex),
        );
        moveOwners(
            this.newVersion,
            keptRows.map((row) => row.newIndex),
        );

        keptRows.forEach((row) => {
            columns.forEach((column) => {
                if (column.kind !== "same") {
                    return;
                }
                const oldCell = this.oldVersion.cells[row.oldIndex][column.oldIndex];
                const newCell = this.newVersion.cells[row.newIndex][column.newIndex];
                if (
                    !oldCell ||
                    !newCell ||
                    oldCell.mergedKey === null ||
                    newCell.mergedKey !== null ||
                    newCell.partOf !== null ||
                    oldCell.signature() !== newCell.signature()
                ) {
                    return;
                }
                newCell.mergedKey = oldCell.mergedKey;
                this.newVersion.mergedCells[oldCell.mergedKey] = this.oldVersion.mergedCells[oldCell.mergedKey];
            });
        });
    }

    /**
     * An item both versions have, none of whose rows is the same row in both: its old rows are
     * deleted and its new rows added, but the item itself stays. Its item cell is shown once,
     * on the first of its old rows, spanning all of them. By item, as the first ref of a row
     * names it.
     * @param columns The column alignments.
     * @param rows The row alignments.
     * @param oldItems The item of every old row, '' for none.
     * @param newItems The item of every new row, '' for none.
     * @returns The groups by item.
     */
    findReplacedItemGroups(columns: Alignment[], rows: Alignment[], oldItems: string[], newItems: string[]): Record<string, ReplacedItemGroup> {
        const keptItems: Record<string, boolean> = {};
        const candidates: Record<string, { oldIndexes: number[]; newIndexes: number[] }> = {};
        rows.forEach((row) => {
            if (row.kind === "same") {
                keptItems[oldItems[row.oldIndex]] = true;
                keptItems[newItems[row.newIndex]] = true;
            }
        });
        const candidateOf = (item: string): { oldIndexes: number[]; newIndexes: number[] } | null => {
            if (item === "" || keptItems[item]) {
                return null;
            }
            candidates[item] = candidates[item] || { oldIndexes: [], newIndexes: [] };
            return candidates[item];
        };
        rows.forEach((row) => {
            if (row.kind === "deleted") {
                const candidate = candidateOf(oldItems[row.oldIndex]);
                if (candidate) {
                    candidate.oldIndexes.push(row.oldIndex);
                }
            } else if (row.kind === "added") {
                const candidate = candidateOf(newItems[row.newIndex]);
                if (candidate) {
                    candidate.newIndexes.push(row.newIndex);
                }
            }
        });

        const groups: Record<string, ReplacedItemGroup> = {};
        Object.keys(candidates).forEach((item) => {
            const candidate = candidates[item];
            const firstOld = candidate.oldIndexes[0];
            const firstNew = candidate.newIndexes[0];
            if (
                firstOld === undefined ||
                firstNew === undefined ||
                !MergedCells.isConsecutive(candidate.oldIndexes) ||
                !MergedCells.isConsecutive(candidate.newIndexes)
            ) {
                return;
            }
            const oldCellIndex = this.oldVersion.itemCellIndex(firstOld);
            const newCellIndex = this.newVersion.itemCellIndex(firstNew);
            let column = -1;
            columns.forEach((alignment, index) => {
                if (alignment.kind === "same" && alignment.oldIndex === oldCellIndex && alignment.newIndex === newCellIndex) {
                    column = index;
                }
            });
            const oldItemCell = oldCellIndex === -1 ? null : this.oldVersion.cells[firstOld][oldCellIndex];
            const itemCell = newCellIndex === -1 ? null : this.newVersion.cells[firstNew][newCellIndex];
            if (column === -1 || !oldItemCell || !itemCell || oldItemCell.partOf !== null || itemCell.partOf !== null) {
                return;
            }
            if (itemCell.mergedKey === null) {
                itemCell.mergedKey = `item-${firstNew}`;
                this.newVersion.mergedCells[itemCell.mergedKey] = itemCell.signature();
            }
            groups[item] = {
                oldIndexes: candidate.oldIndexes,
                newIndexes: candidate.newIndexes,
                column,
                key: itemCell.mergedKey,
                itemCell,
                oldItemCell,
                placed: false,
            };
        });
        return groups;
    }

    /**
     * Whether the indexes follow each other without a gap.
     * @param indexes The indexes, ascending.
     * @returns True when consecutive.
     */
    private static isConsecutive(indexes: number[]): boolean {
        return indexes.every((index, position) => position === 0 || index === indexes[position - 1] + 1);
    }
}
