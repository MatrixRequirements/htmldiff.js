/**
 * A table as the alignment reads it: its rows and cells with what they say, and what the
 * merged cells are after the spans were expanded.
 */
import { Cell } from "./Cell";
import { Row } from "./Row";
import { ValueCounts } from "./similarity";
import { Table } from "./Table";
/** A table as the alignment reads it. */
export declare class TableVersion {
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
    constructor(table: Table, rows: Row[], cells: Cell[][]);
    /**
     * Reads a table as the alignment sees it now.
     * @param table The table.
     * @returns The version.
     */
    static read(table: Table): TableVersion;
    /**
     * A version of some of the rows.
     * @param start The first row.
     * @param end The row after the last, the end by default.
     * @returns The version of those rows.
     */
    slice(start: number, end?: number): TableVersion;
    /**
     * The signature of a cell, '' where there is none.
     * @param rowIndex The row.
     * @param columnIndex The column.
     * @returns The signature.
     */
    signatureAt(rowIndex: number, columnIndex: number): string;
    /**
     * Whether another version has the same rows of the same cell shapes.
     * @param other The other version.
     * @returns True when the layouts are the same.
     */
    hasSameShapeAs(other: TableVersion): boolean;
    /**
     * Whether another version has the same merged cells: the same spans on the same cells,
     * whatever the plain rows around them say or how many there are.
     * @param other The other version.
     * @returns True when the merged cells are the same.
     */
    hasSameSpanLayoutAs(other: TableVersion): boolean;
    /**
     * Whether a row is all header cells.
     * @param cells The cells.
     * @returns True for a header row.
     */
    static isHeaderRow(cells: Cell[]): boolean;
    /**
     * How many rows at the top are header rows: in a thead, or all header cells.
     * @returns The count.
     */
    headerRowCount(): number;
    /**
     * Whether a column numbers the body rows 1, 2, 3... Such a column renumbers on every insert.
     * @param columnIndex The column.
     * @returns True for a line number column.
     */
    isSequenceColumn(columnIndex: number): boolean;
    /**
     * What every column holds.
     * @returns The value counts per column.
     */
    columnValueCounts(): ValueCounts[];
    /**
     * What the whole table holds.
     * @returns The value counts.
     */
    valueCounts(): ValueCounts;
    /**
     * The merged cell a part stands for.
     * @param cell The cell.
     * @returns The cell itself, or the merged cell it stands for; undefined when that is gone.
     */
    ownerOf(cell: Cell): Cell | undefined;
    /**
     * The identities of a row's key cells, in order, a part standing for its merged cell. Empty
     * unless cells carry their own identity.
     * @param rowIndex The row.
     * @returns The keys.
     */
    rowKeys(rowIndex: number): string[];
    /**
     * The item refs every row mentions, as smart links, in the order they appear: the first is
     * the item the row is about, the rest are its links. Only inside a document section: in a
     * rich text or a table field a ref is a value like any other. A part of a merged cell stands
     * for that cell, so every row of a group is about the group's item too. Where cells carry
     * their own identity, those identities are the row's refs.
     * @returns The refs of every row.
     */
    itemRefsByRow(): string[][];
    /**
     * Whether any row names an item.
     * @returns True when a row has refs.
     */
    hasItemRows(): boolean;
    /**
     * The item refs a cell holds, a part standing for its merged cell.
     * @param rowIndex The row.
     * @param cellIndex The cell.
     * @returns The refs.
     */
    cellRefs(rowIndex: number, cellIndex: number): string[];
    /**
     * The cell a row names its item in: the first key cell, else the first cell holding item
     * refs, a part standing for its merged cell.
     * @param rowIndex The row.
     * @returns The cell index, -1 when the row names no item.
     */
    itemCellIndex(rowIndex: number): number;
    /**
     * The merged cells a row is part of, by their content, so a group is the same group in
     * both versions.
     * @param rowIndex The row.
     * @returns The signatures of the merged cells.
     */
    groupSignatures(rowIndex: number): string[];
    /**
     * Whether a row is spanned from a merged cell above it.
     * @param rowIndex The row.
     * @returns True for a continuation row.
     */
    isContinuationRow(rowIndex: number): boolean;
}
