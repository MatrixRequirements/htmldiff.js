"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cell = void 0;
/**
 * A table cell of the merged table: its tags and content. While spans are expanded it also
 * knows which merged cell it is, or stands for.
 */
const constants_1 = require("./constants");
const html_1 = require("./html");
/** A table cell of the merged table. */
class Cell {
    /**
     * @param tag The tag name, td or th.
     * @param openTag The opening tag.
     * @param inner The content.
     * @param closeTag The closing tag.
     */
    constructor(tag, openTag, inner, closeTag) {
        /** The key of the merged cell this cell is, after the spans were expanded. */
        this.mergedKey = null;
        /** The key of the merged cell this empty cell stands for, after the spans were expanded. */
        this.partOf = null;
        /** Folded into a merged cell again: not rendered. */
        this.removed = false;
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
    static read(element) {
        return new Cell(element.name, element.openTag, element.inner, element.closeTag);
    }
    /**
     * The cells of a row.
     * @param rowInner The inner html of the tr.
     * @returns The cells in order.
     */
    static readRow(rowInner) {
        return (0, html_1.findElements)(rowInner, ["td", "th"]).map((element) => Cell.read(element));
    }
    /**
     * An empty cell with the tag of its neighbours.
     * @param siblingCells The cells of the row, for the tag name.
     * @param className (Optional) A class for the cell.
     * @returns The cell.
     */
    static placeholder(siblingCells, className) {
        const tag = siblingCells[0] ? siblingCells[0].tag : "td";
        return new Cell(tag, `<${tag}${className ? ` class="${className}"` : ""}>`, "", `</${tag}>`);
    }
    /**
     * An empty cell standing for a merged cell.
     * @param mergedCellKey The key of the merged cell.
     * @param siblingCells The cells of the row, for the tag name.
     * @returns The part.
     */
    static part(mergedCellKey, siblingCells) {
        const part = Cell.placeholder(siblingCells);
        part.partOf = mergedCellKey;
        return part;
    }
    /**
     * Copies the cell, like importing a node: the copy is never removed yet.
     * @returns The copy.
     */
    clone() {
        const copy = new Cell(this.tag, this.openTag, this.inner, this.closeTag);
        copy.mergedKey = this.mergedKey;
        copy.partOf = this.partOf;
        return copy;
    }
    /**
     * Adds a class to the cell.
     * @param className The class.
     */
    addClass(className) {
        this.openTag = (0, html_1.addTagClass)(this.openTag, className);
    }
    /**
     * Whether the cell is marked as added or deleted.
     * @returns True when the cell carries a change class.
     */
    hasChangeClass() {
        const classes = ((0, html_1.getTagAttribute)(this.openTag, "class") || "").split(/\s+/);
        return classes.indexOf(constants_1.CELL_ADDED_CLASS) !== -1 || classes.indexOf(constants_1.CELL_DELETED_CLASS) !== -1;
    }
    /**
     * The html of the cell, nothing for a cell folded into a merged cell.
     * @returns The html.
     */
    render() {
        return this.removed ? "" : this.openTag + this.inner + this.closeTag;
    }
    /**
     * What the cell shows: its text plus the identities of the atomic elements (chips, images)
     * inside. Hidden helpers are not content.
     * @returns The signature, '' for an empty cell.
     */
    signature() {
        const content = this.scanContent();
        const text = content.text.replace(/\s+/g, " ").trim();
        return [text]
            .concat(content.ids, content.images)
            .filter((part) => part !== "")
            .join("|");
    }
    /**
     * The item refs the cell holds, as smart links, in order.
     * @returns The refs.
     */
    itemRefs() {
        const refs = [];
        (0, html_1.scanTags)(this.inner, (tag) => {
            if (tag.isClosing || tag.name !== "smart-link") {
                return;
            }
            const id = (0, html_1.getTagAttribute)(tag.text, constants_1.HTMLDIFF_ID_ATTRIBUTE);
            if (id !== null) {
                refs.push(id);
            }
        });
        return refs;
    }
    /**
     * The identity the cell itself carries, when its producer gave it one: such a cell names
     * its row.
     * @returns The identity, null when the cell has none.
     */
    ownId() {
        return (0, html_1.getTagAttribute)(this.openTag, constants_1.HTMLDIFF_ID_ATTRIBUTE);
    }
    /**
     * The cell's span, 1 when not set.
     * @param attribute colspan or rowspan.
     * @returns The span.
     */
    span(attribute) {
        const span = parseInt((0, html_1.getTagAttribute)(this.openTag, attribute) || "", 10);
        return isNaN(span) || span < 1 ? 1 : span;
    }
    /**
     * The cell's tag and spans, e.g. "th:2x1".
     * @returns The shape.
     */
    shape() {
        return `${this.tag}:${this.span("colspan")}x${this.span("rowspan")}`;
    }
    /**
     * Scans the content, in order, without anything hidden from view.
     * @returns The content.
     */
    scanContent() {
        const inner = this.inner;
        const openTags = [];
        let text = "";
        const ids = [];
        const images = [];
        let position = 0;
        const isHidden = () => openTags.some((tag) => tag.hidden);
        (0, html_1.scanTags)(inner, (tag) => {
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
            const hidden = (0, html_1.getTagAttribute)(tag.text, "aria-hidden") === "true";
            if (!hidden && !isHidden()) {
                const id = (0, html_1.getTagAttribute)(tag.text, constants_1.HTMLDIFF_ID_ATTRIBUTE);
                if (id !== null) {
                    ids.push(id);
                }
                if (tag.name === "img") {
                    images.push((0, html_1.getTagAttribute)(tag.text, "src") || "");
                }
            }
            if (!tag.isSelfClosing) {
                openTags.push({ name: tag.name, hidden });
            }
        });
        if (!isHidden()) {
            text += inner.slice(position);
        }
        return { text: (0, html_1.decodeEntities)(text), ids, images };
    }
}
exports.Cell = Cell;
