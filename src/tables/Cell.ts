/**
 * A table cell of the merged table: its tags and content. While spans are expanded it also
 * knows which merged cell it is, or stands for.
 */
import { CELL_ADDED_CLASS, CELL_DELETED_CLASS, HTMLDIFF_ID_ATTRIBUTE } from "./constants";
import { addTagClass, decodeEntities, Element, findElements, getTagAttribute, scanTags } from "./html";

/** The text, the identities of the atomic elements and the images of a cell. */
interface CellContent {
    text: string;
    ids: string[];
    images: string[];
}

/** A table cell of the merged table. */
export class Cell {
    tag: string;
    openTag: string;
    inner: string;
    closeTag: string;
    /** The key of the merged cell this cell is, after the spans were expanded. */
    mergedKey: string | null = null;
    /** The key of the merged cell this empty cell stands for, after the spans were expanded. */
    partOf: string | null = null;
    /** Folded into a merged cell again: not rendered. */
    removed = false;

    /**
     * @param tag The tag name, td or th.
     * @param openTag The opening tag.
     * @param inner The content.
     * @param closeTag The closing tag.
     */
    constructor(tag: string, openTag: string, inner: string, closeTag: string) {
        this.tag = tag;
        this.openTag = openTag;
        this.inner = inner;
        this.closeTag = closeTag;
    }

    /**
     * Reads a cell from its element.
     * @param element The td or th element.
     * @returns The cell.
     */
    static read(element: Element): Cell {
        return new Cell(element.name, element.openTag, element.inner, element.closeTag);
    }

    /**
     * The cells of a row.
     * @param rowInner The inner html of the tr.
     * @returns The cells in order.
     */
    static readRow(rowInner: string): Cell[] {
        return findElements(rowInner, ["td", "th"]).map((element) => Cell.read(element));
    }

    /**
     * An empty cell with the tag of its neighbours.
     * @param siblingCells The cells of the row, for the tag name.
     * @param className (Optional) A class for the cell.
     * @returns The cell.
     */
    static placeholder(siblingCells: Cell[], className?: string): Cell {
        const tag = siblingCells[0] ? siblingCells[0].tag : "td";
        return new Cell(tag, `<${tag}${className ? ` class="${className}"` : ""}>`, "", `</${tag}>`);
    }

    /**
     * An empty cell standing for a merged cell.
     * @param mergedCellKey The key of the merged cell.
     * @param siblingCells The cells of the row, for the tag name.
     * @returns The part.
     */
    static part(mergedCellKey: string, siblingCells: Cell[]): Cell {
        const part = Cell.placeholder(siblingCells);
        part.partOf = mergedCellKey;
        return part;
    }

    /**
     * Copies the cell, like importing a node: the copy is never removed yet.
     * @returns The copy.
     */
    clone(): Cell {
        const copy = new Cell(this.tag, this.openTag, this.inner, this.closeTag);
        copy.mergedKey = this.mergedKey;
        copy.partOf = this.partOf;
        return copy;
    }

    /**
     * Adds a class to the cell.
     * @param className The class.
     */
    addClass(className: string): void {
        this.openTag = addTagClass(this.openTag, className);
    }

    /**
     * Whether the cell is marked as added or deleted.
     * @returns True when the cell carries a change class.
     */
    hasChangeClass(): boolean {
        const classes = (getTagAttribute(this.openTag, "class") || "").split(/\s+/);
        return classes.indexOf(CELL_ADDED_CLASS) !== -1 || classes.indexOf(CELL_DELETED_CLASS) !== -1;
    }

    /**
     * The html of the cell, nothing for a cell folded into a merged cell.
     * @returns The html.
     */
    render(): string {
        return this.removed ? "" : this.openTag + this.inner + this.closeTag;
    }

    /**
     * What the cell shows: its text plus the identities of the atomic elements (chips, images)
     * inside. Hidden helpers are not content.
     * @returns The signature, '' for an empty cell.
     */
    signature(): string {
        const content = this.scanContent();
        const text = content.text.replace(/\s+/g, " ").trim();
        return [text]
            .concat(content.ids, content.images)
            .filter((part) => part !== "")
            .join("|");
    }

    /**
     * The identity the cell itself carries, when its producer gave it one: such a cell names
     * its row.
     * @returns The identity, null when the cell has none.
     */
    ownId(): string | null {
        return getTagAttribute(this.openTag, HTMLDIFF_ID_ATTRIBUTE);
    }

    /**
     * The cell's span, 1 when not set.
     * @param attribute colspan or rowspan.
     * @returns The span.
     */
    span(attribute: "colspan" | "rowspan"): number {
        const span = parseInt(getTagAttribute(this.openTag, attribute) || "", 10);
        return isNaN(span) || span < 1 ? 1 : span;
    }

    /**
     * The cell's tag and spans, e.g. "th:2x1".
     * @returns The shape.
     */
    shape(): string {
        return `${this.tag}:${this.span("colspan")}x${this.span("rowspan")}`;
    }

    /**
     * Scans the content, in order, without anything hidden from view.
     * @returns The content.
     */
    private scanContent(): CellContent {
        const inner = this.inner;
        const openTags: { name: string; hidden: boolean }[] = [];
        let text = "";
        const ids: string[] = [];
        const images: string[] = [];
        let position = 0;
        const isHidden = (): boolean => openTags.some((tag) => tag.hidden);

        scanTags(inner, (tag) => {
            if (!isHidden()) {
                text += inner.slice(position, tag.start);
            }
            position = tag.end;
            if (tag.isComment) {
                return;
            }
            if (tag.isClosing) {
                for (let depth = openTags.length - 1; depth >= 0; depth--) {
                    if (openTags[depth].name === tag.name) {
                        openTags.length = depth;
                        break;
                    }
                }
                return;
            }
            const hidden = getTagAttribute(tag.text, "aria-hidden") === "true";
            if (!hidden && !isHidden()) {
                const id = getTagAttribute(tag.text, HTMLDIFF_ID_ATTRIBUTE);
                if (id !== null) {
                    ids.push(id);
                }
                if (tag.name === "img") {
                    images.push(getTagAttribute(tag.text, "src") || "");
                }
            }
            if (!tag.isSelfClosing) {
                openTags.push({ name: tag.name, hidden });
            }
        });
        if (!isHidden()) {
            text += inner.slice(position);
        }

        return { text: decodeEntities(text), ids, images };
    }
}
