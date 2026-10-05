import { Operation } from "./operations";
import { Token } from "./tokens";
/**
 * Diffs two fragments of HTML with the active atomic tags. The renderer gets it injected to
 * diff the content of opted-in elements recursively; see the diff module.
 */
export declare type ContentDiff = (before: string, after: string, className?: string | null, dataPrefix?: string | null) => string;
/** A run of tokens that are all wrappable or all not. */
interface TokenSegment {
    isWrappable: boolean;
    tokens: string[];
}
/**
 * A TokenWrapper provides a utility for grouping segments of tokens based on whether they're
 * wrappable or not. A tag is considered wrappable if it is closed within the given set of
 * tokens. For example, given the following tokens:
 *
 *      ['</b>', 'this', ' ', 'is', ' ', 'a', ' ', '<b>', 'test', '</b>', '!']
 *
 * The first '</b>' is not considered wrappable since the tag is not fully contained within the
 * array of tokens. The '<b>', 'test', and '</b>' would be a part of the same wrappable segment
 * since the entire bold tag is within the set of tokens.
 */
export declare class TokenWrapper {
    private readonly tokens;
    private readonly notes;
    /**
     * @param tokens The tokens to group.
     */
    constructor(tokens: string[]);
    /**
     * Wraps the contained tokens in tags based on output given by a map function. Each segment
     * of tokens will be visited. A segment is a continuous run of either all wrappable tokens or
     * unwrappable tokens. The given map function will be called with each segment of tokens and
     * the resulting strings will be combined to form the wrapped HTML.
     * @param mapFn Called with each segment; the result should be a string.
     * @param tagFn Called with the opening tag of every tag inserted whole, to mark it.
     * @returns The wrapped HTML.
     */
    combine(mapFn: (segment: TokenSegment) => string, tagFn: (openingTag: string) => string): string;
}
/**
 * Wraps and concatenates a list of tokens with a tag. Does not wrap tag tokens, unless they
 * are wrappable (i.e. void and atomic tags).
 * @param tag The tag name of the wrapper tags.
 * @param content The list of tokens to wrap.
 * @param opIndex The index of the operation, written to the data attribute.
 * @param dataPrefix (Optional) The prefix to use in data attributes.
 * @param className (Optional) The class name to include in the wrapper tag.
 * @returns The wrapped HTML.
 */
export declare function wrap(tag: string, content: string[], opIndex: number, dataPrefix?: string | null, className?: string | null): string;
/**
 * Checks whether a token is an atomic tag that opted into the recursive inner diff via the
 * data-htmldiff-inner-diff attribute. A bare attribute or any value other than "false" counts
 * as opted in. Opted-in elements nested inside other opted-in elements are diffed recursively
 * as well, up to the depth cap; beyond it, opted-in tokens are rendered verbatim like any
 * other atomic token.
 * @param tokenString The token string to check.
 * @returns True if the token should get a recursive inner diff.
 */
export declare function isInnerDiffToken(tokenString: string): boolean;
/**
 * Finds the index of the '>' that ends the opening tag at the start of the given token
 * string, skipping any '>' inside quoted attribute values (e.g. title="a > b").
 * @param tokenString The token string starting with an opening tag.
 * @returns The index of the closing '>' of the opening tag, or -1 if there is none (e.g. an
 *    unterminated tag or an unbalanced attribute quote).
 */
export declare function findOpeningTagEnd(tokenString: string): number;
/** An atomic token split into its tags and content. */
export interface SplitToken {
    openingTag: string;
    innerHtml: string;
    closingTag: string;
}
/**
 * Splits an atomic token string into its opening tag, inner HTML and closing tag. A token
 * consisting of a single tag (a void or self-closing element) has an empty inner HTML and no
 * closing tag.
 * @param tokenString The atomic token string, e.g. '<div a="b">content</div>'.
 * @returns The parts, or null if the token cannot be split (e.g. an unterminated tag).
 */
export declare function splitAtomicTokenString(tokenString: string): SplitToken | null;
/**
 * Renders the recursive inner diff of two matched atomic tokens with equal keys but different
 * content. The after version's opening and closing tags are emitted with the diff of the two
 * inner HTML fragments in between. Inside the recursion the default atomic tags without 'a'
 * are used, so link text is diffed word by word and href-only changes do not produce any
 * markup. The after version's data-htmldiff-inner-diff-atomic-tags attribute overrides that
 * list. Nested opted-in elements are diffed recursively as well, up to a hardcoded depth cap.
 * @param beforeString The before version of the atomic token.
 * @param afterString The after version of the atomic token.
 * @param diffContent Diffs the two inner HTML fragments.
 * @param dataPrefix (Optional) The prefix to use in data attributes.
 * @param className (Optional) The class name to include in the wrapper tag.
 * @returns The rendered element with inner differences wrapped in ins/del tags.
 */
export declare function renderInnerDiff(beforeString: string, afterString: string, diffContent: ContentDiff, dataPrefix?: string | null, className?: string | null): string;
/**
 * Renders a list of operations into HTML content. The result is the combined version of the
 * before and after tokens with the differences wrapped in tags.
 * @param beforeTokens The before list of tokens.
 * @param afterTokens The after list of tokens.
 * @param operations The list of operations to transform the before tokens into the after tokens.
 * @param diffContent Diffs the content of opted-in atomic elements recursively.
 * @param dataPrefix (Optional) The prefix to use in data attributes.
 * @param className (Optional) The class name to include in the wrapper tag.
 * @returns The rendering of the list of operations.
 */
export declare function renderOperations(beforeTokens: Token[], afterTokens: Token[], operations: Operation[], diffContent: ContentDiff, dataPrefix?: string | null, className?: string | null): string;
export {};
