/**
 * A row of the merged table: kept, added or deleted. A new row keeps its place in the table
 * unless it is detached and hung onto another row, like the deleted rows are.
 */
import { Cell } from "./Cell";

/** What a row is in the merged table. */
export type RowKind = "kept" | "added" | "deleted";

/** A row of the merged table. */
export class Row {
    openTag: string;
    cells: Cell[];
    /** thead, tbody, tfoot, or null for a row directly in the table. */
    container: string | null;
    /** The rows hung right before this one, in order. */
    before: Row[] = [];
    /** The rows hung right after this one, in order. */
    after: Row[] = [];
    added = false;
    deleted = false;
    /** Taken out of its place in the table, hung elsewhere. */
    detached = false;
    /** A row a kept group lost or gained: its cells carry the change, the row itself is kept. */
    changedInGroup = false;
    changeClass: string | null = null;

    /**
     * @param openTag The tr's opening tag.
     * @param cells The cells.
     * @param container The row group the row is in.
     */
    constructor(openTag: string, cells: Cell[], container: string | null) {
        this.openTag = openTag;
        this.cells = cells;
        this.container = container;
    }

    /**
     * What the row is in the merged table.
     * @returns kept, added or deleted.
     */
    kind(): RowKind {
        if (this.deleted) {
            return "deleted";
        }
        return this.added ? "added" : "kept";
    }

    /**
     * The html of the row and the rows hung onto it.
     * @returns The html.
     */
    render(): string {
        return Row.renderAll(this.before) + this.openTag + this.cells.map((cell) => cell.render()).join("") + "</tr>" + Row.renderAll(this.after);
    }

    /**
     * The html of rows.
     * @param rows The rows.
     * @returns The html.
     */
    static renderAll(rows: Row[]): string {
        return rows.map((row) => row.render()).join("");
    }

    /**
     * Hangs a row right before this one, like Element.before.
     * @param row The row to hang.
     */
    insertBefore(row: Row): void {
        row.container = this.container;
        this.before.push(row);
    }

    /**
     * Hangs a row right after this one, like Element.after.
     * @param row The row to hang.
     */
    insertAfter(row: Row): void {
        row.container = this.container;
        this.after.unshift(row);
    }

    /**
     * Takes the row out of its place in the table, to hang it elsewhere.
     */
    detach(): void {
        this.detached = true;
    }

    /**
     * This row and the rows hung onto it, in document order.
     * @param rows Collects the rows.
     */
    collect(rows: Row[]): void {
        this.before.forEach((row) => row.collect(rows));
        rows.push(this);
        this.after.forEach((row) => row.collect(rows));
    }
}
