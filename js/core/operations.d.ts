import { Token } from "./tokens";
/** What happened to a range of tokens. */
export declare type OperationAction = "equal" | "insert" | "delete" | "replace";
/**
 * A range of tokens on both sides and what happened to it. The end is null on the side an
 * operation does not touch: an insert has no before range, a delete no after range.
 */
export interface Operation {
    action: OperationAction;
    startInBefore: number;
    endInBefore: number | null;
    startInAfter: number;
    endInAfter: number | null;
}
/**
 * Gets a list of operations required to transform the before list of tokens into the
 * after list of tokens. An operation describes whether a particular list of consecutive
 * tokens are equal, replaced, inserted, or deleted.
 * @param beforeTokens The before list of tokens.
 * @param afterTokens The after list of tokens.
 * @returns The list of operations to transform the before list of tokens into the after list.
 */
export declare function calculateOperations(beforeTokens: Token[], afterTokens: Token[]): Operation[];
