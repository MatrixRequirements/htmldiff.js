/**
 * The flat diff: tokenize both documents, find the operations between them, render them. Runs
 * with whatever atomic tags are active; the public entry point sets them first.
 */
import { calculateOperations } from "./operations";
import { ContentDiff, renderOperations as render } from "./rendering";
import { htmlToTokens } from "./tokens";

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
export const diffCore: ContentDiff = (before, after, className, dataPrefix) => {
    if (before === after) return before;

    const beforeTokens = htmlToTokens(before);
    const afterTokens = htmlToTokens(after);
    const ops = calculateOperations(beforeTokens, afterTokens);
    return render(beforeTokens, afterTokens, ops, diffCore, dataPrefix, className);
};
