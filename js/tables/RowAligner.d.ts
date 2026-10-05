import { Alignment } from "./SequenceAligner";
import { TableVersion } from "./TableVersion";
/** Which row of the old table is which row of the new one. */
export declare class RowAligner {
    private readonly oldVersion;
    private readonly newVersion;
    private readonly comparedColumns;
    /**
     * @param oldVersion The old version.
     * @param newVersion The new version.
     * @param columns The column alignments: rows are compared on kept columns only.
     */
    constructor(oldVersion: TableVersion, newVersion: TableVersion, columns: Alignment[]);
    /**
     * Refs only added to a cell, or only removed from it, leave it the same cell with other
     * content. A ref swapped for another makes it another cell, and its row another row: a
     * trace or an execution is named by its ref.
     * @param oldRefs The old cell's refs.
     * @param newRefs The new cell's refs.
     * @returns True when one side's refs contain the other's.
     */
    static haveCompatibleRefs(oldRefs: string[], newRefs: string[]): boolean;
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
    align(): Alignment[];
    /**
     * Where rows were replaced, each deleted row is followed by the added row in its place, so
     * the reader sees old and new together. A group (a row and the rows its merged cell spans)
     * moves as one.
     * @param rows The row alignments.
     * @returns The row alignments, replaced runs alternated.
     */
    alternateReplaced(rows: Alignment[]): Alignment[];
    /**
     * Consecutive rows, split before every row that starts a new unit.
     * @param rows The rows.
     * @param continuesUnit Whether a row belongs to the unit before it.
     * @returns The units.
     */
    private static groupIntoUnits;
}
