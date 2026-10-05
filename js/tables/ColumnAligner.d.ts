import { Alignment } from "./SequenceAligner";
import { TableVersion } from "./TableVersion";
/** Which column of the old table is which column of the new one. */
export declare class ColumnAligner {
    private readonly oldVersion;
    private readonly newVersion;
    /**
     * @param oldVersion The old version.
     * @param newVersion The new version.
     */
    constructor(oldVersion: TableVersion, newVersion: TableVersion);
    /**
     * Columns are identified by the values they hold, order ignored, so row inserts and
     * reorders do not shift them. The header cell, when there is one, is just one more value.
     * @returns The column alignments.
     */
    align(): Alignment[];
    /**
     * A column paired by position is another column when no kept row keeps what it said in it:
     * the old column was deleted and a new one added in its place. One kept row is not enough
     * to tell that from a cell edit. A line number column renumbers whenever rows move, it is
     * never replaced.
     * @param columns The column alignments.
     * @param rows The row alignments.
     * @returns The column alignments, replaced columns split in two.
     */
    splitReplaced(columns: Alignment[], rows: Alignment[]): Alignment[];
    /**
     * One col per merged column, so a deleted column keeps the width it had. The column class
     * on the col lets side by side hide the whole column: chrome keeps a col's width even when
     * all its cells are hidden.
     * @param columns The column alignments.
     * @param mergedInner The inner html of the merged table.
     * @returns The inner html with the colgroup rebuilt, untouched when neither table has one.
     */
    rebuildColgroup(columns: Alignment[], mergedInner: string): string;
    /**
     * The col tags of a table's colgroups.
     * @param tableInner The inner html of the table.
     * @returns The col tags in order.
     */
    private static colTags;
}
