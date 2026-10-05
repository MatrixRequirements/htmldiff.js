"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderOperations = exports.diffCore = void 0;
/**
 * The flat diff: tokenize both documents, find the operations between them, render them. Runs
 * with whatever atomic tags are active; the public entry point sets them first.
 */
const operations_1 = require("./operations");
const rendering_1 = require("./rendering");
const tokens_1 = require("./tokens");
/**
 * Diffs two fragments of HTML with the atomic tags that are currently active. Used by the
 * public diff function after resolving the atomicTags parameter, by the recursive inner diff,
 * which sets the atomic tags itself, and by the table pass to diff cell content.
 * @param before The HTML content before the changes.
 * @param after The HTML content after the changes.
 * @param className (Optional) The class attribute to include in <ins> and <del> tags.
 * @param dataPrefix (Optional) The data prefix to use for data attributes.
 * @returns The combined HTML content with differences wrapped in <ins> and <del> tags.
 */
const diffCore = (before, after, className, dataPrefix) => {
    if (before === after)
        return before;
    const beforeTokens = (0, tokens_1.htmlToTokens)(before);
    const afterTokens = (0, tokens_1.htmlToTokens)(after);
    const ops = (0, operations_1.calculateOperations)(beforeTokens, afterTokens);
    return (0, rendering_1.renderOperations)(beforeTokens, afterTokens, ops, exports.diffCore, dataPrefix, className);
};
exports.diffCore = diffCore;
/**
 * Renders a list of operations into HTML content, diffing the content of opted-in atomic
 * elements with the flat diff.
 * @param beforeTokens The before list of tokens.
 * @param afterTokens The after list of tokens.
 * @param operations The operations to render.
 * @param dataPrefix (Optional) The prefix to use in data attributes.
 * @param className (Optional) The class name to include in the wrapper tag.
 * @returns The rendering of the list of operations.
 */
function renderOperations(beforeTokens, afterTokens, operations, dataPrefix, className) {
    return (0, rendering_1.renderOperations)(beforeTokens, afterTokens, operations, exports.diffCore, dataPrefix, className);
}
exports.renderOperations = renderOperations;
