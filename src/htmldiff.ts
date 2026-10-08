/**
 * htmldiff.js compares HTML content. It creates a diff between two HTML documents by combining
 * the two documents and wrapping the differences with <ins> and <del> tags.
 *
 * 1. Tables are compared as structures first (src/tables): every table pair becomes one
 *    merged table in the after document, rows and columns added or deleted whole, cells
 *    holding the diff of their content.
 * 2. The flat diff (src/core) tokenizes both documents, finds the matching blocks of tokens,
 *    turns them into insert, delete, replace and equal operations and renders those.
 *
 * Example usage:
 *
 *   var htmldiff = require('htmldiff.js');
 *
 *   htmldiff('<p>this is some text</p>', '<p>this is some more text</p>')
 *   == '<p>this is some <ins>more </ins>text</p>'
 *
 *   htmldiff('<p>this is some text</p>', '<p>this is some more text</p>', 'diff-class')
 *   == '<p>this is some <ins class="diff-class">more </ins>text</p>'
 */
import { buildAtomicTagsRegExp, defaultAtomicTagsRegExp, setAtomicTagsRegExp } from "./core/atomicTags";
import { diffCore } from "./core/diff";
import { TableRedlining } from "./tables";

/**
 * Compares two pieces of HTML content and returns the combined content with differences
 * wrapped in <ins> and <del> tags.
 * @param before The HTML content before the changes.
 * @param after The HTML content after the changes.
 * @param className (Optional) The class attribute to include in <ins> and <del> tags.
 * @param dataPrefix (Optional) The data prefix to use for data attributes. The operation index
 *    data attribute will be named `data-${dataPrefix-}operation-index`.
 * @param atomicTags (Optional) Comma separated list of atomic tag names. The list has to be in
 *    the form `tag1,tag2,...` e. g. `head,script,style`. If not used, the default list
 *    `iframe,object,math,svg,script,video,head,style` will be used.
 * @returns The combined HTML content with differences wrapped in <ins> and <del> tags.
 */
function diff(before: string, after: string, className?: string | null, dataPrefix?: string | null, atomicTags?: string | null): string {
    // Enable user provided atomic tag list.
    setAtomicTagsRegExp(atomicTags ? buildAtomicTagsRegExp(atomicTags) : defaultAtomicTagsRegExp);

    const tables = new TableRedlining((oldContent, newContent) => diffCore(oldContent, newContent, className, dataPrefix));
    const prepared = tables.redline(before, after);

    return diffCore(prepared.before, prepared.after, className, dataPrefix);
}

export = diff;
