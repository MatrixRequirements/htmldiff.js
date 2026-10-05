import { Element } from "./html";
/** A table cell of the merged table. */
export declare class Cell {
    tag: string;
    openTag: string;
    inner: string;
    closeTag: string;
    /** The key of the merged cell this cell is, after the spans were expanded. */
    mergedKey: string | null;
    /** The key of the merged cell this empty cell stands for, after the spans were expanded. */
    partOf: string | null;
    /** Folded into a merged cell again: not rendered. */
    removed: boolean;
    /**
     * @param tag The tag name, td or th.
     * @param openTag The opening tag.
     * @param inner The content.
     * @param closeTag The closing tag.
     */
    constructor(tag: string, openTag: string, inner: string, closeTag: string);
    /**
     * Reads a cell from its element.
     * @param element The td or th element.
     * @returns The cell.
     */
    static read(element: Element): Cell;
    /**
     * The cells of a row.
     * @param rowInner The inner html of the tr.
     * @returns The cells in order.
     */
    static readRow(rowInner: string): Cell[];
    /**
     * An empty cell with the tag of its neighbours.
     * @param siblingCells The cells of the row, for the tag name.
     * @param className (Optional) A class for the cell.
     * @returns The cell.
     */
    static placeholder(siblingCells: Cell[], className?: string): Cell;
    /**
     * An empty cell standing for a merged cell.
     * @param mergedCellKey The key of the merged cell.
     * @param siblingCells The cells of the row, for the tag name.
     * @returns The part.
     */
    static part(mergedCellKey: string, siblingCells: Cell[]): Cell;
    /**
     * Copies the cell, like importing a node: the copy is never removed yet.
     * @returns The copy.
     */
    clone(): Cell;
    /**
     * Adds a class to the cell.
     * @param className The class.
     */
    addClass(className: string): void;
    /**
     * Whether the cell is marked as added or deleted.
     * @returns True when the cell carries a change class.
     */
    hasChangeClass(): boolean;
    /**
     * The html of the cell, nothing for a cell folded into a merged cell.
     * @returns The html.
     */
    render(): string;
    /**
     * What the cell shows: its text plus the identities of the atomic elements (chips, images)
     * inside. Hidden helpers are not content.
     * @returns The signature, '' for an empty cell.
     */
    signature(): string;
    /**
     * The item refs the cell holds, as smart links, in order.
     * @returns The refs.
     */
    itemRefs(): string[];
    /**
     * The identity the cell itself carries, when its producer gave it one: such a cell names
     * its row.
     * @returns The identity, null when the cell has none.
     */
    ownId(): string | null;
    /**
     * The cell's span, 1 when not set.
     * @param attribute colspan or rowspan.
     * @returns The span.
     */
    span(attribute: "colspan" | "rowspan"): number;
    /**
     * The cell's tag and spans, e.g. "th:2x1".
     * @returns The shape.
     */
    shape(): string;
    /**
     * Scans the content, in order, without anything hidden from view.
     * @returns The content.
     */
    private scanContent;
}
