/**
 * Operations: turns the matching blocks into the list of equal, insert, delete and replace
 * steps that transform the before tokens into the after tokens.
 */
import { createSegment, findMatchingBlocks, Match } from "./matching";
import { Token } from "./tokens";

/** What happened to a range of tokens. */
export type OperationAction = "equal" | "insert" | "delete" | "replace";

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
export function calculateOperations(beforeTokens: Token[], afterTokens: Token[]): Operation[] {
    if (!beforeTokens) throw new Error("Missing beforeTokens");
    if (!afterTokens) throw new Error("Missing afterTokens");

    let positionInBefore = 0;
    let positionInAfter = 0;
    const operations: Operation[] = [];
    const segment = createSegment(beforeTokens, afterTokens, 0, 0);
    const matches = findMatchingBlocks(segment);
    matches.push(new Match(beforeTokens.length, afterTokens.length, 0, segment));

    for (let index = 0; index < matches.length; index++) {
        const match = matches[index];
        let actionUpToMatchPositions: OperationAction | "none" = "none";
        if (positionInBefore === match.startInBefore) {
            if (positionInAfter !== match.startInAfter) {
                actionUpToMatchPositions = "insert";
            }
        } else {
            actionUpToMatchPositions = "delete";
            if (positionInAfter !== match.startInAfter) {
                actionUpToMatchPositions = "replace";
            }
        }
        if (actionUpToMatchPositions !== "none") {
            operations.push({
                action: actionUpToMatchPositions,
                startInBefore: positionInBefore,
                endInBefore: actionUpToMatchPositions !== "insert" ? match.startInBefore - 1 : null,
                startInAfter: positionInAfter,
                endInAfter: actionUpToMatchPositions !== "delete" ? match.startInAfter - 1 : null,
            });
        }
        if (match.length !== 0) {
            operations.push({
                action: "equal",
                startInBefore: match.startInBefore,
                endInBefore: match.endInBefore,
                startInAfter: match.startInAfter,
                endInAfter: match.endInAfter,
            });
        }
        positionInBefore = match.endInBefore + 1;
        positionInAfter = match.endInAfter + 1;
    }

    const postProcessed: Operation[] = [];
    let lastOp: Operation | { action: "none" } = { action: "none" };

    function isSingleWhitespace(op: Operation): boolean {
        if (op.action !== "equal") {
            return false;
        }
        if ((op.endInBefore as number) - op.startInBefore !== 0) {
            return false;
        }
        return /^\s$/.test(String(beforeTokens.slice(op.startInBefore, (op.endInBefore as number) + 1)));
    }

    for (let i = 0; i < operations.length; i++) {
        const op = operations[i];

        if (
            lastOp.action === "replace" &&
            (isSingleWhitespace(op) || op.action === "replace")
        ) {
            lastOp.endInBefore = op.endInBefore;
            lastOp.endInAfter = op.endInAfter;
        } else {
            postProcessed.push(op);
            lastOp = op;
        }
    }
    return postProcessed;
}
