"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Row = void 0;
/** A row of the merged table. */
class Row {
    /**
     * @param openTag The tr's opening tag.
     * @param cells The cells.
     * @param container The row group the row is in.
     */
    constructor(openTag, cells, container) {
        /** The rows hung right before this one, in order. */
        this.before = [];
        /** The rows hung right after this one, in order. */
        this.after = [];
        this.added = false;
        this.deleted = false;
        /** Taken out of its place in the table, hung elsewhere. */
        this.detached = false;
        /** A row a kept group lost or gained: its cells carry the change, the row itself is kept. */
        this.changedInGroup = false;
        this.changeClass = null;
        this.openTag = openTag;
        this.cells = cells;
        this.container = container;
    }
    /**
     * What the row is in the merged table.
     * @returns kept, added or deleted.
     */
    kind() {
        if (this.deleted) {
            return "deleted";
        }
        return this.added ? "added" : "kept";
    }
    /**
     * The html of the row and the rows hung onto it.
     * @returns The html.
     */
    render() {
        return Row.renderAll(this.before) + this.openTag + this.cells.map((cell) => cell.render()).join("") + "</tr>" + Row.renderAll(this.after);
    }
    /**
     * The html of rows.
     * @param rows The rows.
     * @returns The html.
     */
    static renderAll(rows) {
        return rows.map((row) => row.render()).join("");
    }
    /**
     * Hangs a row right before this one, like Element.before.
     * @param row The row to hang.
     */
    insertBefore(row) {
        row.container = this.container;
        this.before.push(row);
    }
    /**
     * Hangs a row right after this one, like Element.after.
     * @param row The row to hang.
     */
    insertAfter(row) {
        row.container = this.container;
        this.after.unshift(row);
    }
    /**
     * Takes the row out of its place in the table, to hang it elsewhere.
     */
    detach() {
        this.detached = true;
    }
    /**
     * This row and the rows hung onto it, in document order.
     * @param rows Collects the rows.
     */
    collect(rows) {
        this.before.forEach((row) => row.collect(rows));
        rows.push(this);
        this.after.forEach((row) => row.collect(rows));
    }
}
exports.Row = Row;
