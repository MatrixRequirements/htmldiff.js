import { expect } from "chai";
import { ColumnAligner } from "./ColumnAligner";
import { findElements } from "./html";
import { Alignment } from "./SequenceAligner";
import { Table } from "./Table";
import { TableVersion } from "./TableVersion";

describe("ColumnAligner", () => {
    const version = (markup: string): TableVersion => TableVersion.read(Table.read(findElements(markup, ["table"])[0]));
    const rows = (cells: string[][]): string =>
        `<table><tbody>${cells.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const same: Alignment[] = [
        { kind: "same", oldIndex: 0, newIndex: 0 },
        { kind: "same", oldIndex: 1, newIndex: 1 },
    ];

    describe("align", () => {
        it("pairs columns by their values whatever the rows did", () => {
            const aligner = new ColumnAligner(
                version(
                    rows([
                        ["a", "b"],
                        ["c", "d"],
                    ]),
                ),
                version(
                    rows([
                        ["x", "b"],
                        ["c", "d"],
                        ["e", "f"],
                    ]),
                ),
            );
            expect(aligner.align()).to.deep.equal(same);
        });

        it("adds a column in the middle", () => {
            expect(new ColumnAligner(version(rows([["a", "b"]])), version(rows([["a", "n", "b"]]))).align()).to.deep.equal([
                { kind: "same", oldIndex: 0, newIndex: 0 },
                { kind: "added", newIndex: 1 },
                { kind: "same", oldIndex: 1, newIndex: 2 },
            ]);
        });

        it("pairs columns in place when the values tell nothing", () => {
            expect(new ColumnAligner(version(rows([["a", "b"]])), version(rows([["x", "y"]]))).align()).to.deep.equal(same);
        });
    });

    describe("splitReplaced", () => {
        it("splits a column no kept row agrees with", () => {
            const aligner = new ColumnAligner(
                version(
                    rows([
                        ["a", "b"],
                        ["c", "d"],
                    ]),
                ),
                version(
                    rows([
                        ["a", "1"],
                        ["c", "2"],
                    ]),
                ),
            );
            expect(aligner.splitReplaced(same, same)).to.deep.equal([
                { kind: "same", oldIndex: 0, newIndex: 0 },
                { kind: "deleted", oldIndex: 1 },
                { kind: "added", newIndex: 1 },
            ]);
        });

        it("needs two kept rows to tell a replacement from an edit", () => {
            const aligner = new ColumnAligner(version(rows([["a", "b"]])), version(rows([["a", "1"]])));
            expect(aligner.splitReplaced(same, [{ kind: "same", oldIndex: 0, newIndex: 0 }])).to.deep.equal(same);
        });

        it("never splits a line number column", () => {
            const aligner = new ColumnAligner(
                version(
                    rows([
                        ["1", "a"],
                        ["2", "b"],
                    ]),
                ),
                version(
                    rows([
                        ["1", "b"],
                        ["2", "a"],
                    ]),
                ),
            );
            const kept: Alignment[] = [
                { kind: "same", oldIndex: 1, newIndex: 0 },
                { kind: "same", oldIndex: 0, newIndex: 1 },
            ];
            expect(aligner.splitReplaced(same, kept)).to.deep.equal(same);
        });
    });

    describe("rebuildColgroup", () => {
        it("writes one col per merged column with the change on it", () => {
            const aligner = new ColumnAligner(
                version('<table><colgroup><col style="a" /><col style="b" /></colgroup><tbody><tr><td>a</td><td>b</td></tr></tbody></table>'),
                version('<table><colgroup><col style="c" /></colgroup><tbody><tr><td>a</td></tr></tbody></table>'),
            );
            const merged = '<colgroup><col style="c" /></colgroup><tbody><tr><td>a</td><td class="table-cell-deleted">b</td></tr></tbody>';
            expect(
                aligner.rebuildColgroup(
                    [
                        { kind: "same", oldIndex: 0, newIndex: 0 },
                        { kind: "deleted", oldIndex: 1 },
                    ],
                    merged,
                ),
            ).to.equal(
                '<colgroup><col style="c" /><col style="b" class="table-cell-deleted" /></colgroup><tbody><tr><td>a</td><td class="table-cell-deleted">b</td></tr></tbody>',
            );
        });

        it("leaves a table without colgroup alone", () => {
            const v = version(rows([["a"]]));
            expect(new ColumnAligner(v, v).rebuildColgroup([{ kind: "same", oldIndex: 0, newIndex: 0 }], "inner")).to.equal("inner");
        });
    });
});
