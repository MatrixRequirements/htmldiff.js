import { expect } from "chai";
import { findElements } from "./html";
import { RowAligner } from "./RowAligner";
import { Alignment } from "./SequenceAligner";
import { Table } from "./Table";
import { TableVersion } from "./TableVersion";

describe("RowAligner", () => {
    const ref = (itemRef: string): string => `<smart-link data-htmldiff-id="${itemRef}">${itemRef}</smart-link>`;
    const version = (markup: string): TableVersion => TableVersion.read(Table.read(findElements(markup, ["table"])[0]));
    const plain = (cells: string[][]): string =>
        `<table><tbody>${cells.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const twoColumns: Alignment[] = [
        { kind: "same", oldIndex: 0, newIndex: 0 },
        { kind: "same", oldIndex: 1, newIndex: 1 },
    ];

    describe("align", () => {
        it("pairs rows by content outside a section", () => {
            const aligner = new RowAligner(
                version(
                    plain([
                        ["a", "b"],
                        ["c", "d"],
                    ]),
                ),
                version(
                    plain([
                        ["a", "x"],
                        ["e", "f"],
                    ]),
                ),
                twoColumns,
            );
            expect(aligner.align()).to.deep.equal([
                { kind: "same", oldIndex: 0, newIndex: 0 },
                { kind: "deleted", oldIndex: 1 },
                { kind: "added", newIndex: 1 },
            ]);
        });

        describe("keyed tables", () => {
            const keyed = (keys: string[], content: string[]): string =>
                `<table><tbody><tr>${keys.map((key) => `<td data-htmldiff-id="${key}">${key} title</td>`).join("")}${content
                    .map((cell) => `<td>${cell}</td>`)
                    .join("")}</tr></tbody></table>`;
            const columns = (count: number): Alignment[] => Array.from({ length: count }, (_, index) => ({ kind: "same", oldIndex: index, newIndex: index }));

            it("pairs rows with the same keys whatever their other cells say", () => {
                const aligner = new RowAligner(
                    version(keyed(["TR-3", "TC-1", "XTC-11"], ["", "", "pending"])),
                    version(keyed(["TR-3", "TC-1", "XTC-11"], ["2026/10/05", "jdoe", "passed"])),
                    columns(6),
                );
                expect(aligner.align()).to.deep.equal([{ kind: "same", oldIndex: 0, newIndex: 0 }]);
            });

            it("pairs rows with the same keys when a key cell's text changed", () => {
                const aligner = new RowAligner(
                    version('<table><tbody><tr><td data-htmldiff-id="SPEC-6">SPEC-6</td><td data-htmldiff-id="TC-3">TC-3 Brake test</td></tr></tbody></table>'),
                    version('<table><tbody><tr><td data-htmldiff-id="SPEC-6">SPEC-6</td><td data-htmldiff-id="TC-3">TC-3 Brake tests run</td></tr></tbody></table>'),
                    twoColumns,
                );
                expect(aligner.align()).to.deep.equal([{ kind: "same", oldIndex: 0, newIndex: 0 }]);
            });

            it("keeps rows with a different key apart", () => {
                const aligner = new RowAligner(
                    version(keyed(["SPEC-6", "TC-3"], ["same"])),
                    version(keyed(["SPEC-6", "TC-4"], ["same"])),
                    columns(3),
                );
                expect(aligner.align()).to.deep.equal([
                    { kind: "deleted", oldIndex: 0 },
                    { kind: "added", newIndex: 0 },
                ]);
            });

            it("pairs by content when only one version is keyed", () => {
                const aligner = new RowAligner(
                    version(keyed(["RISK-1"], ["same", "text"])),
                    version(plain([[`${ref("RISK-1")} title`, "same", "text"]])),
                    columns(3),
                );
                expect(aligner.align()).to.deep.equal([{ kind: "same", oldIndex: 0, newIndex: 0 }]);
            });
        });

        it("ignores a line number column", () => {
            const aligner = new RowAligner(
                version(
                    plain([
                        ["1", "a"],
                        ["2", "b"],
                    ]),
                ),
                version(
                    plain([
                        ["1", "b"],
                        ["2", "a"],
                    ]),
                ),
                twoColumns,
            );
            expect(aligner.align()).to.deep.equal([
                { kind: "deleted", oldIndex: 0 },
                { kind: "same", oldIndex: 1, newIndex: 0 },
                { kind: "added", newIndex: 1 },
            ]);
        });
    });

    describe("alternateReplaced", () => {
        it("alternates deleted and added rows of a replaced run", () => {
            const v = version(plain([["a"], ["b"]]));
            const aligner = new RowAligner(v, v, [{ kind: "same", oldIndex: 0, newIndex: 0 }]);
            expect(
                aligner.alternateReplaced([
                    { kind: "deleted", oldIndex: 0 },
                    { kind: "deleted", oldIndex: 1 },
                    { kind: "added", newIndex: 0 },
                    { kind: "added", newIndex: 1 },
                ]),
            ).to.deep.equal([
                { kind: "deleted", oldIndex: 0 },
                { kind: "added", newIndex: 0 },
                { kind: "deleted", oldIndex: 1 },
                { kind: "added", newIndex: 1 },
            ]);
        });
    });
});
