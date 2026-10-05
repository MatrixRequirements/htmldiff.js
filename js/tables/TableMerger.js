"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableMerger = void 0;
/**
 * Merges two versions of a table: columns, then rows, then cells. The new table keeps its own
 * rows in their order, deleted rows are cloned from the old table and spliced in. Row state
 * wins over column state, column state wins over a cell diff.
 */
const Cell_1 = require("./Cell");
const ColumnAligner_1 = require("./ColumnAligner");
const constants_1 = require("./constants");
const helpers_1 = require("./helpers");
const html_1 = require("./html");
const MergedCells_1 = require("./MergedCells");
const Row_1 = require("./Row");
const RowAligner_1 = require("./RowAligner");
const TableVersion_1 = require("./TableVersion");
/** Merges two versions of a table. */
class TableMerger {
    /**
     * @param oldTable The old table.
     * @param newTable The new table.
     * @param diffContent Diffs the content of kept cells.
     */
    constructor(oldTable, newTable, diffContent) {
        this.oldTable = oldTable;
        this.newTable = newTable;
        this.diffContent = diffContent;
    }
    /**
     * Merges the two versions.
     * @returns The inner html of the merged table.
     */
    merge() {
        let oldVersion = TableVersion_1.TableVersion.read(this.oldTable);
        let newVersion = TableVersion_1.TableVersion.read(this.newTable);
        if (oldVersion.hasSpans || newVersion.hasSpans) {
            // the same layout is only the same rows when no row says which item it is about
            if (oldVersion.hasSameShapeAs(newVersion) && !oldVersion.hasItemRows() && !newVersion.hasItemRows()) {
                this.diffCellsByPosition(oldVersion, newVersion);
                return this.newTable.renderInner();
            }
            if (this.mergeUnderSameHeader(oldVersion, newVersion)) {
                return this.newTable.renderInner();
            }
            // cells were merged or split between the versions, so a cell is no longer one row x one
            // column. spans are expanded into plain cells and the table is matched like any other
            MergedCells_1.MergedCells.expand(this.oldTable, "old");
            MergedCells_1.MergedCells.expand(this.newTable, "new");
            oldVersion = TableVersion_1.TableVersion.read(this.oldTable);
            newVersion = TableVersion_1.TableVersion.read(this.newTable);
        }
        const columnAligner = new ColumnAligner_1.ColumnAligner(oldVersion, newVersion);
        let columns = columnAligner.align();
        columns = columnAligner.splitReplaced(columns, new RowAligner_1.RowAligner(oldVersion, newVersion, columns).align());
        const rowAligner = new RowAligner_1.RowAligner(oldVersion, newVersion, columns);
        const rows = rowAligner.alternateReplaced(rowAligner.align());
        const mergedCells = new MergedCells_1.MergedCells(oldVersion, newVersion);
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
    mergeUnderSameHeader(oldVersion, newVersion) {
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
        const columns = (0, helpers_1.range)(0, newBody.columnCount).map((index) => ({ kind: "same", oldIndex: index, newIndex: index }));
        const rowAligner = new RowAligner_1.RowAligner(oldBody, newBody, columns);
        this.emitRows(oldBody, newBody, columns, rowAligner.alternateReplaced(rowAligner.align()), new MergedCells_1.MergedCells(oldBody, newBody));
        return true;
    }
    /**
     * Writes the diff of two cells' content into the new cell.
     * @param oldCell The old cell, undefined when there is none.
     * @param newCell The new cell.
     */
    diffCellContent(oldCell, newCell) {
        if (oldCell && oldCell.inner !== newCell.inner) {
            newCell.inner = this.diffContent(oldCell.inner, newCell.inner);
        }
    }
    /**
     * Diffs the cells of two versions of the same layout, cell by cell.
     * @param oldVersion The old version.
     * @param newVersion The new version.
     */
    diffCellsByPosition(oldVersion, newVersion) {
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
    static oldCellToCompare(oldVersion, oldCell, newCell) {
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
    buildKeptRowCell(oldVersion, newVersion, row, column) {
        const newCells = newVersion.cells[row.newIndex];
        const oldCells = oldVersion.cells[row.oldIndex];
        if (column.kind === "deleted") {
            const cell = oldCells[column.oldIndex] ? oldCells[column.oldIndex].clone() : Cell_1.Cell.placeholder(newCells);
            cell.addClass(constants_1.CELL_DELETED_CLASS);
            return cell;
        }
        const newCell = newCells[column.newIndex] || Cell_1.Cell.placeholder(newCells);
        if (column.kind === "added") {
            newCell.addClass(constants_1.CELL_ADDED_CLASS);
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
    static markChangedCells(cells, className) {
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
     * side view keeps its layout. An item whose rows all changed keeps its item cell once, on
     * the first of its old rows.
     * @param oldVersion The old version.
     * @param newVersion The new version.
     * @param columns The column alignments.
     * @param rows The row alignments.
     * @param mergedCells The merged cells of the two versions.
     */
    emitRows(oldVersion, newVersion, columns, rows, mergedCells) {
        const table = newVersion.table;
        mergedCells.moveOwnersToKeptRows(columns, rows);
        const keptRows = rows.filter((row) => row.kind === "same");
        // the last kept row of the group a row belongs to, by the merged cells of either version
        const lastKeptRowOfGroup = (signatures) => {
            let found = null;
            keptRows.forEach((row) => {
                const rowSignatures = newVersion.groupSignatures(row.newIndex).concat(oldVersion.groupSignatures(row.oldIndex));
                if (rowSignatures.some((signature) => signatures.indexOf(signature) !== -1)) {
                    found = newVersion.rows[row.newIndex];
                }
            });
            return found;
        };
        // behind the rows already hung onto the group
        const insertAfterGroup = (groupTail, tr) => {
            let anchor = groupTail;
            for (let sibling = table.nextSibling(anchor); sibling && sibling.changedInGroup; sibling = table.nextSibling(anchor)) {
                anchor = sibling;
            }
            anchor.insertAfter(tr);
        };
        const oldItems = oldVersion.itemRefsByRow().map((refs) => refs[0] || "");
        const newItems = newVersion.itemRefsByRow().map((refs) => refs[0] || "");
        const replacedItemGroups = mergedCells.findReplacedItemGroups(columns, rows, oldItems, newItems);
        const placeDeletedRow = (tr, oldIndex, following) => {
            const group = oldVersion.groupSignatures(oldIndex);
            const next = following.filter((row) => row.kind !== "deleted" &&
                (!newVersion.isContinuationRow(row.newIndex) ||
                    newVersion.groupSignatures(row.newIndex).some((signature) => group.indexOf(signature) !== -1)))[0];
            if (next) {
                newVersion.rows[next.newIndex].insertBefore(tr);
                return;
            }
            // the last row of the table so far, for deleted rows nothing follows
            const tail = (0, helpers_1.last)(table.rows());
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
                const addedItemGroup = addedCells.length > 0 ? replacedItemGroups[newItems[row.newIndex]] : undefined;
                const addedGroupTail = addedItemGroup ? null : lastKeptRowOfGroup(newVersion.groupSignatures(row.newIndex));
                const addedInGroup = !!addedItemGroup || (!!addedGroupTail && addedCells.length > 0);
                addedRow.added = !addedInGroup;
                if (!addedInGroup) {
                    addedRow.openTag = (0, html_1.addTagClass)(addedRow.openTag, constants_1.ROW_ADDED_CLASS);
                }
                if (addedCells.length > 0) {
                    addedRow.cells = columns.map((column) => {
                        if (column.kind === "deleted") {
                            return Cell_1.Cell.placeholder(addedCells, constants_1.CELL_DELETED_CLASS);
                        }
                        return addedCells[column.newIndex] || Cell_1.Cell.placeholder(addedCells);
                    });
                }
                if (addedInGroup) {
                    addedRow.changedInGroup = true;
                    addedRow.changeClass = constants_1.CELL_ADDED_CLASS;
                    // the item cell moved onto the group's first old row
                    if (addedItemGroup && addedRow.cells[addedItemGroup.column] === addedItemGroup.itemCell) {
                        addedRow.cells[addedItemGroup.column] = Cell_1.Cell.part(addedItemGroup.key, addedCells);
                    }
                    TableMerger.markChangedCells(addedRow.cells, constants_1.CELL_ADDED_CLASS);
                    if (addedGroupTail && newVersion.rows.indexOf(addedGroupTail) > row.newIndex) {
                        addedRow.detach();
                        insertAfterGroup(addedGroupTail, addedRow);
                    }
                }
                return;
            }
            const oldRow = oldVersion.rows[row.oldIndex];
            const oldCells = oldVersion.cells[row.oldIndex];
            const deletedItemGroup = oldCells.length > 0 ? replacedItemGroups[oldItems[row.oldIndex]] : undefined;
            const deletedGroupTail = deletedItemGroup ? null : lastKeptRowOfGroup(oldVersion.groupSignatures(row.oldIndex));
            const deletedInGroup = !!deletedItemGroup || (!!deletedGroupTail && oldCells.length > 0);
            const tr = new Row_1.Row(deletedInGroup ? oldRow.openTag : (0, html_1.addTagClass)(oldRow.openTag, constants_1.ROW_DELETED_CLASS), oldCells.map((cell) => cell.clone()), null);
            tr.deleted = !deletedInGroup;
            if (oldCells.length > 0) {
                tr.cells = columns.map((column) => {
                    if (column.kind === "added") {
                        return Cell_1.Cell.placeholder(oldCells, constants_1.CELL_ADDED_CLASS);
                    }
                    return oldCells[column.oldIndex] ? oldCells[column.oldIndex].clone() : Cell_1.Cell.placeholder(oldCells);
                });
            }
            if (deletedInGroup) {
                tr.changedInGroup = true;
                tr.changeClass = constants_1.CELL_DELETED_CLASS;
                TableMerger.markChangedCells(tr.cells, constants_1.CELL_DELETED_CLASS);
                if (deletedItemGroup) {
                    // the item cell, once, on the first old row; the other rows hold parts of it
                    if (deletedItemGroup.placed) {
                        tr.cells[deletedItemGroup.column] = Cell_1.Cell.part(deletedItemGroup.key, oldCells);
                    }
                    else {
                        this.diffCellContent(deletedItemGroup.oldItemCell, deletedItemGroup.itemCell);
                        tr.cells[deletedItemGroup.column] = deletedItemGroup.itemCell;
                        deletedItemGroup.placed = true;
                    }
                    newVersion.rows[deletedItemGroup.newIndexes[0]].insertBefore(tr);
                    return;
                }
                insertAfterGroup(deletedGroupTail, tr);
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
exports.TableMerger = TableMerger;
