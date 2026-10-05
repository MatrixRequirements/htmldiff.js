/**
 * The table pass. Before the flat diff, every table is compared with its counterpart as a
 * structure: columns, then rows, then cells. A merged table is written into the after HTML in
 * place of the new table: added and deleted rows and columns are whole rows and columns with
 * a class, kept cells hold the diff of their content. Both versions get the same
 * data-htmldiff-id, so the flat diff keeps the table as one equal token and emits the merged
 * markup as it is.
 *
 * Classes used on the merged table: table-row-added, table-row-deleted on tr;
 * table-cell-added, table-cell-deleted on td, th and col.
 */
import { CellDiff } from "./constants";
/** The before and after HTML with the tables prepared. */
export interface PreparedHtml {
    before: string;
    after: string;
}
/** The table pass. */
export declare class TableRedlining {
    private readonly diffContent;
    /**
     * @param diffContent Diffs the content of kept cells.
     */
    constructor(diffContent: CellDiff);
    /**
     * Diffs every table pair structurally and writes the merged table into the after HTML. Both
     * versions of a pair get the same data-htmldiff-id, a table only one version has gets one
     * of its own, so the flat diff keeps every table whole.
     * @param before The HTML content before the changes.
     * @param after The HTML content after the changes.
     * @returns The before and after HTML with the tables prepared.
     */
    redline(before: string, after: string): PreparedHtml;
}
