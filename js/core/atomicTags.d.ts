/**
 * Atomic tags are elements whose child nodes are never compared: the whole element is one
 * token. Which tags are atomic changes while a diff runs (the caller's list for the outer
 * diff, a reduced list inside a recursive inner diff), so the active regular expression is
 * kept here and read by the tokenizer and the renderer.
 */
/**
 * The default atomic tags. The tag name must be followed by a delimiter (not a \b word
 * boundary): the tokenizer matches against partially read tags, and a word boundary would
 * match at the end of an incomplete name, e.g. detecting '<abbr>' as the atomic tag 'a'
 * while reading '<a'.
 */
export declare const defaultAtomicTagsRegExp: RegExp;
/**
 * Atomic tags used inside a recursive inner diff unless the element overrides them via
 * data-htmldiff-inner-diff-atomic-tags: the default list without 'a'.
 */
export declare const defaultInnerDiffAtomicTagsRegExp: RegExp;
/** Matches no tag at all: used when data-htmldiff-inner-diff-atomic-tags is empty. */
export declare const noAtomicTagsRegExp: RegExp;
/**
 * Matches an element whose own opening tag carries data-htmldiff-id; captures tag name and
 * attribute value. The skip before the attribute is quote aware, so it cannot run past '>'
 * into a nested child. The leading \s prevents matching 'x-data-htmldiff-id'.
 */
export declare const dataHtmlDiffIdRegExp: RegExp;
/**
 * Opt-in marker for the recursive inner diff. When two matched atomic tokens (typically
 * matched by data-htmldiff-id) have equal keys but different content, an element carrying
 * this attribute gets its inner HTML diffed recursively instead of being rendered as is.
 * The attribute must appear in the element's opening tag. Captures the attribute value;
 * a bare attribute or any value other than "false" enables the opt-in.
 */
export declare const dataHtmlDiffInnerDiffRegExp: RegExp;
/**
 * Per-element override for the atomic tags used inside a recursive inner diff. The value
 * is a comma separated tag name list, like the atomicTags parameter of the diff function;
 * an empty value means no tag name is atomic.
 */
export declare const dataHtmlDiffInnerDiffAtomicTagsRegExp: RegExp;
/**
 * The atomic tags regular expression the running diff uses.
 * @returns The active regular expression.
 */
export declare function getAtomicTagsRegExp(): RegExp;
/**
 * Switches the atomic tags for the diff that is about to run.
 * @param regExp The regular expression to match the start of an atomic tag.
 */
export declare function setAtomicTagsRegExp(regExp: RegExp): void;
/**
 * Builds the atomic tags regular expression from a comma separated tag name list.
 * @param atomicTags Comma separated list of tag names, e.g. 'head,script,style'.
 * @returns The regular expression matching the start of those tags.
 */
export declare function buildAtomicTagsRegExp(atomicTags: string): RegExp;
/**
 * Checks if the current word is the beginning of an atomic tag: one of the active atomic
 * tags, or any element with a data-htmldiff-id of its own.
 * @param word The characters of the current token read so far.
 * @returns The name of the atomic tag if the word will be an atomic tag, null otherwise.
 */
export declare function isStartOfAtomicTag(word: string): string | null;
