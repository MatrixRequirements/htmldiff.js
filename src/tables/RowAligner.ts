/**
 * Which row of the old table is which row of the new one: by the identities its producer gave
 * its cells, else by what its cells say.
 */
import { last, range } from "./helpers";
import { Alignment, SameAlignment, SequenceAligner } from "./SequenceAligner";
import { signatureWords, wordSimilarity } from "./similarity";
import { TableVersion } from "./TableVersion";

/** What a row says on the compared columns, read once: every old row is compared with every new one. */
interface RowContent {
    /** Per compared column. */
    signatures: string[];
    /** Per compared column, the distinct words of the signature. */
    words: string[][];
    /** Nothing on any compared column. */
    blank: boolean;
    /** The producer's keys of the row, when the table is keyed. */
    keys: string[];
    /** Rows with the same key are exactly the same row; an integer, so the exact pass only compares numbers. */
    exactKey: number;
}

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
        const keyed = this.oldVersion.hasRowKeys && this.newVersion.hasRowKeys;
        const exactKeys = new Map<string, number>();
        const oldRows = RowAligner.readRows(
            this.oldVersion,
            this.comparedColumns.map((column) => column.oldIndex),
            keyed,
            exactKeys,
        );
        const newRows = RowAligner.readRows(
            this.newVersion,
            this.comparedColumns.map((column) => column.newIndex),
            keyed,
            exactKeys,
        );

        // the share of what the cells said that is still there, averaged over the columns that
        // say anything; the same keys are the same row, other keys another row
        const similarity = (oldIndex: number, newIndex: number): number => {
            const oldRow = oldRows[oldIndex];
            const newRow = newRows[newIndex];
            if (keyed) {
                return oldRow.exactKey === newRow.exactKey ? 1 : 0;
            }
            let compared = 0;
            let kept = 0;
            oldRow.signatures.forEach((oldSignature, column) => {
                const newSignature = newRow.signatures[column];
                if (oldSignature === "" && newSignature === "") {
                    return;
                }
                compared++;
                kept += oldSignature === newSignature ? 1 : wordSimilarity(oldRow.words[column], newRow.words[column]);
            });
            return compared === 0 ? NaN : kept / compared;
        };
        // similarity is 1 exactly when every column that says anything keeps the same words, or
        // the keys are the same: two blank rows have no similarity at all
        const isExact = (oldIndex: number, newIndex: number): boolean => {
            const oldRow = oldRows[oldIndex];
            const newRow = newRows[newIndex];
            return oldRow.exactKey === newRow.exactKey && (keyed || !(oldRow.blank && newRow.blank));
        };

        return new SequenceAligner({
            oldCount: oldRows.length,
            newCount: newRows.length,
            similarity,
            isExact,
            byPosition: {
                isOldBlank: (oldIndex) => oldRows[oldIndex].blank,
                isNewBlank: (newIndex) => newRows[newIndex].blank,
                hasOldIdentity: (oldIndex) => keyed && oldRows[oldIndex].keys.length > 0,
                hasNewIdentity: (newIndex) => keyed && newRows[newIndex].keys.length > 0,
            },
        }).align();
    }

    /**
     * Reads what every row says on the compared columns.
     * @param version The version.
     * @param columnIndexes The compared columns of this version.
     * @param keyed Whether the keys name the rows.
     * @param exactKeys The keys seen so far, shared by both versions.
     * @returns The rows.
     */
    private static readRows(version: TableVersion, columnIndexes: number[], keyed: boolean, exactKeys: Map<string, number>): RowContent[] {
        const keysByRow = keyed ? version.rowKeysByRow() : [];
        return range(0, version.rows.length).map((rowIndex) => {
            const signatures = columnIndexes.map((columnIndex) => version.signatureAt(rowIndex, columnIndex));
            const words = signatures.map((signature) => signatureWords(signature));
            const keys = keyed ? keysByRow[rowIndex] : [];
            // keyed: the keys in order. else: the set of words of every column, columns apart
            // (words never contain whitespace or '|')
            const exactKey = keyed ? JSON.stringify(keys) : words.map((cellWords) => cellWords.slice().sort().join(" ")).join("|");
            let interned = exactKeys.get(exactKey);
            if (interned === undefined) {
                interned = exactKeys.size;
                exactKeys.set(exactKey, interned);
            }
            return { signatures, words, blank: signatures.every((signature) => signature === ""), keys, exactKey: interned };
        });
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
