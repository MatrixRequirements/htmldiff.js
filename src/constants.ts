/**
 * The attributes htmldiff reads: the contract between a producer of HTML and the diff.
 */

/** The identity of an element: equal identities are the same element, whatever its content. */
export const HTMLDIFF_ID_ATTRIBUTE = "data-htmldiff-id";
/** Asks for the content of an identified element to be diffed instead of shown as one unit. */
export const INNER_DIFF_ATTRIBUTE = "data-htmldiff-inner-diff";
/** The atomic tags to use inside an element's inner diff, overriding the default list. */
export const INNER_DIFF_ATOMIC_TAGS_ATTRIBUTE = "data-htmldiff-inner-diff-atomic-tags";
