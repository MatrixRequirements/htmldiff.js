"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableVersion = void 0;
const helpers_1 = require("./helpers");
const similarity_1 = require("./similarity");
/** A table as the alignment reads it. */
class TableVersion {
    /**
     * @param table The table.
     * @param rows The rows read.
     * @param cells The cells of every row.
     */
    constructor(table, rows, cells) {
        this.table = table;
        this.rows = rows;
        this.cells = cells;
        this.signatures = cells.map((rowCells) => rowCells.map((cell) => cell.signature()));
        this.shapes = cells.map((rowCells) => rowCells.map((cell) => cell.shape()).join("|"));
        this.columnCount = cells.reduce((max, rowCells) => Math.max(max, rowCells.length), 0);
        this.hasSpans = (0, helpers_1.flatten)(cells).some((cell) => cell.span("colspan") > 1 || cell.span("rowspan") > 1);
        this.hasRowKeys = (0, helpers_1.flatten)(cells).some((cell) => cell.ownId() !== null);
        this.mergedCells = Object.create(null);
        cells.forEach((rowCells, rowIndex) => {
            rowCells.forEach((cell, cellIndex) => {
                if (cell.mergedKey !== null) {
                    this.mergedCells[cell.mergedKey] = this.signatures[rowIndex][cellIndex];
                }
            });
        });
    }
    /**
     * Reads a table as the alignment sees it now.
     * @param table The table.
     * @returns The version.
     */
    static read(table) {
        const rows = table.rows();
        return new TableVersion(table, rows, rows.map((row) => row.cells));
    }
    /**
     * A version of some of the rows.
     * @param start The first row.
     * @param end The row after the last, the end by default.
     * @returns The version of those rows.
     */
    slice(start, end = this.rows.length) {
        return new TableVersion(this.table, this.rows.slice(start, end), this.cells.slice(start, end));
    }
    /**
     * The signature of a cell, '' where there is none.
     * @param rowIndex The row.
     * @param columnIndex The column.
     * @returns The signature.
     */
    signatureAt(rowIndex, columnIndex) {
        const rowSignatures = this.signatures[rowIndex];
        return rowSignatures && rowSignatures[columnIndex] !== undefined ? rowSignatures[columnIndex] : "";
    }
    /**
     * Whether another version has the same rows of the same cell shapes.
     * @param other The other version.
     * @returns True when the layouts are the same.
     */
    hasSameShapeAs(other) {
        return this.shapes.length === other.shapes.length && this.shapes.every((shape, index) => shape === other.shapes[index]);
    }
    /**
     * Whether another version has the same merged cells: the same spans on the same cells,
     * whatever the plain rows around them say or how many there are.
     * @param other The other version.
     * @returns True when the merged cells are the same.
     */
    hasSameSpanLayoutAs(other) {
        const layout = (version) => {
            const spans = [];
            version.cells.forEach((rowCells) => {
                rowCells.forEach((cell, cellIndex) => {
                    if (cell.span("colspan") > 1 || cell.span("rowspan") > 1) {
                        spans.push(`${cellIndex}:${cell.shape()}`);
                    }
                });
            });
            return spans.sort().join(",");
        };
        return layout(this) === layout(other);
    }
    /**
     * Whether a row is all header cells.
     * @param cells The cells.
     * @returns True for a header row.
     */
    static isHeaderRow(cells) {
        return cells.length > 0 && cells.every((cell) => cell.tag === "th");
    }
    /**
     * How many rows at the top are header rows: in a thead, or all header cells.
     * @returns The count.
     */
    headerRowCount() {
        for (let rowIndex = 0; rowIndex < this.rows.length; rowIndex++) {
            if (this.rows[rowIndex].container !== "thead" && !TableVersion.isHeaderRow(this.cells[rowIndex])) {
                return rowIndex;
            }
        }
        return this.rows.length;
    }
    /**
     * Whether a column numbers the body rows 1, 2, 3... Such a column renumbers on every insert.
     * @param columnIndex The column.
     * @returns True for a line number column.
     */
    isSequenceColumn(columnIndex) {
        const bodyRows = (0, helpers_1.range)(0, this.rows.length).filter((rowIndex) => !TableVersion.isHeaderRow(this.cells[rowIndex]));
        return bodyRows.length > 0 && bodyRows.every((rowIndex, position) => this.signatureAt(rowIndex, columnIndex) === String(position + 1));
    }
    /**
     * What every column holds.
     * @returns The value counts per column.
     */
    columnValueCounts() {
        return (0, helpers_1.range)(0, this.columnCount).map((columnIndex) => (0, similarity_1.countValues)(this.signatures.map((rowSignatures) => (rowSignatures[columnIndex] === undefined ? "" : rowSignatures[columnIndex]))));
    }
    /**
     * What the whole table holds.
     * @returns The value counts.
     */
    valueCounts() {
        return (0, similarity_1.countValues)((0, helpers_1.flatten)(this.signatures));
    }
    /**
     * The merged cell a part stands for.
     * @param cell The cell.
     * @returns The cell itself, or the merged cell it stands for; undefined when that is gone.
     */
    ownerOf(cell) {
        if (cell.partOf === null) {
            return cell;
        }
        const partOf = cell.partOf;
        return (0, helpers_1.flatten)(this.cells).filter((other) => other.mergedKey === partOf)[0];
    }
    /**
     * The identities of a row's key cells, in order, a part standing for its merged cell. Empty
     * unless cells carry their own identity.
     * @param rowIndex The row.
     * @returns The keys.
     */
    rowKeys(rowIndex) {
        if (!this.hasRowKeys) {
            return [];
        }
        const keys = [];
        this.cells[rowIndex].forEach((cell) => {
            const owner = this.ownerOf(cell);
            const key = owner ? owner.ownId() : null;
            if (key !== null) {
                keys.push(key);
            }
        });
        return keys;
    }
    /**
     * The item refs every row mentions, as smart links, in the order they appear: the first is
     * the item the row is about, the rest are its links. Only inside a document section: in a
     * rich text or a table field a ref is a value like any other. A part of a merged cell stands
     * for that cell, so every row of a group is about the group's item too. Where cells carry
     * their own identity, those identities are the row's refs.
     * @returns The refs of every row.
     */
    itemRefsByRow() {
        if (this.hasRowKeys) {
            return this.rows.map((_, rowIndex) => this.rowKeys(rowIndex));
        }
        if (!this.table.inSection) {
            return this.rows.map(() => []);
        }
        const mergedCellRefs = Object.create(null);
        (0, helpers_1.flatten)(this.cells).forEach((cell) => {
            if (cell.mergedKey !== null) {
                mergedCellRefs[cell.mergedKey] = cell.itemRefs();
            }
        });
        return this.cells.map((rowCells) => (0, helpers_1.uniqueValues)((0, helpers_1.flatten)(rowCells.map((cell) => (cell.partOf === null ? cell.itemRefs() : mergedCellRefs[cell.partOf] || [])))));
    }
    /**
     * Whether any row names an item.
     * @returns True when a row has refs.
     */
    hasItemRows() {
        return this.itemRefsByRow().some((refs) => refs.length > 0);
    }
    /**
     * The item refs a cell holds, a part standing for its merged cell.
     * @param rowIndex The row.
     * @param cellIndex The cell.
     * @returns The refs.
     */
    cellRefs(rowIndex, cellIndex) {
        const cell = this.cells[rowIndex][cellIndex];
        if (!cell) {
            return [];
        }
        const owner = this.ownerOf(cell);
        return owner ? owner.itemRefs() : [];
    }
    /**
     * The cell a row names its item in: the first key cell, else the first cell holding item
     * refs, a part standing for its merged cell.
     * @param rowIndex The row.
     * @returns The cell index, -1 when the row names no item.
     */
    itemCellIndex(rowIndex) {
        const cells = this.cells[rowIndex];
        for (let index = 0; index < cells.length; index++) {
            const owner = this.ownerOf(cells[index]);
            if (!owner) {
                continue;
            }
            if (this.hasRowKeys ? owner.ownId() !== null : owner.itemRefs().length > 0) {
                return index;
            }
        }
        return -1;
    }
    /**
     * The merged cells a row is part of, by their content, so a group is the same group in
     * both versions.
     * @param rowIndex The row.
     * @returns The signatures of the merged cells.
     */
    groupSignatures(rowIndex) {
        return (0, helpers_1.flatten)(this.cells[rowIndex].map((cell) => {
            const key = cell.mergedKey !== null ? cell.mergedKey : cell.partOf;
            const signature = key === null ? undefined : this.mergedCells[key];
            return signature === undefined || signature === "" ? [] : [signature];
        }));
    }
    /**
     * Whether a row is spanned from a merged cell above it.
     * @param rowIndex The row.
     * @returns True for a continuation row.
     */
    isContinuationRow(rowIndex) {
        const rowCells = this.cells[rowIndex];
        return rowCells.some((cell) => cell.partOf !== null && !rowCells.some((other) => other.mergedKey === cell.partOf));
    }
}
exports.TableVersion = TableVersion;
