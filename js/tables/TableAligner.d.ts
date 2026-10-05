/**
 * Which table of the old document is which table of the new one.
 */
import { Alignment } from "./SequenceAligner";
import { Table } from "./Table";
/** Which table of the old document is which table of the new one. */
export declare class TableAligner {
    private readonly oldTables;
    private readonly newTables;
    /**
     * @param oldTables The old tables.
     * @param newTables The new tables.
     */
    constructor(oldTables: Table[], newTables: Table[]);
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
    align(): Alignment[];
    /**
     * What a table's header says.
     * @param version The table.
     * @returns The header rows' signatures joined, null when the table has no header row.
     */
    private static headerSignature;
}
