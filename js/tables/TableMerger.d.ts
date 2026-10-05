import { CellDiff } from "./constants";
import { Table } from "./Table";
/** Merges two versions of a table. */
export declare class TableMerger {
    private readonly oldTable;
    private readonly newTable;
    private readonly diffContent;
    /**
     * @param oldTable The old table.
     * @param newTable The new table.
     * @param diffContent Diffs the content of kept cells.
     */
    constructor(oldTable: Table, newTable: Table, diffContent: CellDiff);
    /**
     * Merges the two versions.
     * @returns The inner html of the merged table.
     */
    merge(): string;
    /**
     * Merged cells only in an unchanged header (report tables): the body is plain rows over
     * fixed columns.
     * @param oldVersion The old version.
     * @param newVersion The new version.
     * @returns True when the tables were merged this way.
     */
    private mergeUnderSameHeader;
    /**
     * Writes the diff of two cells' content into the new cell.
     * @param oldCell The old cell, undefined when there is none.
     * @param newCell The new cell.
     */
    private diffCellContent;
    /**
     * Diffs the cells of two versions of the same layout, cell by cell.
     * @param oldVersion The old version.
     * @param newVersion The new version.
     */
    private diffCellsByPosition;
    /**
     * An old part counts as empty, unless the new cell shows the merged cell that part stood
     * for: then the group's cell moved onto this row and nothing changed.
     * @param oldVersion The old version.
     * @param oldCell The old cell.
     * @param newCell The new cell.
     * @returns The old cell to compare with.
     */
    private static oldCellToCompare;
    /**
     * The cell of a kept row for one merged column.
     * @param oldVersion The old version.
     * @param newVersion The new version.
     * @param row The kept row.
     * @param column The column.
     * @returns The cell.
     */
    private buildKeptRowCell;
    /**
     * The cells of a row its group lost or gained carry the change; a part of a merged cell
     * shows nothing itself and stays as it is, so the group's cell spans the row.
     * @param cells The cells.
     * @param className The change class.
     */
    private static markChangedCells;
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
    private emitRows;
}
