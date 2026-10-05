/**
 * A table as it stands in the html: its rows, the markup between them, and the place where a
 * row appended to the table body goes. The merged table is rendered back from it.
 */
import { Cell } from "./Cell";
import { HTMLDIFF_ID_ATTRIBUTE, SECTION_ATTRIBUTE } from "./constants";
import { Element, findElements, getTagAttribute, scanTags, setTagAttribute } from "./html";
import { Row } from "./Row";

/** The place where a row appended to the table body goes. */
export interface AppendChunk {
    appended: Row[];
    container: string | null;
}

/** A piece of a table's inner html: markup, a row, or the append place. */
export type Chunk = string | Row | AppendChunk;

/** A table as it stands in the html, and the merged table rendered back from it. */
export class Table {
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
    private constructor(element: Element, inSection: boolean, chunks: Chunk[], appendChunk: AppendChunk) {
        this.openTag = element.openTag;
        this.closeTag = element.closeTag;
        this.start = element.start;
        this.end = element.end;
        this.inner = element.inner;
        this.inSection = inSection;
        this.chunks = chunks;
        this.appendChunk = appendChunk;
    }

    /**
     * Reads a table.
     * @param element The table element.
     * @param inSection Whether a document section holds the table.
     * @returns The table.
     */
    static read(element: Element, inSection: boolean): Table {
        const inner = element.inner;
        const rowElements = findElements(inner, ["tr"]);
        const containers: Record<number, string | null> = {};
        let tableDepth = 0;
        let container: string | null = null;
        let appendAt = inner.length;
        let firstTbodyEnd = -1;

        scanTags(inner, (tag) => {
            if (tag.name === "table") {
                tableDepth += tag.isClosing ? -1 : 1;
                return;
            }
            if (tableDepth !== 0) {
                return;
            }
            if (tag.name === "thead" || tag.name === "tbody" || tag.name === "tfoot") {
                if (tag.isClosing && tag.name === "tbody" && firstTbodyEnd === -1) {
                    firstTbodyEnd = tag.start;
                }
                container = tag.isClosing ? null : tag.name;
            }
            if (tag.name === "tr" && !tag.isClosing) {
                containers[tag.start] = container;
            }
        });
        if (firstTbodyEnd !== -1) {
            appendAt = firstTbodyEnd;
        }

        const chunks: Chunk[] = [];
        const appendChunk: AppendChunk = { appended: [], container: firstTbodyEnd !== -1 ? "tbody" : null };
        let position = 0;
        let appendInserted = false;
        const pushText = (textStart: number, textEnd: number): void => {
            if (!appendInserted && appendAt >= textStart && appendAt <= textEnd) {
                if (textStart < appendAt) {
                    chunks.push(inner.slice(textStart, appendAt));
                }
                chunks.push(appendChunk);
                appendInserted = true;
                if (appendAt < textEnd) {
                    chunks.push(inner.slice(appendAt, textEnd));
                }
                return;
            }
            if (textStart < textEnd) {
                chunks.push(inner.slice(textStart, textEnd));
            }
        };
        rowElements.forEach((rowElement) => {
            pushText(position, rowElement.start);
            chunks.push(new Row(rowElement.openTag, Cell.readRow(rowElement.inner), containers[rowElement.start] || null));
            position = rowElement.end;
        });
        pushText(position, inner.length);
        if (!appendInserted) {
            chunks.push(appendChunk);
        }

        return new Table(element, inSection, chunks, appendChunk);
    }

    /**
     * The tables outside any other table, each knowing whether a document section holds it.
     * @param html The html.
     * @returns The tables in document order.
     */
    static findTopLevel(html: string): Table[] {
        const elements = findElements(html, ["table"]);
        const inSection: Record<number, boolean> = {};
        const openTags: { name: string; inSection: boolean }[] = [];
        let tableIndex = 0;

        scanTags(html, (tag) => {
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
            if (elements[tableIndex] && elements[tableIndex].start === tag.start) {
                inSection[tag.start] = openTags.some((open) => open.inSection);
                tableIndex++;
            }
            if (!tag.isSelfClosing) {
                openTags.push({ name: tag.name, inSection: getTagAttribute(tag.text, SECTION_ATTRIBUTE) !== null });
            }
        });

        return elements.map((element) => Table.read(element, inSection[element.start] === true));
    }

    /**
     * The identity the table came with, like an item's table in a report.
     * @returns The identity, undefined when the table has none.
     */
    ownId(): string | undefined {
        return getTagAttribute(this.openTag, HTMLDIFF_ID_ATTRIBUTE) || undefined;
    }

    /**
     * Gives the table an identity unless it has one.
     * @param fallbackId The identity to give.
     * @returns The table's identity.
     */
    ensureId(fallbackId: string): string {
        const id = this.ownId() ?? fallbackId;
        this.openTag = setTagAttribute(this.openTag, HTMLDIFF_ID_ATTRIBUTE, id);
        return id;
    }

    /**
     * Every row of the merged table so far in document order, deleted rows included.
     * @returns The rows.
     */
    documentRows(): Row[] {
        const rows: Row[] = [];
        this.chunks.forEach((chunk) => {
            if (chunk === this.appendChunk) {
                chunk.appended.forEach((row) => row.collect(rows));
            } else if (chunk instanceof Row && !chunk.detached) {
                chunk.collect(rows);
            }
        });
        return rows;
    }

    /**
     * The rows inside thead, tbody and tfoot in their order, rows directly in the table last.
     * @returns The rows.
     */
    rows(): Row[] {
        const rows = this.documentRows();
        return rows.filter((row) => row.container !== null).concat(rows.filter((row) => row.container === null));
    }

    /**
     * The row after another in the same row group, like Element.nextElementSibling.
     * @param row The row.
     * @returns The next row, or null.
     */
    nextSibling(row: Row): Row | null {
        const rows = this.documentRows();
        const next = rows[rows.indexOf(row) + 1];
        return next && next.container === row.container ? next : null;
    }

    /**
     * Appends a row to the table body, like appendChild on the tbody.
     * @param row The row.
     */
    appendRow(row: Row): void {
        row.container = this.appendChunk.container;
        this.appendChunk.appended.push(row);
    }

    /**
     * The inner html of the merged table.
     * @returns The html.
     */
    renderInner(): string {
        return this.chunks
            .map((chunk) => {
                if (typeof chunk === "string") {
                    return chunk;
                }
                if (chunk === this.appendChunk) {
                    return Row.renderAll(chunk.appended);
                }
                return (chunk as Row).detached ? "" : (chunk as Row).render();
            })
            .join("");
    }
}
