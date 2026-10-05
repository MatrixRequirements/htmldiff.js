"use strict";
/**
 * Reading and editing HTML as text: tags, elements, attributes and entities. The table pass
 * never builds a DOM, it reads the markup where it stands and splices its result back in.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceRanges = exports.decodeEntities = exports.addTagClass = exports.removeTagAttribute = exports.setTagAttribute = exports.getTagAttribute = exports.findElements = exports.scanTags = void 0;
const TAG_REGEXP = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
const VOID_TAG_NAMES = ["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"];
/**
 * Calls back for every tag of the html in order, comments included.
 * @param html The html to scan.
 * @param callback Called with every tag.
 */
function scanTags(html, callback) {
    const regExp = new RegExp(TAG_REGEXP.source, "g");
    let match;
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
exports.scanTags = scanTags;
/**
 * The elements with one of the tag names, outside any nested table.
 * @param html The html to search.
 * @param tagNames Lower case tag names.
 * @returns The elements in document order.
 */
function findElements(html, tagNames) {
    const elements = [];
    let tableDepth = 0;
    let current = null;
    scanTags(html, (tag) => {
        if (!tag.isClosing && tableDepth === 0 && !current && tagNames.indexOf(tag.name) !== -1) {
            current = { name: tag.name, start: tag.start, openTag: tag.text, innerStart: tag.end };
        }
        if (tag.name === "table") {
            tableDepth += tag.isClosing ? -1 : 1;
        }
        if (tag.isClosing && tableDepth === 0 && current && tag.name === current.name) {
            current.inner = html.slice(current.innerStart, tag.start);
            current.closeTag = tag.text;
            current.end = tag.end;
            elements.push(current);
            current = null;
        }
    });
    return elements;
}
exports.findElements = findElements;
function attributeRegExp(name) {
    return new RegExp("(\\s" + name + ")(\\s*=\\s*(\"[^\"]*\"|'[^']*'|[^\\s\"'>]+))?(?=[\\s/>])", "i");
}
function unquote(value) {
    return /^["']/.test(value) ? value.slice(1, -1) : value;
}
/**
 * Reads an attribute off a tag.
 * @param tag The tag text.
 * @param name The attribute name.
 * @returns The value, '' for a bare attribute, null when the tag has no such attribute.
 */
function getTagAttribute(tag, name) {
    const match = attributeRegExp(name).exec(tag);
    if (!match) {
        return null;
    }
    return match[3] === undefined ? "" : unquote(match[3]);
}
exports.getTagAttribute = getTagAttribute;
/**
 * Writes an attribute on a tag, like the DOM does: an attribute that is there changes in
 * place, a new one goes last.
 * @param tag The tag text.
 * @param name The attribute name.
 * @param value The value.
 * @returns The tag text with the attribute.
 */
function setTagAttribute(tag, name, value) {
    const match = attributeRegExp(name).exec(tag);
    const attribute = " " + name + '="' + String(value).replace(/"/g, "&quot;") + '"';
    if (match) {
        return tag.slice(0, match.index) + attribute + tag.slice(match.index + match[0].length);
    }
    return tag.replace(/\s*\/?>$/, attribute + "$&");
}
exports.setTagAttribute = setTagAttribute;
/**
 * Removes an attribute from a tag.
 * @param tag The tag text.
 * @param name The attribute name.
 * @returns The tag text without the attribute.
 */
function removeTagAttribute(tag, name) {
    const match = attributeRegExp(name).exec(tag);
    return match ? tag.slice(0, match.index) + tag.slice(match.index + match[0].length) : tag;
}
exports.removeTagAttribute = removeTagAttribute;
/**
 * Adds a class to a tag, like classList.add: a token already there changes nothing,
 * otherwise the list is rewritten.
 * @param tag The tag text.
 * @param className The class to add.
 * @returns The tag text with the class.
 */
function addTagClass(tag, className) {
    const current = getTagAttribute(tag, "class");
    const tokens = current === null ? [] : current.split(/\s+/).filter((token) => token !== "");
    if (tokens.indexOf(className) !== -1) {
        return tag;
    }
    return setTagAttribute(tag, "class", tokens.concat(className).join(" "));
}
exports.addTagClass = addTagClass;
const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00A0" };
/**
 * Decodes the entities text content carries.
 * @param text The text.
 * @returns The text with entities decoded.
 */
function decodeEntities(text) {
    return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body) => {
        const lower = body.toLowerCase();
        if (lower.charAt(0) === "#") {
            const code = lower.charAt(1) === "x" ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10);
            return isNaN(code) ? entity : String.fromCharCode(code);
        }
        return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, lower) ? NAMED_ENTITIES[lower] : entity;
    });
}
exports.decodeEntities = decodeEntities;
/**
 * Applies replacements to the html, from the back so the positions stay valid.
 * @param html The html.
 * @param replacements Non overlapping replacements.
 * @returns The html with the replacements applied.
 */
function replaceRanges(html, replacements) {
    return replacements
        .slice()
        .sort((first, second) => second.start - first.start)
        .reduce((result, replacement) => result.slice(0, replacement.start) + replacement.html + result.slice(replacement.end), html);
}
exports.replaceRanges = replaceRanges;
