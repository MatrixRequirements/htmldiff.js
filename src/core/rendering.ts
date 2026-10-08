/**
 * Rendering: writes the operations back out as HTML, wrapping inserted and deleted tokens in
 * <ins> and <del> tags and diffing the content of opted-in atomic elements recursively.
 */
import {
    buildAtomicTagsRegExp,
    dataHtmlDiffInnerDiffAtomicTagsRegExp,
    dataHtmlDiffInnerDiffRegExp,
    defaultInnerDiffAtomicTagsRegExp,
    getAtomicTagsRegExp,
    isStartOfAtomicTag,
    noAtomicTagsRegExp,
    setAtomicTagsRegExp,
} from "./atomicTags";
import { Operation } from "./operations";
import { isTag, isVoidTag, isWrappable, Token } from "./tokens";

/**
 * Diffs two fragments of HTML with the active atomic tags. The renderer gets it injected to
 * diff the content of opted-in elements recursively; see the diff module.
 */
export type ContentDiff = (before: string, after: string, className?: string | null, dataPrefix?: string | null) => string;

// The number of currently active recursive inner diffs. Recursion is governed per element
// (each nesting level requires its own data-htmldiff-inner-diff attribute), so the depth is
// naturally bounded by the nesting of opted-in elements; the cap is only a backstop against
// pathologically deep documents.
let innerDiffDepth = 0;
const maxInnerDiffDepth = 10;

interface TokenNote {
    isWrappable: boolean;
    insertedTag: boolean;
}

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
export class TokenWrapper {
    private readonly tokens: string[];
    private readonly notes: TokenNote[];

    /**
     * @param tokens The tokens to group.
     */
    constructor(tokens: string[]) {
        this.tokens = tokens;
        this.notes = tokens.reduce<{ notes: TokenNote[]; tagStack: { tag: string; position: number }[] }>(
            (data, token, index) => {
                data.notes.push({
                    isWrappable: isWrappable(token),
                    insertedTag: false,
                });

                const tag = !isVoidTag(token) && isTag(token);
                const lastEntry = data.tagStack[data.tagStack.length - 1];
                if (tag) {
                    if (lastEntry && "/" + lastEntry.tag === tag) {
                        data.notes[lastEntry.position].insertedTag = true;
                        data.tagStack.pop();
                    } else {
                        data.tagStack.push({ tag, position: index });
                    }
                }
                return data;
            },
            { notes: [], tagStack: [] },
        ).notes;
    }

    /**
     * Wraps the contained tokens in tags based on output given by a map function. Each segment
     * of tokens will be visited. A segment is a continuous run of either all wrappable tokens or
     * unwrappable tokens. The given map function will be called with each segment of tokens and
     * the resulting strings will be combined to form the wrapped HTML.
     * @param mapFn Called with each segment; the result should be a string.
     * @param tagFn Called with the opening tag of every tag inserted whole, to mark it.
     * @returns The wrapped HTML.
     */
    combine(mapFn: (segment: TokenSegment) => string, tagFn: (openingTag: string) => string): string {
        const notes = this.notes;
        const tokens = this.tokens.slice();
        const segments = tokens.reduce<{
            list: TokenSegment[];
            status: boolean | null;
            lastIndex: number;
            lastWasAtomic: boolean;
        }>(
            (data, token, index) => {
                if (notes[index].insertedTag) {
                    tokens[index] = tagFn(tokens[index]);
                }
                if (data.status === null) {
                    data.status = notes[index].isWrappable;
                }
                const status = notes[index].isWrappable;

                // Handling atomic tags wrapping independently
                // each atomic tag is wrapped with their own ins/del tags
                const isAtomic = !!isStartOfAtomicTag(token);
                if (status !== data.status || (isAtomic && index > data.lastIndex) || data.lastWasAtomic) {
                    data.list.push({
                        isWrappable: data.status,
                        tokens: tokens.slice(data.lastIndex, index),
                    });
                    data.lastIndex = index;
                    data.status = status;
                }
                // tracking if the last token was an atomic tag
                // if so then we break the segment and wrap them
                data.lastWasAtomic = isAtomic;
                if (index === tokens.length - 1) {
                    data.list.push({
                        isWrappable: data.status,
                        tokens: tokens.slice(data.lastIndex, index + 1),
                    });
                }
                return data;
            },
            { list: [], status: null, lastIndex: 0, lastWasAtomic: false },
        ).list;

        return segments.map(mapFn).join("");
    }
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
export function wrap(
    tag: string,
    content: string[],
    opIndex: number,
    dataPrefix?: string | null,
    className?: string | null,
): string {
    const wrapper = new TokenWrapper(content);
    const prefix = dataPrefix ? dataPrefix + "-" : "";
    let attrs = ` data-${prefix}operation-index="${opIndex}"`;
    if (className) {
        attrs += ' class="' + className + '"';
    }

    return wrapper.combine(
        (segment) => {
            if (segment.isWrappable) {
                const val = segment.tokens.join("");
                if (val.trim()) {
                    return "<" + tag + attrs + ">" + val + "</" + tag + ">";
                }
            } else {
                return segment.tokens.join("");
            }
            return "";
        },
        (openingTag) => {
            let dataAttrs = ' data-diff-node="' + tag + '"';
            dataAttrs += ` data-${prefix}operation-index="${opIndex}"`;

            return openingTag.replace(/>\s*$/, dataAttrs + "$&");
        },
    );
}

/**
 * Checks whether a token is an atomic tag that opted into the recursive inner diff via the
 * data-htmldiff-inner-diff attribute. A bare attribute or any value other than "false" counts
 * as opted in. Opted-in elements nested inside other opted-in elements are diffed recursively
 * as well, up to the depth cap; beyond it, opted-in tokens are rendered verbatim like any
 * other atomic token.
 * @param tokenString The token string to check.
 * @returns True if the token should get a recursive inner diff.
 */
export function isInnerDiffToken(tokenString: string): boolean {
    if (innerDiffDepth >= maxInnerDiffDepth || !isStartOfAtomicTag(tokenString)) {
        return false;
    }
    const attr = dataHtmlDiffInnerDiffRegExp.exec(tokenString);
    return !!attr && attr[1] !== "false";
}

/**
 * Finds the index of the '>' that ends the opening tag at the start of the given token
 * string, skipping any '>' inside quoted attribute values (e.g. title="a > b").
 * @param tokenString The token string starting with an opening tag.
 * @returns The index of the closing '>' of the opening tag, or -1 if there is none (e.g. an
 *    unterminated tag or an unbalanced attribute quote).
 */
export function findOpeningTagEnd(tokenString: string): number {
    let quote: string | null = null;
    for (let i = 0; i < tokenString.length; i++) {
        const char = tokenString[i];
        // quote is closed
        if (char === quote) {
            quote = null;
            continue;
        }
        // inside quote
        if (quote) {
            continue;
        }
        // quote start
        if (char === '"' || char === "'") {
            quote = char;
            continue;
        }
        // not inside quote, check for tag end
        if (char === ">") {
            return i;
        }
    }
    return -1;
}

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
export function splitAtomicTokenString(tokenString: string): SplitToken | null {
    const openingTagEnd = findOpeningTagEnd(tokenString);
    if (openingTagEnd === -1) {
        return null;
    }
    if (openingTagEnd === tokenString.length - 1) {
        // The token is a single tag (void or self-closing): the element has no content.
        return {
            openingTag: tokenString,
            innerHtml: "",
            closingTag: "",
        };
    }
    const closingTagStart = tokenString.lastIndexOf("<");
    if (closingTagStart <= openingTagEnd || tokenString[closingTagStart + 1] !== "/") {
        return null;
    }
    return {
        openingTag: tokenString.slice(0, openingTagEnd + 1),
        innerHtml: tokenString.slice(openingTagEnd + 1, closingTagStart),
        closingTag: tokenString.slice(closingTagStart),
    };
}

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
export function renderInnerDiff(
    beforeString: string,
    afterString: string,
    diffContent: ContentDiff,
    dataPrefix?: string | null,
    className?: string | null,
): string {
    const before = splitAtomicTokenString(beforeString);
    const after = splitAtomicTokenString(afterString);
    if (!before || !after) {
        return afterString;
    }
    const atomicTagsOverride = dataHtmlDiffInnerDiffAtomicTagsRegExp.exec(afterString);
    const outerAtomicTagsRegExp = getAtomicTagsRegExp();
    innerDiffDepth++;
    let innerDiff: string;
    // the depth and the atomic tags must be restored in case of an error, hence try/finally
    try {
        setAtomicTagsRegExp(defaultInnerDiffAtomicTagsRegExp);

        if (atomicTagsOverride) {
            setAtomicTagsRegExp(atomicTagsOverride[1] ? buildAtomicTagsRegExp(atomicTagsOverride[1]) : noAtomicTagsRegExp);
        }

        innerDiff = diffContent(before.innerHtml, after.innerHtml, className, dataPrefix);
    } finally {
        innerDiffDepth--;
        setAtomicTagsRegExp(outerAtomicTagsRegExp);
    }
    return after.openingTag + innerDiff + after.closingTag;
}

type OperationRenderer = (
    op: Operation,
    beforeTokens: Token[],
    afterTokens: Token[],
    opIndex: number,
    diffContent: ContentDiff,
    dataPrefix?: string | null,
    className?: string | null,
) => string;

function renderEqual(
    op: Operation,
    beforeTokens: Token[],
    afterTokens: Token[],
    _opIndex: number,
    diffContent: ContentDiff,
    dataPrefix?: string | null,
    className?: string | null,
): string {
    // Tokens in an equal operation pair up one to one between before and after. Equal keys do
    // not guarantee equal strings (e.g. atomic tokens matched by data-htmldiff-id): elements
    // that opted in via data-htmldiff-inner-diff get a recursive diff of their content,
    // everything else renders the after version.
    let result = "";
    for (let i = 0; op.startInAfter + i <= (op.endInAfter as number); i++) {
        const afterToken = afterTokens[op.startInAfter + i];
        const beforeToken = beforeTokens[op.startInBefore + i];
        if (beforeToken && beforeToken.string !== afterToken.string && isInnerDiffToken(afterToken.string)) {
            result += renderInnerDiff(beforeToken.string, afterToken.string, diffContent, dataPrefix, className);
        } else {
            result += afterToken.string;
        }
    }
    return result;
}

function renderInsert(
    op: Operation,
    _beforeTokens: Token[],
    afterTokens: Token[],
    opIndex: number,
    _diffContent: ContentDiff,
    dataPrefix?: string | null,
    className?: string | null,
): string {
    const tokens = afterTokens.slice(op.startInAfter, (op.endInAfter as number) + 1);
    const val = tokens.map((token) => token.string);

    const res = wrap("ins", val, opIndex, dataPrefix, className);

    // handling inserted tags, see https://matrixreq.atlassian.net/browse/MATRIX-7876
    if (/^<[^./]+?>$/.exec(res)) {
        return `${res.slice(0, res.length - 1)} data-inserted="true">`;
    }

    return res;
}

function renderDelete(
    op: Operation,
    beforeTokens: Token[],
    _afterTokens: Token[],
    opIndex: number,
    _diffContent: ContentDiff,
    dataPrefix?: string | null,
    className?: string | null,
): string {
    const tokens = beforeTokens.slice(op.startInBefore, (op.endInBefore as number) + 1);
    const val = tokens.map((token) => token.string);
    const res = wrap("del", val, opIndex, dataPrefix, className);

    // handling cases like deleted </p><p>, see https://matrixreq.atlassian.net/browse/MATRIX-7688
    if (/^<\/.+?><.+?>$/.exec(res) && !res.includes("del")) {
        return `<del>${val.slice(1, val.length - 1).join("")}</del>`;
    }

    return res;
}

function renderReplace(
    op: Operation,
    beforeTokens: Token[],
    afterTokens: Token[],
    opIndex: number,
    diffContent: ContentDiff,
    dataPrefix?: string | null,
    className?: string | null,
): string {
    return (
        renderDelete(op, beforeTokens, afterTokens, opIndex, diffContent, dataPrefix, className) +
        renderInsert(op, beforeTokens, afterTokens, opIndex, diffContent, dataPrefix, className)
    );
}

const OPS: Record<Operation["action"], OperationRenderer> = {
    equal: renderEqual,
    insert: renderInsert,
    delete: renderDelete,
    replace: renderReplace,
};

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
export function renderOperations(
    beforeTokens: Token[],
    afterTokens: Token[],
    operations: Operation[],
    diffContent: ContentDiff,
    dataPrefix?: string | null,
    className?: string | null,
): string {
    return operations.reduce(
        (rendering, op, index) =>
            rendering + OPS[op.action](op, beforeTokens, afterTokens, index, diffContent, dataPrefix, className),
        "",
    );
}
