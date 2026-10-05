import { Element } from "./html";
import { Row } from "./Row";
/** The place where a row appended to the table body goes. */
export interface AppendChunk {
    appended: Row[];
    container: string | null;
}
/** A piece of a table's inner html: markup, a row, or the append place. */
export declare type Chunk = string | Row | AppendChunk;
/** A table as it stands in the html, and the merged table rendered back from it. */
export declare class Table {
    openTag: string;
    readonly closeTag: string;
    readonly start: number;
    readonly end: number;
    readonly inner: string;
    /** Whether a document section holds the table. */
    readonly inSection: boolean;
    readonly chunks: Chunk[];
    readonly appendChunk: AppendChunk;
    /**
     * @param element The table element.
     * @param inSection Whether a document section holds the table.
     * @param chunks The inner html as chunks.
     * @param appendChunk The place where a row appended to the table body goes.
     */
    private constructor();
    /**
     * Reads a table.
     * @param element The table element.
     * @param inSection Whether a document section holds the table.
     * @returns The table.
     */
    static read(element: Element, inSection: boolean): Table;
    /**
     * The tables outside any other table, each knowing whether a document section holds it.
     * @param html The html.
     * @returns The tables in document order.
     */
    static findTopLevel(html: string): Table[];
    /**
     * The identity the table came with, like an item's table in a report.
     * @returns The identity, undefined when the table has none.
     */
    ownId(): string | undefined;
    /**
     * Gives the table an identity unless it has one.
     * @param fallbackId The identity to give.
     * @returns The table's identity.
     */
    ensureId(fallbackId: string): string;
    /**
     * Every row of the merged table so far in document order, deleted rows included.
     * @returns The rows.
     */
    documentRows(): Row[];
    /**
     * The rows inside thead, tbody and tfoot in their order, rows directly in the table last.
     * @returns The rows.
     */
    rows(): Row[];
    /**
     * The row after another in the same row group, like Element.nextElementSibling.
     * @param row The row.
     * @returns The next row, or null.
     */
    nextSibling(row: Row): Row | null;
    /**
     * Appends a row to the table body, like appendChild on the tbody.
     * @param row The row.
     */
    appendRow(row: Row): void;
    /**
     * The inner html of the merged table.
     * @returns The html.
     */
    renderInner(): string;
}
