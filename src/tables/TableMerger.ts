/**
 * Merges two versions of a table: columns, then rows, then cells. The new table keeps its own
 * rows in their order, deleted rows are cloned from the old table and spliced in. Row state
 * wins over column state, column state wins over a cell diff.
 */
import { Cell } from "./Cell";
import { ColumnAligner } from "./ColumnAligner";
import { CELL_ADDED_CLASS, CELL_DELETED_CLASS, CellDiff, ROW_ADDED_CLASS, ROW_DELETED_CLASS } from "./constants";
import { last, range } from "./helpers";
import { addTagClass } from "./html";
import { MergedCells } from "./MergedCells";
import { Row } from "./Row";
import { RowAligner } from "./RowAligner";
import { Alignment, IndexPair, SameAlignment } from "./SequenceAligner";
import { Table } from "./Table";
import { TableVersion } from "./TableVersion";

/** Merges two versions of a table. */
export class TableMerger {
    private readonly oldTable: Table;
    private readonly newTable: Table;
    private readonly diffContent: CellDiff;

    /**
     * @param oldTable The old table.
     * @param newTable The new table.
     * @param diffContent Diffs the content of kept cells.
     */
    constructor(oldTable: Table, newTable: Table, diffContent: CellDiff) {
        this.oldTable = oldTable;
        this.newTable = newTable;
        this.diffContent = diffContent;
    }

    /**
     * Merges the two versions.
     * @returns The inner html of the merged table.
     */
    merge(): string {
        let oldVersion = TableVersion.read(this.oldTable);
        let newVersion = TableVersion.read(this.newTable);

        if (oldVersion.hasSpans || newVersion.hasSpans) {
            // the same layout is only the same rows when no cell says which row it belongs to
            if (oldVersion.hasSameShapeAs(newVersion) && !(oldVersion.hasRowKeys && newVersion.hasRowKeys)) {
                this.diffCellsByPosition(oldVersion, newVersion);
                return this.newTable.renderInner();
            }

            if (this.mergeUnderSameHeader(oldVersion, newVersion)) {
                return this.newTable.renderInner();
            }

            // cells were merged or split between the versions, so a cell is no longer one row x one
            // column. spans are expanded into plain cells and the table is matched like any other
            MergedCells.expand(this.oldTable, "old");
            MergedCells.expand(this.newTable, "new");
            oldVersion = TableVersion.read(this.oldTable);
            newVersion = TableVersion.read(this.newTable);
        }

        const columnAligner = new ColumnAligner(oldVersion, newVersion);
        let columns = columnAligner.align();
        columns = columnAligner.splitReplaced(columns, new RowAligner(oldVersion, newVersion, columns).align());
        const rowAligner = new RowAligner(oldVersion, newVersion, columns);
        const rows = rowAligner.alternateReplaced(rowAligner.align());

        const mergedCells = new MergedCells(oldVersion, newVersion);
        this.emitRows(oldVersion, newVersion, columns, rows, mergedCells);
        mergedCells.fold();
        return columnAligner.rebuildColgroup(columns, this.newTable.renderInner());
    }

    /**
     * Merged cells only in an unchanged header (report tables): the body is plain rows over
     * fixed columns.
     * @param oldVersion The old version.
     * @param newVersion The new version.
     * @returns True when the tables were merged this way.
     */
    private mergeUnderSameHeader(oldVersion: TableVersion, newVersion: TableVersion): boolean {
        const headerRowCount = oldVersion.headerRowCount();
        const oldHeader = oldVersion.slice(0, headerRowCount);
        const newHeader = newVersion.slice(0, newVersion.headerRowCount());
        const oldBody = oldVersion.slice(headerRowCount);
        const newBody = newVersion.slice(newVersion.headerRowCount());

        if (!oldHeader.hasSameShapeAs(newHeader) || oldBody.hasSpans || newBody.hasSpans) {
            return false;
        }
        if (oldBody.columnCount !== newBody.columnCount) {
            return false;
        }

        this.diffCellsByPosition(oldHeader, newHeader);

        const columns: Alignment[] = range(0, newBody.columnCount).map((index) => ({ kind: "same", oldIndex: index, newIndex: index }));
        const rowAligner = new RowAligner(oldBody, newBody, columns);
        this.emitRows(oldBody, newBody, columns, rowAligner.alternateReplaced(rowAligner.align()), new MergedCells(oldBody, newBody));

        return true;
    }

    /**
     * Writes the diff of two cells' content into the new cell.
     * @param oldCell The old cell, undefined when there is none.
     * @param newCell The new cell.
     */
    private diffCellContent(oldCell: Cell | undefined, newCell: Cell): void {
        if (oldCell && oldCell.inner !== newCell.inner) {
            newCell.inner = this.diffContent(oldCell.inner, newCell.inner);
        }
    }

    /**
     * Diffs the cells of two versions of the same layout, cell by cell.
     * @param oldVersion The old version.
     * @param newVersion The new version.
     */
    private diffCellsByPosition(oldVersion: TableVersion, newVersion: TableVersion): void {
        newVersion.cells.forEach((rowCells, rowIndex) => {
            rowCells.forEach((newCell, cellIndex) => {
                const oldCells = oldVersion.cells[rowIndex];
                this.diffCellContent(oldCells && oldCells[cellIndex], newCell);
            });
        });
    }

    /**
     * An old part counts as empty, unless the new cell shows the merged cell that part stood
     * for: then the group's cell moved onto this row and nothing changed.
     * @param oldVersion The old version.
     * @param oldCell The old cell.
     * @param newCell The new cell.
     * @returns The old cell to compare with.
     */
    private static oldCellToCompare(oldVersion: TableVersion, oldCell: Cell | undefined, newCell: Cell): Cell | undefined {
        if (!oldCell || oldCell.partOf === null) {
            return oldCell;
        }
        const mergedCell = oldVersion.ownerOf(oldCell);
        return mergedCell && mergedCell.signature() === newCell.signature() ? mergedCell : oldCell;
    }

    /**
     * The cell of a kept row for one merged column.
     * @param oldVersion The old version.
     * @param newVersion The new version.
     * @param row The kept row.
     * @param column The column.
     * @returns The cell.
     */
    private buildKeptRowCell(oldVersion: TableVersion, newVersion: TableVersion, row: IndexPair, column: Alignment): Cell {
        const newCells = newVersion.cells[row.newIndex];
        const oldCells = oldVersion.cells[row.oldIndex];

        if (column.kind === "deleted") {
            const cell = oldCells[column.oldIndex] ? oldCells[column.oldIndex].clone() : Cell.placeholder(newCells);
            cell.addClass(CELL_DELETED_CLASS);
            return cell;
        }

        const newCell = newCells[column.newIndex] || Cell.placeholder(newCells);

        if (column.kind === "added") {
            newCell.addClass(CELL_ADDED_CLASS);
            return newCell;
        }

        // a part of a merged cell shows nothing itself, its merged cell does: an empty part is never a change
        if (newCell.partOf !== null) {
            return newCell;
        }
        this.diffCellContent(TableMerger.oldCellToCompare(oldVersion, oldCells[column.oldIndex], newCell), newCell);

        return newCell;
    }

    /**
     * The cells of a row its group lost or gained carry the change; a part of a merged cell
     * shows nothing itself and stays as it is, so the group's cell spans the row.
     * @param cells The cells.
     * @param className The change class.
     */
    private static markChangedCells(cells: Cell[], className: string): void {
        cells.forEach((cell) => {
            if (cell.partOf === null && !cell.hasChangeClass()) {
                cell.addClass(className);
            }
        });
    }

    /**
     * Writes the merged rows into the new table. Deleted rows go before the new row that
     * follows them, never inside another group. The rows a kept group lost or gained go under
     * its kept rows, so the group's merged cell spans the kept rows alone and every side by
     * side view keeps its layout.
     * @param oldVersion The old version.
     * @param newVersion The new version.
     * @param columns The column alignments.
     * @param rows The row alignments.
     * @param mergedCells The merged cells of the two versions.
     */
    private emitRows(oldVersion: TableVersion, newVersion: TableVersion, columns: Alignment[], rows: Alignment[], mergedCells: MergedCells): void {
        const table = newVersion.table;
        mergedCells.moveOwnersToKeptRows(columns, rows);

        const keptRows = rows.filter((row): row is SameAlignment => row.kind === "same");
        // the last kept row of the group a row belongs to, by the merged cells of either version
        const lastKeptRowOfGroup = (signatures: string[]): Row | null => {
            let found: Row | null = null;
            keptRows.forEach((row) => {
                const rowSignatures = newVersion.groupSignatures(row.newIndex).concat(oldVersion.groupSignatures(row.oldIndex));
                if (rowSignatures.some((signature) => signatures.indexOf(signature) !== -1)) {
                    found = newVersion.rows[row.newIndex];
                }
            });
            return found;
        };
        // behind the rows already hung onto the group
        const insertAfterGroup = (groupTail: Row, tr: Row): void => {
            let anchor = groupTail;
            for (let sibling = table.nextSibling(anchor); sibling && sibling.changedInGroup; sibling = table.nextSibling(anchor)) {
                anchor = sibling;
            }
            anchor.insertAfter(tr);
        };

        const placeDeletedRow = (tr: Row, oldIndex: number, following: Alignment[]): void => {
            const group = oldVersion.groupSignatures(oldIndex);
            const next = following.filter(
                (row): row is Exclude<Alignment, { kind: "deleted" }> =>
                    row.kind !== "deleted" &&
                    (!newVersion.isContinuationRow(row.newIndex) ||
                        newVersion.groupSignatures(row.newIndex).some((signature) => group.indexOf(signature) !== -1)),
            )[0];
            if (next) {
                newVersion.rows[next.newIndex].insertBefore(tr);
                return;
            }
            // the last row of the table so far, for deleted rows nothing follows
            const tail = last(table.rows());
            if (tail && tail.container !== "thead") {
                tail.insertAfter(tr);
                return;
            }
            table.appendRow(tr);
        };

        // a row without cells (some reports end a group with an empty <tr>) shows nothing, and stays that way
        rows.forEach((row, index) => {
            if (row.kind === "same") {
                if (newVersion.cells[row.newIndex].length > 0) {
                    newVersion.rows[row.newIndex].cells = columns.map((column) => this.buildKeptRowCell(oldVersion, newVersion, row, column));
                }
                return;
            }

            if (row.kind === "added") {
                const addedRow = newVersion.rows[row.newIndex];
                const addedCells = newVersion.cells[row.newIndex];
                const addedGroupTail = lastKeptRowOfGroup(newVersion.groupSignatures(row.newIndex));
                const addedInGroup = !!addedGroupTail && addedCells.length > 0;
                addedRow.added = !addedInGroup;
                if (!addedInGroup) {
                    addedRow.openTag = addTagClass(addedRow.openTag, ROW_ADDED_CLASS);
                }
                if (addedCells.length > 0) {
                    addedRow.cells = columns.map((column) => {
                        if (column.kind === "deleted") {
                            return Cell.placeholder(addedCells, CELL_DELETED_CLASS);
                        }
                        return addedCells[column.newIndex] || Cell.placeholder(addedCells);
                    });
                }
                if (addedInGroup) {
                    addedRow.changedInGroup = true;
                    addedRow.changeClass = CELL_ADDED_CLASS;
                    TableMerger.markChangedCells(addedRow.cells, CELL_ADDED_CLASS);
                    if (addedGroupTail && newVersion.rows.indexOf(addedGroupTail) > row.newIndex) {
                        addedRow.detach();
                        insertAfterGroup(addedGroupTail, addedRow);
                    }
                }
                return;
            }

            const oldRow = oldVersion.rows[row.oldIndex];
            const oldCells = oldVersion.cells[row.oldIndex];
            const deletedGroupTail = lastKeptRowOfGroup(oldVersion.groupSignatures(row.oldIndex));
            const deletedInGroup = !!deletedGroupTail && oldCells.length > 0;
            const tr = new Row(
                deletedInGroup ? oldRow.openTag : addTagClass(oldRow.openTag, ROW_DELETED_CLASS),
                oldCells.map((cell) => cell.clone()),
                null,
            );
            tr.deleted = !deletedInGroup;
            if (oldCells.length > 0) {
                tr.cells = columns.map((column) => {
                    if (column.kind === "added") {
                        return Cell.placeholder(oldCells, CELL_ADDED_CLASS);
                    }
                    return oldCells[column.oldIndex] ? oldCells[column.oldIndex].clone() : Cell.placeholder(oldCells);
                });
            }
            if (deletedInGroup) {
                tr.changedInGroup = true;
                tr.changeClass = CELL_DELETED_CLASS;
                TableMerger.markChangedCells(tr.cells, CELL_DELETED_CLASS);
                insertAfterGroup(deletedGroupTail , tr);
                return;
            }
            if (deletedGroupTail) {
                insertAfterGroup(deletedGroupTail, tr);
                return;
            }
            placeDeletedRow(tr, row.oldIndex, rows.slice(index + 1));
        });
    }
}
