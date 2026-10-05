import { expect } from "chai";
import { findElements } from "../../src/tables/html";
import { RowAligner } from "../../src/tables/RowAligner";
import { Alignment } from "../../src/tables/SequenceAligner";
import { Table } from "../../src/tables/Table";
import { TableVersion } from "../../src/tables/TableVersion";

describe("RowAligner", () => {
    const ref = (itemRef: string): string => `<smart-link data-htmldiff-id="${itemRef}">${itemRef}</smart-link>`;
    const version = (markup: string, inSection = false): TableVersion => TableVersion.read(Table.read(findElements(markup, ["table"])[0], inSection));
    const plain = (cells: string[][]): string =>
        `<table><tbody>${cells.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const twoColumns: Alignment[] = [
        { kind: "same", oldIndex: 0, newIndex: 0 },
        { kind: "same", oldIndex: 1, newIndex: 1 },
    ];

    describe("haveCompatibleRefs", () => {
        it("allows refs only added or only removed", () => {
            expect(RowAligner.haveCompatibleRefs(["A"], ["A", "B"])).to.equal(true);
            expect(RowAligner.haveCompatibleRefs(["A", "B"], ["A"])).to.equal(true);
            expect(RowAligner.haveCompatibleRefs([], ["A"])).to.equal(true);
        });

        it("refuses a swapped ref", () => {
            expect(RowAligner.haveCompatibleRefs(["A"], ["B"])).to.equal(false);
            expect(RowAligner.haveCompatibleRefs(["A", "B"], ["A", "C"])).to.equal(false);
        });
    });

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

        it("keeps rows about different items apart", () => {
            const aligner = new RowAligner(version(plain([[ref("A-1"), "b"]]), true), version(plain([[ref("A-2"), "b"]]), true), twoColumns);
            expect(aligner.align()).to.deep.equal([
                { kind: "deleted", oldIndex: 0 },
                { kind: "added", newIndex: 0 },
            ]);
        });

        it("keeps a row apart when a ref in a cell was swapped", () => {
            const aligner = new RowAligner(
                version(plain([[ref("A-1"), `${ref("T-1")} text`]]), true),
                version(plain([[ref("A-1"), `${ref("T-2")} text`]]), true),
                twoColumns,
            );
            expect(aligner.align()).to.deep.equal([
                { kind: "deleted", oldIndex: 0 },
                { kind: "added", newIndex: 0 },
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
                    version(keyed(["TR-3", "TC-1", "XTC-11"], ["", "", "pending"]), true),
                    version(keyed(["TR-3", "TC-1", "XTC-11"], ["2026/10/05", "jdoe", "passed"]), true),
                    columns(6),
                );
                expect(aligner.align()).to.deep.equal([{ kind: "same", oldIndex: 0, newIndex: 0 }]);
            });

            it("pairs rows with the same keys when a key cell's text changed", () => {
                const aligner = new RowAligner(
                    version('<table><tbody><tr><td data-htmldiff-id="SPEC-6">SPEC-6</td><td data-htmldiff-id="TC-3">TC-3 Brake test</td></tr></tbody></table>', true),
                    version('<table><tbody><tr><td data-htmldiff-id="SPEC-6">SPEC-6</td><td data-htmldiff-id="TC-3">TC-3 Brake tests run</td></tr></tbody></table>', true),
                    twoColumns,
                );
                expect(aligner.align()).to.deep.equal([{ kind: "same", oldIndex: 0, newIndex: 0 }]);
            });

            it("keeps rows with a different key apart", () => {
                const aligner = new RowAligner(
                    version(keyed(["SPEC-6", "TC-3"], ["same"]), true),
                    version(keyed(["SPEC-6", "TC-4"], ["same"]), true),
                    columns(3),
                );
                expect(aligner.align()).to.deep.equal([
                    { kind: "deleted", oldIndex: 0 },
                    { kind: "added", newIndex: 0 },
                ]);
            });

            it("pairs by content when only one version is keyed", () => {
                const aligner = new RowAligner(
                    version(keyed(["RISK-1"], ["same", "text"]), true),
                    version(plain([[`${ref("RISK-1")} title`, "same", "text"]]), true),
                    columns(3),
                );
                expect(aligner.align()).to.deep.equal([{ kind: "same", oldIndex: 0, newIndex: 0 }]);
            });
        });

        it("pairs a row whose cell gained a ref and keeps its content", () => {
            const aligner = new RowAligner(
                version(plain([[ref("A-1"), "same", ref("T-1")]]), true),
                version(plain([[ref("A-1"), "same", `${ref("T-1")} ${ref("T-2")}`]]), true),
                twoColumns.concat([{ kind: "same", oldIndex: 2, newIndex: 2 }]),
            );
            expect(aligner.align()).to.deep.equal([{ kind: "same", oldIndex: 0, newIndex: 0 }]);
        });

        it("pairs an item row that was emptied or filled", () => {
            const aligner = new RowAligner(version(plain([[ref("A-1"), "text"]]), true), version(plain([[ref("A-1"), ""]]), true), twoColumns);
            expect(aligner.align()).to.deep.equal([{ kind: "same", oldIndex: 0, newIndex: 0 }]);
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
