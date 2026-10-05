/**
 * A table as the alignment reads it: its rows and cells with what they say, and what the
 * merged cells are after the spans were expanded.
 */
import { Cell } from "./Cell";
import { flatten, range, uniqueValues } from "./helpers";
import { Row } from "./Row";
import { countValues, ValueCounts } from "./similarity";
import { Table } from "./Table";

/** A table as the alignment reads it. */
export class TableVersion {
    readonly table: Table;
    readonly rows: Row[];
    readonly cells: Cell[][];
    readonly signatures: string[][];
    /** Per row: tag and span of every cell, e.g. "th:2x1|th:1x1". */
    readonly shapes: string[];
    readonly columnCount: number;
    readonly hasSpans: boolean;
    /** Whether cells carry their own identity: then those cells alone name their rows. */
    readonly hasRowKeys: boolean;
    /** After the spans were expanded: the signature of every merged cell, by its key. */
    readonly mergedCells: Record<string, string>;

    /**
     * @param table The table.
     * @param rows The rows read.
     * @param cells The cells of every row.
     */
    constructor(table: Table, rows: Row[], cells: Cell[][]) {
        this.table = table;
        this.rows = rows;
        this.cells = cells;
        this.signatures = cells.map((rowCells) => rowCells.map((cell) => cell.signature()));
        this.shapes = cells.map((rowCells) => rowCells.map((cell) => cell.shape()).join("|"));
        this.columnCount = cells.reduce((max, rowCells) => Math.max(max, rowCells.length), 0);
        this.hasSpans = flatten(cells).some((cell) => cell.span("colspan") > 1 || cell.span("rowspan") > 1);
        this.hasRowKeys = flatten(cells).some((cell) => cell.ownId() !== null);
        this.mergedCells = Object.create(null) as Record<string, string>;
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
    static read(table: Table): TableVersion {
        const rows = table.rows();
        return new TableVersion(
            table,
            rows,
            rows.map((row) => row.cells),
        );
    }

    /**
     * A version of some of the rows.
     * @param start The first row.
     * @param end The row after the last, the end by default.
     * @returns The version of those rows.
     */
    slice(start: number, end: number = this.rows.length): TableVersion {
        return new TableVersion(this.table, this.rows.slice(start, end), this.cells.slice(start, end));
    }

    /**
     * The signature of a cell, '' where there is none.
     * @param rowIndex The row.
     * @param columnIndex The column.
     * @returns The signature.
     */
    signatureAt(rowIndex: number, columnIndex: number): string {
        const rowSignatures = this.signatures[rowIndex];
        return rowSignatures && rowSignatures[columnIndex] !== undefined ? rowSignatures[columnIndex] : "";
    }

    /**
     * Whether another version has the same rows of the same cell shapes.
     * @param other The other version.
     * @returns True when the layouts are the same.
     */
    hasSameShapeAs(other: TableVersion): boolean {
        return this.shapes.length === other.shapes.length && this.shapes.every((shape, index) => shape === other.shapes[index]);
    }

    /**
     * Whether another version has the same merged cells: the same spans on the same cells,
     * whatever the plain rows around them say or how many there are.
     * @param other The other version.
     * @returns True when the merged cells are the same.
     */
    hasSameSpanLayoutAs(other: TableVersion): boolean {
        const layout = (version: TableVersion): string => {
            const spans: string[] = [];
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
    static isHeaderRow(cells: Cell[]): boolean {
        return cells.length > 0 && cells.every((cell) => cell.tag === "th");
    }

    /**
     * How many rows at the top are header rows: in a thead, or all header cells.
     * @returns The count.
     */
    headerRowCount(): number {
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
    isSequenceColumn(columnIndex: number): boolean {
        const bodyRows = range(0, this.rows.length).filter((rowIndex) => !TableVersion.isHeaderRow(this.cells[rowIndex]));
        return bodyRows.length > 0 && bodyRows.every((rowIndex, position) => this.signatureAt(rowIndex, columnIndex) === String(position + 1));
    }

    /**
     * What every column holds.
     * @returns The value counts per column.
     */
    columnValueCounts(): ValueCounts[] {
        return range(0, this.columnCount).map((columnIndex) =>
            countValues(this.signatures.map((rowSignatures) => (rowSignatures[columnIndex] === undefined ? "" : rowSignatures[columnIndex]))),
        );
    }

    /**
     * What the whole table holds.
     * @returns The value counts.
     */
    valueCounts(): ValueCounts {
        return countValues(flatten(this.signatures));
    }

    /**
     * The merged cell a part stands for.
     * @param cell The cell.
     * @returns The cell itself, or the merged cell it stands for; undefined when that is gone.
     */
    ownerOf(cell: Cell): Cell | undefined {
        if (cell.partOf === null) {
            return cell;
        }
        const partOf = cell.partOf;
        return flatten(this.cells).filter((other) => other.mergedKey === partOf)[0];
    }

    /**
     * The identities of a row's key cells, in order, a part standing for its merged cell. Empty
     * unless cells carry their own identity.
     * @param rowIndex The row.
     * @returns The keys.
     */
    rowKeys(rowIndex: number): string[] {
        if (!this.hasRowKeys) {
            return [];
        }
        const keys: string[] = [];
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
    itemRefsByRow(): string[][] {
        if (this.hasRowKeys) {
            return this.rows.map((_, rowIndex) => this.rowKeys(rowIndex));
        }
        if (!this.table.inSection) {
            return this.rows.map(() => []);
        }
        const mergedCellRefs: Record<string, string[]> = Object.create(null) as Record<string, string[]>;
        flatten(this.cells).forEach((cell) => {
            if (cell.mergedKey !== null) {
                mergedCellRefs[cell.mergedKey] = cell.itemRefs();
            }
        });
        return this.cells.map((rowCells) =>
            uniqueValues(flatten(rowCells.map((cell) => (cell.partOf === null ? cell.itemRefs() : mergedCellRefs[cell.partOf] || [])))),
        );
    }

    /**
     * Whether any row names an item.
     * @returns True when a row has refs.
     */
    hasItemRows(): boolean {
        return this.itemRefsByRow().some((refs) => refs.length > 0);
    }

    /**
     * The item refs a cell holds, a part standing for its merged cell.
     * @param rowIndex The row.
     * @param cellIndex The cell.
     * @returns The refs.
     */
    cellRefs(rowIndex: number, cellIndex: number): string[] {
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
    itemCellIndex(rowIndex: number): number {
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
    groupSignatures(rowIndex: number): string[] {
        return flatten(
            this.cells[rowIndex].map((cell) => {
                const key = cell.mergedKey !== null ? cell.mergedKey : cell.partOf;
                const signature = key === null ? undefined : this.mergedCells[key];
                return signature === undefined || signature === "" ? [] : [signature];
            }),
        );
    }

    /**
     * Whether a row is spanned from a merged cell above it.
     * @param rowIndex The row.
     * @returns True for a continuation row.
     */
    isContinuationRow(rowIndex: number): boolean {
        const rowCells = this.cells[rowIndex];
        return rowCells.some((cell) => cell.partOf !== null && !rowCells.some((other) => other.mergedKey === cell.partOf));
    }
}
