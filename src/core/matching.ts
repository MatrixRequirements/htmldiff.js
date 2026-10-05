/**
 * Matching: finds the blocks of consecutive tokens that appear in both the before and the
 * after token lists. The longest block is found first, then the blocks before and after it,
 * recursively, until no match is left.
 */
import { Token } from "./tokens";

/** The part of both documents a match is searched in. */
export interface Segment {
    beforeTokens: Token[];
    afterTokens: Token[];
    beforeMap: TokenMap;
    afterMap: TokenMap;
    beforeIndex: number;
    afterIndex: number;
}

/** Token key to the indices of the tokens with that key. */
export type TokenMap = Record<string, number[]>;

/**
 * A Match stores the information of a matching block. A matching block is a list of
 * consecutive tokens that appear in both the before and after lists of tokens.
 */
export class Match {
    segment: Segment;
    length: number;
    startInBefore: number;
    startInAfter: number;
    endInBefore: number;
    endInAfter: number;
    segmentStartInBefore: number;
    segmentStartInAfter: number;
    segmentEndInBefore: number;
    segmentEndInAfter: number;

    /**
     * @param startInBefore The index of the first token in the list of before tokens.
     * @param startInAfter The index of the first token in the list of after tokens.
     * @param length The number of consecutive matching tokens in this block.
     * @param segment The segment where the match was found.
     */
    constructor(startInBefore: number, startInAfter: number, length: number, segment: Segment) {
        this.segment = segment;
        this.length = length;

        this.startInBefore = startInBefore + segment.beforeIndex;
        this.startInAfter = startInAfter + segment.afterIndex;
        this.endInBefore = this.startInBefore + this.length - 1;
        this.endInAfter = this.startInAfter + this.length - 1;

        this.segmentStartInBefore = startInBefore;
        this.segmentStartInAfter = startInAfter;
        this.segmentEndInBefore = this.segmentStartInBefore + this.length - 1;
        this.segmentEndInAfter = this.segmentStartInAfter + this.length - 1;
    }
}

/**
 * Creates a map from token key to an array of indices of locations of the matching token in
 * the list of all tokens.
 * @param tokens The list of tokens to be mapped.
 * @returns A mapping that can be used to search for tokens.
 */
export function createMap(tokens: Token[]): TokenMap {
    return tokens.reduce<TokenMap>((map, token, index) => {
        if (map[token.key]) {
            map[token.key].push(index);
        } else {
            map[token.key] = [index];
        }
        return map;
    }, Object.create(null) as TokenMap);
}

/**
 * Compares two match objects to determine if the second match object comes before or after the
 * first match object.
 * @param m1 The first match object to compare.
 * @param m2 The second match object to compare.
 * @returns -1 if m2 should come before m1, 1 if m1 should come before m2, 0 if the two
 *    matches criss-cross each other.
 */
function compareMatches(m1: Match, m2: Match): -1 | 0 | 1 {
    if (m2.endInBefore < m1.startInBefore && m2.endInAfter < m1.startInAfter) {
        return -1;
    }
    if (m2.startInBefore > m1.endInBefore && m2.startInAfter > m1.endInAfter) {
        return 1;
    }
    return 0;
}

interface MatchNode {
    value: Match;
    left: MatchNode | null;
    right: MatchNode | null;
}

/** A binary search tree that keeps match objects in the proper order as they're found. */
class MatchBinarySearchTree {
    private root: MatchNode | null = null;

    /**
     * Adds a match to the binary search tree. A match overlapping an existing node is dropped.
     * @param value The match to add.
     */
    add(value: Match): void {
        const node: MatchNode = { value, left: null, right: null };

        let current = this.root;
        if (!current) {
            this.root = node;
            return;
        }
        for (;;) {
            // Determine if the match value should go to the left or right of the current node.
            const position = compareMatches(current.value, value);
            if (position === -1) {
                if (current.left) {
                    current = current.left;
                } else {
                    current.left = node;
                    break;
                }
            } else if (position === 1) {
                if (current.right) {
                    current = current.right;
                } else {
                    current.right = node;
                    break;
                }
            } else {
                // If 0 was returned from compareMatches, that means the node cannot
                // be inserted because it overlaps an existing node.
                break;
            }
        }
    }

    /**
     * Converts the binary search tree into an array using an in-order traversal.
     * @returns The matches in the binary search tree, in order.
     */
    toArray(): Match[] {
        function inOrder(node: MatchNode | null, nodes: Match[]): Match[] {
            if (node) {
                inOrder(node.left, nodes);
                nodes.push(node.value);
                inOrder(node.right, nodes);
            }
            return nodes;
        }

        return inOrder(this.root, []);
    }
}

/**
 * Finds and returns the best match between the before and after arrays contained in the
 * segment provided.
 * @param segment The segment in which to look for a match.
 * @returns The best match, or null when the segment has none.
 */
export function findBestMatch(segment: Segment): Match | null {
    const beforeTokens = segment.beforeTokens;
    const afterMap = segment.afterMap;
    let lastSpace: number | null = null;
    let bestMatch: Match | null = null;

    // Iterate through the entirety of the beforeTokens to find the best match.
    for (let beforeIndex = 0; beforeIndex < beforeTokens.length; beforeIndex++) {
        let lookBehind = false;

        // If the current best match is longer than the remaining tokens, we can bail because we
        // won't find a better match.
        const remainingTokens = beforeTokens.length - beforeIndex;
        if (bestMatch && remainingTokens < bestMatch.length) {
            break;
        }

        // If the current token is whitespace, make a note of it and move on. Trying to start a
        // set of matches with whitespace is not efficient because it's too prevelant in most
        // documents. Instead, if the next token yields a match, we'll see if the whitespace can
        // be included in that match.
        const beforeToken = beforeTokens[beforeIndex];
        if (beforeToken.key === " ") {
            lastSpace = beforeIndex;
            continue;
        }

        // Check to see if we just skipped a space, if so, we'll ask getFullMatch to look behind
        // by one token to see if it can include the whitespace.
        if (lastSpace === beforeIndex - 1) {
            lookBehind = true;
        }

        // If the current token is not found in the afterTokens, it won't match and we can move on.
        const afterTokenLocations = afterMap[beforeToken.key];
        if (!afterTokenLocations) {
            continue;
        }

        // For each instance of the current token in afterTokens, let's see how big of a match
        // we can build.
        for (const afterIndex of afterTokenLocations) {
            // getFullMatch will see how far the current token match will go in both
            // beforeTokens and afterTokens.
            const bestMatchLength = bestMatch ? bestMatch.length : 0;
            const match = getFullMatch(segment, beforeIndex, afterIndex, bestMatchLength, lookBehind);

            // If we got a new best match, we'll save it aside.
            if (match && match.length > bestMatchLength) {
                bestMatch = match;
            }
        }
    }

    return bestMatch;
}

/**
 * Takes the start of a match, and expands it in the beforeTokens and afterTokens of the
 * current segment as far as it can go.
 * @param segment The segment object to search within when expanding the match.
 * @param beforeStart The offset within beforeTokens to start looking.
 * @param afterStart The offset within afterTokens to start looking.
 * @param minLength The minimum length match that must be found.
 * @param lookBehind If true, attempt to match a whitespace token just before the
 *    beforeStart and afterStart tokens.
 * @returns The full match, or undefined when no match of the minimum length starts here.
 */
function getFullMatch(
    segment: Segment,
    beforeStart: number,
    afterStart: number,
    minLength: number,
    lookBehind: boolean,
): Match | undefined {
    const beforeTokens = segment.beforeTokens;
    const afterTokens = segment.afterTokens;

    // If we already have a match that goes to the end of the document, no need to keep looking.
    const minBeforeIndex = beforeStart + minLength;
    const minAfterIndex = afterStart + minLength;
    if (minBeforeIndex >= beforeTokens.length || minAfterIndex >= afterTokens.length) {
        return undefined;
    }

    // If a minLength was provided, we can do a quick check to see if the tokens after that
    // length match. If not, we won't be beating the previous best match, and we can bail out
    // early.
    if (minLength) {
        const nextBeforeWord = beforeTokens[minBeforeIndex].key;
        const nextAfterWord = afterTokens[minAfterIndex].key;
        if (nextBeforeWord !== nextAfterWord) {
            return undefined;
        }
    }

    // Extend the current match as far foward as it can go, without overflowing beforeTokens or
    // afterTokens.
    let searching = true;
    let currentLength = 1;
    let beforeIndex = beforeStart + currentLength;
    let afterIndex = afterStart + currentLength;

    while (searching && beforeIndex < beforeTokens.length && afterIndex < afterTokens.length) {
        const beforeWord = beforeTokens[beforeIndex].key;
        const afterWord = afterTokens[afterIndex].key;
        if (beforeWord === afterWord) {
            currentLength++;
            beforeIndex = beforeStart + currentLength;
            afterIndex = afterStart + currentLength;
        } else {
            searching = false;
        }
    }

    // If we've been asked to look behind, it's because both beforeTokens and afterTokens may
    // have a whitespace token just behind the current match that was previously ignored. If so,
    // we'll expand the current match to include it.
    if (lookBehind && beforeStart > 0 && afterStart > 0) {
        const prevBeforeKey = beforeTokens[beforeStart - 1].key;
        const prevAfterKey = afterTokens[afterStart - 1].key;
        if (prevBeforeKey === " " && prevAfterKey === " ") {
            beforeStart--;
            afterStart--;
            currentLength++;
        }
    }

    return new Match(beforeStart, afterStart, currentLength, segment);
}

/**
 * Creates segment objects from the original document that can be used to restrict the area
 * that findBestMatch and its helper functions search to increase performance.
 * @param beforeTokens Tokens from the before document.
 * @param afterTokens Tokens from the after document.
 * @param beforeIndex The index within the before document where this segment begins.
 * @param afterIndex The index within the after document where this segment begins.
 * @returns The segment object.
 */
export function createSegment(beforeTokens: Token[], afterTokens: Token[], beforeIndex: number, afterIndex: number): Segment {
    return {
        beforeTokens,
        afterTokens,
        beforeMap: createMap(beforeTokens),
        afterMap: createMap(afterTokens),
        beforeIndex,
        afterIndex,
    };
}

/**
 * Finds all the matching blocks within the given segment in the before and after lists of
 * tokens.
 * @param segment The segment that should be searched for matching blocks.
 * @returns The list of matching blocks in this range.
 */
export function findMatchingBlocks(segment: Segment): Match[] {
    // Create a binary search tree to hold the matches we find in order.
    const matches = new MatchBinarySearchTree();
    const segments = [segment];

    // Each time the best match is found in a segment, zero, one or two new segments may be
    // created from the parts of the original segment not included in the match. We will
    // continue to iterate until all segments have been processed.
    while (segments.length) {
        const current = segments.pop() as Segment;
        const match = findBestMatch(current);

        if (match && match.length) {
            // If there's an unmatched area at the start of the segment, create a new segment
            // from that area and throw it into the segments array to get processed.
            if (match.segmentStartInBefore > 0 && match.segmentStartInAfter > 0) {
                const leftBeforeTokens = current.beforeTokens.slice(0, match.segmentStartInBefore);
                const leftAfterTokens = current.afterTokens.slice(0, match.segmentStartInAfter);

                segments.push(createSegment(leftBeforeTokens, leftAfterTokens, current.beforeIndex, current.afterIndex));
            }

            // If there's an unmatched area at the end of the segment, create a new segment from
            // that area and throw it into the segments array to get processed.
            const rightBeforeTokens = current.beforeTokens.slice(match.segmentEndInBefore + 1);
            const rightAfterTokens = current.afterTokens.slice(match.segmentEndInAfter + 1);
            const rightBeforeIndex = current.beforeIndex + match.segmentEndInBefore + 1;
            const rightAfterIndex = current.afterIndex + match.segmentEndInAfter + 1;

            if (rightBeforeTokens.length && rightAfterTokens.length) {
                segments.push(createSegment(rightBeforeTokens, rightAfterTokens, rightBeforeIndex, rightAfterIndex));
            }

            matches.add(match);
        }
    }

    return matches.toArray();
}
