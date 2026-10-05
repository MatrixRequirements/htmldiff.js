import { createMap, createSegment, findBestMatch } from "./core/matching";
import { createToken, getKeyForToken } from "./core/tokens";
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
declare function diff(before: string, after: string, className?: string | null, dataPrefix?: string | null, atomicTags?: string | null): string;
declare namespace diff {
    var htmlToTokens: typeof import("./core/tokens").htmlToTokens;
    var calculateOperations: typeof import("./core/operations").calculateOperations;
    var renderOperations: typeof import("./core/diff").renderOperations;
    var findMatchingBlocks: typeof import("./core/matching").findMatchingBlocks & {
        findBestMatch: typeof findBestMatch;
        createMap: typeof createMap;
        createToken: typeof createToken;
        createSegment: typeof createSegment;
        getKeyForToken: typeof getKeyForToken;
    };
}
export = diff;
