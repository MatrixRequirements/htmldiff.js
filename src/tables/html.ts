/**
 * Reading and editing HTML as text: tags, elements, attributes and entities. The table pass
 * never builds a DOM, it reads the markup where it stands and splices its result back in.
 */

const TAG_REGEXP = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
const VOID_TAG_NAMES = ["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"];

/** One tag of the html, or one comment. */
export interface Tag {
    /** Lower case, '' for a comment. */
    name: string;
    isComment: boolean;
    isClosing: boolean;
    /** Closed by itself: a void tag, an XML style '/>' tag, or a comment. */
    isSelfClosing: boolean;
    attributes: string;
    text: string;
    start: number;
    end: number;
}

/** An element: its tags, its content and where it stands in the html. */
export interface Element {
    name: string;
    start: number;
    openTag: string;
    innerStart: number;
    inner: string;
    closeTag: string;
    end: number;
}

/** A piece of html to replace. */
export interface Replacement {
    start: number;
    end: number;
    html: string;
}

/**
 * Calls back for every tag of the html in order, comments included.
 * @param html The html to scan.
 * @param callback Called with every tag.
 */
export function scanTags(html: string, callback: (tag: Tag) => void): void {
    const regExp = new RegExp(TAG_REGEXP.source, "g");
    let match: RegExpExecArray | null;
    while ((match = regExp.exec(html))) {
        const name = match[2] ? match[2].toLowerCase() : "";
        callback({
            name,
            isComment: !match[2],
            isClosing: match[1] === "/",
            isSelfClosing: !match[2] || /\/\s*>$/.test(match[0]) || VOID_TAG_NAMES.indexOf(name) !== -1,
            attributes: match[3],
            text: match[0],
            start: match.index,
            end: match.index + match[0].length,
        });
    }
}

/**
 * The elements with one of the tag names, outside any nested table.
 * @param html The html to search.
 * @param tagNames Lower case tag names.
 * @returns The elements in document order.
 */
export function findElements(html: string, tagNames: string[]): Element[] {
    const elements: Element[] = [];
    let tableDepth = 0;
    let current: Partial<Element> | null = null;

    scanTags(html, (tag) => {
        if (!tag.isClosing && tableDepth === 0 && !current && tagNames.indexOf(tag.name) !== -1) {
            current = { name: tag.name, start: tag.start, openTag: tag.text, innerStart: tag.end };
        }
        if (tag.name === "table") {
            tableDepth += tag.isClosing ? -1 : 1;
        }
        if (tag.isClosing && tableDepth === 0 && current && tag.name === current.name) {
            current.inner = html.slice(current.innerStart as number, tag.start);
            current.closeTag = tag.text;
            current.end = tag.end;
            elements.push(current as Element);
            current = null;
        }
    });
    return elements;
}

function attributeRegExp(name: string): RegExp {
    return new RegExp("(\\s" + name + ")(\\s*=\\s*(\"[^\"]*\"|'[^']*'|[^\\s\"'>]+))?(?=[\\s/>])", "i");
}

function unquote(value: string): string {
    return /^["']/.test(value) ? value.slice(1, -1) : value;
}

/**
 * Reads an attribute off a tag.
 * @param tag The tag text.
 * @param name The attribute name.
 * @returns The value, '' for a bare attribute, null when the tag has no such attribute.
 */
export function getTagAttribute(tag: string, name: string): string | null {
    const match = attributeRegExp(name).exec(tag);
    if (!match) {
        return null;
    }
    return match[3] === undefined ? "" : unquote(match[3]);
}

/**
 * Writes an attribute on a tag, like the DOM does: an attribute that is there changes in
 * place, a new one goes last.
 * @param tag The tag text.
 * @param name The attribute name.
 * @param value The value.
 * @returns The tag text with the attribute.
 */
export function setTagAttribute(tag: string, name: string, value: string | number): string {
    const match = attributeRegExp(name).exec(tag);
    const attribute = " " + name + '="' + String(value).replace(/"/g, "&quot;") + '"';
    if (match) {
        return tag.slice(0, match.index) + attribute + tag.slice(match.index + match[0].length);
    }
    return tag.replace(/\s*\/?>$/, attribute + "$&");
}

/**
 * Removes an attribute from a tag.
 * @param tag The tag text.
 * @param name The attribute name.
 * @returns The tag text without the attribute.
 */
export function removeTagAttribute(tag: string, name: string): string {
    const match = attributeRegExp(name).exec(tag);
    return match ? tag.slice(0, match.index) + tag.slice(match.index + match[0].length) : tag;
}

/**
 * Adds a class to a tag, like classList.add: a token already there changes nothing,
 * otherwise the list is rewritten.
 * @param tag The tag text.
 * @param className The class to add.
 * @returns The tag text with the class.
 */
export function addTagClass(tag: string, className: string): string {
    const current = getTagAttribute(tag, "class");
    const tokens = current === null ? [] : current.split(/\s+/).filter((token) => token !== "");
    if (tokens.indexOf(className) !== -1) {
        return tag;
    }
    return setTagAttribute(tag, "class", tokens.concat(className).join(" "));
}

const NAMED_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00A0" };

/**
 * Decodes the entities text content carries.
 * @param text The text.
 * @returns The text with entities decoded.
 */
export function decodeEntities(text: string): string {
    return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
        const lower = body.toLowerCase();
        if (lower.charAt(0) === "#") {
            const code = lower.charAt(1) === "x" ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10);
            return isNaN(code) ? entity : String.fromCharCode(code);
        }
        return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, lower) ? NAMED_ENTITIES[lower] : entity;
    });
}

/**
 * Applies replacements to the html, from the back so the positions stay valid.
 * @param html The html.
 * @param replacements Non overlapping replacements.
 * @returns The html with the replacements applied.
 */
export function replaceRanges(html: string, replacements: Replacement[]): string {
    return replacements
        .slice()
        .sort((first, second) => second.start - first.start)
        .reduce((result, replacement) => result.slice(0, replacement.start) + replacement.html + result.slice(replacement.end), html);
}
