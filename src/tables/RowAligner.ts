/**
 * Which row of the old table is which row of the new one: by the identities its producer gave
 * its cells, else by what its cells say.
 */
import { last, range } from "./helpers";
import { Alignment, SameAlignment, SequenceAligner } from "./SequenceAligner";
import { cellSimilarity } from "./similarity";
import { TableVersion } from "./TableVersion";

/** Which row of the old table is which row of the new one. */
export class RowAligner {
    private readonly oldVersion: TableVersion;
    private readonly newVersion: TableVersion;
    private readonly comparedColumns: SameAlignment[];

    /**
     * @param oldVersion The old version.
     * @param newVersion The new version.
     * @param columns The column alignments: rows are compared on kept columns only.
     */
    constructor(oldVersion: TableVersion, newVersion: TableVersion, columns: Alignment[]) {
        this.oldVersion = oldVersion;
        this.newVersion = newVersion;
        this.comparedColumns = columns.filter(
            (column): column is SameAlignment =>
                column.kind === "same" && (!oldVersion.isSequenceColumn(column.oldIndex) || !newVersion.isSequenceColumn(column.newIndex)),
        );
    }

    /**
     * Rows are compared on kept columns only, so a column change can never make a row look
     * edited. Blank cells carry no identity; a line number column renumbers on every insert
     * and is ignored. A row that keeps less than half of what its cells said is deleted and
     * added, never diffed. Where both versions' cells carry their own identity, those cells
     * alone decide: the same keys are the same row whatever its other cells say, other keys
     * another row.
     * @returns The row alignments.
     */
    align(): Alignment[] {
        const oldVersion = this.oldVersion;
        const newVersion = this.newVersion;
        const comparedColumns = this.comparedColumns;
        const keyed = oldVersion.hasRowKeys && newVersion.hasRowKeys;
        const sameKeys = (oldKeys: string[], newKeys: string[]): boolean =>
            oldKeys.length === newKeys.length && oldKeys.every((key, index) => key === newKeys[index]);

        const similarity = (oldIndex: number, newIndex: number): number => {
            if (keyed) {
                return sameKeys(oldVersion.rowKeys(oldIndex), newVersion.rowKeys(newIndex)) ? 1 : 0;
            }
            let compared = 0;
            let kept = 0;
            comparedColumns.forEach((column) => {
                const oldSignature = oldVersion.signatureAt(oldIndex, column.oldIndex);
                const newSignature = newVersion.signatureAt(newIndex, column.newIndex);
                if (oldSignature === "" && newSignature === "") {
                    return;
                }
                compared++;
                kept += cellSimilarity(oldSignature, newSignature);
            });
            return compared === 0 ? NaN : kept / compared;
        };

        return new SequenceAligner({
            oldCount: oldVersion.rows.length,
            newCount: newVersion.rows.length,
            similarity,
            byPosition: {
                isOldBlank: (oldIndex) => comparedColumns.every((column) => oldVersion.signatureAt(oldIndex, column.oldIndex) === ""),
                isNewBlank: (newIndex) => comparedColumns.every((column) => newVersion.signatureAt(newIndex, column.newIndex) === ""),
                hasOldIdentity: (oldIndex) => keyed && oldVersion.rowKeys(oldIndex).length > 0,
                hasNewIdentity: (newIndex) => keyed && newVersion.rowKeys(newIndex).length > 0,
            },
        }).align();
    }

    /**
     * Where rows were replaced, each deleted row is followed by the added row in its place, so
     * the reader sees old and new together. A group (a row and the rows its merged cell spans)
     * moves as one.
     * @param rows The row alignments.
     * @returns The row alignments, replaced runs alternated.
     */
    alternateReplaced(rows: Alignment[]): Alignment[] {
        let result: Alignment[] = [];
        let run: Alignment[] = [];

        const flushRun = (): void => {
            const deletedUnits = RowAligner.groupIntoUnits(
                run.filter((row) => row.kind === "deleted"),
                (row) => row.kind === "deleted" && this.oldVersion.isContinuationRow(row.oldIndex),
            );
            const addedUnits = RowAligner.groupIntoUnits(
                run.filter((row) => row.kind === "added"),
                (row) => row.kind === "added" && this.newVersion.isContinuationRow(row.newIndex),
            );
            range(0, Math.max(deletedUnits.length, addedUnits.length)).forEach((index) => {
                result = result.concat(deletedUnits[index] || [], addedUnits[index] || []);
            });
            run = [];
        };

        rows.forEach((row) => {
            if (row.kind === "same") {
                flushRun();
                result.push(row);
                return;
            }
            run.push(row);
        });
        flushRun();

        return result;
    }

    /**
     * Consecutive rows, split before every row that starts a new unit.
     * @param rows The rows.
     * @param continuesUnit Whether a row belongs to the unit before it.
     * @returns The units.
     */
    private static groupIntoUnits(rows: Alignment[], continuesUnit: (row: Alignment) => boolean): Alignment[][] {
        const units: Alignment[][] = [];
        rows.forEach((row) => {
            const unit = last(units);
            if (unit && continuesUnit(row)) {
                unit.push(row);
                return;
            }
            units.push([row]);
        });
        return units;
    }
}
