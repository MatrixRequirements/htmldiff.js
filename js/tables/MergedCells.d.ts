/**
 * Merged cells: while the table is aligned, a merged cell is split into plain cells. The
 * merged cell keeps the content, empty parts take the other slots, both carry the merged
 * cell's key so it can be put back together after. Groups whose item stays keep their item
 * cell on a row every view shows.
 */
import { Cell } from "./Cell";
import { Alignment } from "./SequenceAligner";
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
export declare class MergedCells {
    private readonly oldVersion;
    private readonly newVersion;
    /**
     * @param oldVersion The old version, spans expanded.
     * @param newVersion The new version, spans expanded.
     */
    constructor(oldVersion: TableVersion, newVersion: TableVersion);
    /**
     * Turns every merged cell of a table into plain cells: the content stays in the first slot,
     * empty parts take the rest.
     * @param table The table.
     * @param versionKey Prefix of the merged cell keys, 'old' or 'new'.
     */
    static expand(table: Table, versionKey: string): void;
    /**
     * The merged table is laid out, so every merged cell spans again over the largest block of
     * its own empty parts next to it. A side by side view hides the deleted rows or the added
     * rows: a cell spanning a hidden row would reach into the rows below it, so a merged cell
     * only spans rows that are shown together with its own row, and a cell carrying a change
     * never spans rows at all. A part cut off from its merged cell stays a plain cell.
     */
    fold(): void;
    /**
     * A group's merged cell goes onto the group's first kept row, in both versions: a row only
     * one version has is hidden in one side by side view, and the group's item has to stay in
     * sight. A plain kept cell showing what the old merged cell showed is that merged cell: the
     * group shrank to this row, and the cell still spans the rows the group lost.
     * @param columns The column alignments.
     * @param rows The row alignments.
     */
    moveOwnersToKeptRows(columns: Alignment[], rows: Alignment[]): void;
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
    findReplacedItemGroups(columns: Alignment[], rows: Alignment[], oldItems: string[], newItems: string[]): Record<string, ReplacedItemGroup>;
    /**
     * Whether the indexes follow each other without a gap.
     * @param indexes The indexes, ascending.
     * @returns True when consecutive.
     */
    private static isConsecutive;
}
