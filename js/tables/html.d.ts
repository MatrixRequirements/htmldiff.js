/**
 * Reading and editing HTML as text: tags, elements, attributes and entities. The table pass
 * never builds a DOM, it reads the markup where it stands and splices its result back in.
 */
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
export declare function scanTags(html: string, callback: (tag: Tag) => void): void;
/**
 * The elements with one of the tag names, outside any nested table.
 * @param html The html to search.
 * @param tagNames Lower case tag names.
 * @returns The elements in document order.
 */
export declare function findElements(html: string, tagNames: string[]): Element[];
/**
 * Reads an attribute off a tag.
 * @param tag The tag text.
 * @param name The attribute name.
 * @returns The value, '' for a bare attribute, null when the tag has no such attribute.
 */
export declare function getTagAttribute(tag: string, name: string): string | null;
/**
 * Writes an attribute on a tag, like the DOM does: an attribute that is there changes in
 * place, a new one goes last.
 * @param tag The tag text.
 * @param name The attribute name.
 * @param value The value.
 * @returns The tag text with the attribute.
 */
export declare function setTagAttribute(tag: string, name: string, value: string | number): string;
/**
 * Removes an attribute from a tag.
 * @param tag The tag text.
 * @param name The attribute name.
 * @returns The tag text without the attribute.
 */
export declare function removeTagAttribute(tag: string, name: string): string;
/**
 * Adds a class to a tag, like classList.add: a token already there changes nothing,
 * otherwise the list is rewritten.
 * @param tag The tag text.
 * @param className The class to add.
 * @returns The tag text with the class.
 */
export declare function addTagClass(tag: string, className: string): string;
/**
 * Decodes the entities text content carries.
 * @param text The text.
 * @returns The text with entities decoded.
 */
export declare function decodeEntities(text: string): string;
/**
 * Applies replacements to the html, from the back so the positions stay valid.
 * @param html The html.
 * @param replacements Non overlapping replacements.
 * @returns The html with the replacements applied.
 */
export declare function replaceRanges(html: string, replacements: Replacement[]): string;
