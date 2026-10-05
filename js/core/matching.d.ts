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
export declare type TokenMap = Record<string, number[]>;
/**
 * A Match stores the information of a matching block. A matching block is a list of
 * consecutive tokens that appear in both the before and after lists of tokens.
 */
export declare class Match {
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
    constructor(startInBefore: number, startInAfter: number, length: number, segment: Segment);
}
/**
 * Creates a map from token key to an array of indices of locations of the matching token in
 * the list of all tokens.
 * @param tokens The list of tokens to be mapped.
 * @returns A mapping that can be used to search for tokens.
 */
export declare function createMap(tokens: Token[]): TokenMap;
/**
 * Finds and returns the best match between the before and after arrays contained in the
 * segment provided.
 * @param segment The segment in which to look for a match.
 * @returns The best match, or null when the segment has none.
 */
export declare function findBestMatch(segment: Segment): Match | null;
/**
 * Creates segment objects from the original document that can be used to restrict the area
 * that findBestMatch and its helper functions search to increase performance.
 * @param beforeTokens Tokens from the before document.
 * @param afterTokens Tokens from the after document.
 * @param beforeIndex The index within the before document where this segment begins.
 * @param afterIndex The index within the after document where this segment begins.
 * @returns The segment object.
 */
export declare function createSegment(beforeTokens: Token[], afterTokens: Token[], beforeIndex: number, afterIndex: number): Segment;
/**
 * Finds all the matching blocks within the given segment in the before and after lists of
 * tokens.
 * @param segment The segment that should be searched for matching blocks.
 * @returns The list of matching blocks in this range.
 */
export declare function findMatchingBlocks(segment: Segment): Match[];
