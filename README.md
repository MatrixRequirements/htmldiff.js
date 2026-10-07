# htmldiff.js

Diff and markup HTML with `<ins>` and `<del>` tags.


## Origin

Quote from the original source of this fork:

*`htmldiff.js` is a JavaScript port of [https://github.com/myobie/htmldiff](https://github.com/myobie/htmldiff) by
[Keanu Lee](http://keanulee.com) at [Inkling](https://www.inkling.com/).*

**htmldiff.js** is based on [this fork](https://github.com/inkling/htmldiff.js) and adds a few things:

- Diffing of video, math, widget, iframe, img and svg tags.
- Ability to set atomic tags via the API.
- A command line interface.
- TypeScript support.
- Better documentation.

**@matrixreq/htmldiff** is the Matrix Requirements fork of
[node-htmldiff](https://github.com/idesis-gmbh/htmldiff.js) and adds the following on top
of it:

- Identity matching: elements with a `data-htmldiff-id` attribute are treated as atomic and
  compared by the attribute value instead of by their content.
- An opt-in recursive inner diff for identity-matched elements via the
  `data-htmldiff-inner-diff` and `data-htmldiff-inner-diff-atomic-tags` attributes. See
  *Identity matching and recursive inner diff* below for both features.
- Atomic tags may contain nested same-named children: the atomic token ends only when the
  tag's nesting depth returns to zero, and a stray `>` inside e.g. script content is not
  treated as a tag boundary.
- Tokenizer robustness: atomic tag names only match complete names (`<abbr>` is not
  mistaken for the atomic tag `a`), and self-closing (`<div/>`) or void (`<img>`, `<br>`,
  ...) atomic elements do not swallow the content following them.
- Quote-aware tag parsing: `>` and `/>` inside quoted attribute values (e.g.
  `title="a > b"`) do not end a tag prematurely, neither when tokenizing nor when
  splitting an element for the recursive inner diff.
- Adjacent atomic tags are wrapped in their own `<ins>`/`<del>` tags instead of being
  combined into one.
- Inserted tags are marked with a `data-inserted="true"` attribute.
- Whitespace handling: repeated whitespace (except newlines) as well as `&nbsp;`/`&#160;`
  compare as equal to regular spaces.
- Deletions of a closing/opening tag pair (e.g. the `</p><p>` removed when two paragraphs
  are merged) render as a proper `<del>` instead of unbalanced tags.
- Fixed the `atomicTags` parameter of the diff function: the custom tag list was previously
  ignored due to a broken regular expression.

See also *Credits* below.

## Description

htmldiff takes two HTML snippets or files and marks the differences between them with
`<ins>` and `<del>` tags. The diffing understands HTML so it doesn't do a pure text diff,
instead it will insert the appropriate tags for changed/added/deleted text nodes, single 
tags or tag hierarchies.

The module can be used as module in Node.js, with RequireJS, or even just as a script tag.

## API

The module exports a single default function:

JavaScript:

````javascript
diff(before, after, className, dataPrefix, atomicTags);
````

TypeScript:

````javascript
function diff(before: string, after: string, className?: string | null, dataPrefix?: string | null, atomicTags?: string | null): string;
````

### Parameters

- `before` (string) is the original HTML text.
- `after` (string) is the HTML text after the changes have been applied.

The return value is a string with the diff result, marked by `<ins>` and `del` tags. The 
function has three optional parameters. If an empty string or `null` is used for any
of these three parameters it will be ignored:

- `className` (string) className will be added as a class attribute on every inserted 
  `<ins>` and `<del>` tag.
- `dataPrefix` (string) The data prefix to use for data attributes. The so called *operation 
  index data attribute* will be named `data-${dataPrefix-}operation-index`. If not used, 
  the default attribute name `data-operation-index` will be added on every inserted 
  `<ins>` and `<del>` tag. The value of this attribute is an auto incremented counter. 
- `atomicTags` (string) Comma separated list of tag names. The list has to be in the form 
  `tag1,tag2,...` e. g. `head,script,style`. An atomic tag is one whose child nodes should 
  not be compared - the entire tag should be treated as one token. This is useful for tags 
  where it does not make sense to insert `<ins>` and `<del>` tags. If not used, the default 
  list will be used:
  `iframe,object,math,svg,script,video,head,style`.


### Identity matching and recursive inner diff

Elements can be matched across the two documents by identity instead of content by giving
them a `data-htmldiff-id` attribute. Such an element is treated as atomic (its children are
never diffed) and compared solely by the attribute value: two elements with the same id are
considered equal even if their content differs, in which case the after version is rendered
as is.

To make content changes of such identity-matched elements visible, add the
`data-htmldiff-inner-diff="true"` attribute (alongside `data-htmldiff-id`). A bare
attribute or any value other than `false` enables the behavior;
`data-htmldiff-inner-diff="false"` disables it:

```html
<div class="toc-entry" data-htmldiff-id="sec-1" data-htmldiff-inner-diff="true">
  <a href="#123">1. Section name</a>
</div>
```

When two matched atomic tokens have the same key but different content and the element has
opted in, the element is rendered once (with the after version's opening and closing tags)
and its inner HTML is diffed recursively, so e.g. a renamed entry shows up as
`... <del>Old name</del><ins>New name</ins> ...` inline. Inside the recursive diff the
default atomic tag list without `a` is used
(`iframe,object,math,svg,script,video,head,style`): link text is diffed word by word and
href-only changes do not produce any diff markup, while embedded content like svg stays
atomic. To use a different atomic tags list inside the recursive diff, set the
`data-htmldiff-inner-diff-atomic-tags` attribute on the opted-in element:

```html
<div data-htmldiff-id="sec-1" data-htmldiff-inner-diff="true"
     data-htmldiff-inner-diff-atomic-tags="svg,iframe,a">
  ...
</div>
```

The value replaces the default list and has the same format as the `atomicTags` API
parameter; an empty value means no tag name is atomic. The attribute is read from the after
version of the element and is only consulted on elements that opted in via
`data-htmldiff-inner-diff`.

Opted-in elements nested inside other opted-in elements are diffed recursively as well;
each nesting level requires its own `data-htmldiff-inner-diff` attribute.

Limitations:

- The recursion depth is capped at 10 levels as a backstop against deep
  nesting. Opted-in elements beyond the cap are rendered as their after version.

### Tables

Tables are compared as structures before the flat diff runs. A table with its own
`data-htmldiff-id` takes part only when it also carries `data-htmldiff-inner-diff`, like every
other element with an identity: without the inner-id it is one unit, shown as it is or replaced
whole. The two documents' top level
tables are paired (by their own `data-htmldiff-id` when they have one, otherwise by the values
they hold; a table in the other's place is the same table only when the two still share half of
what the smaller one holds, or when both are generated tables, see below), each pair is aligned
column by column and row by row, and a merged table takes the place of the after version's
table. A table without a partner is kept whole, so the flat diff wraps it as added or deleted:

- an added or deleted row is a whole row with the class `table-row-added` or
  `table-row-deleted`,
- an added or deleted column marks every one of its cells (and its `<col>`, when the table has
  a `<colgroup>`) with `table-cell-added` or `table-cell-deleted`,
- a kept cell holds the diff of its content, with the usual `<ins>`/`<del>` tags,
- a row that keeps less than half of its content, or a column no kept row agrees with, is
  deleted and added instead of diffed; so is a moved row or column,
- merged cells (`rowspan`, `colspan`) are kept. A row that a kept group (a merged cell and the
  rows it spans) lost or gained goes under the group's kept rows and carries the change on its
  cells (`table-cell-deleted` / `table-cell-added`), not on the row: the group's cell, sitting on
  the group's first kept row, spans it like any other row of the group. A view that hides the
  changed cells then hides nothing the span counts on, so the layout holds. A whole group that
  one version has is added or deleted row by row.
- in a table without such a statement, a change of its merged cells (a cell merged, split, a
  span grown or shrunk) makes it another table: both versions are kept whole.

The diff reads nothing else from the content. A producer that knows what a row is about says
so by giving the cells an identity with `data-htmldiff-id`. 
When both versions carry such cells, those alone pair the rows: the same
identities are the same row, whatever its other cells say, and they get cell diffs; other
identities are another row, deleted and added whole.

Both versions of a pair get the same `data-htmldiff-id` (`redline-table-<n>` unless the table
had one), a table only one version has gets one of its own, so the flat diff keeps every table
whole and emits the merged table as it is. The styling of the classes is up to the consumer.

### Example

JavaScript:

```javascript
  diff = require('node-htmldiff');

  console.log(diff('<p>This is some text</p>', '<p>That is some more text</p>', 'myClass'));
```

TypeScript:

```javascript
  import diff = require("node-htmldiff");

  console.log(diff("<p>This is some text</p>", "<p>That is some more text</p>", "myClass"));
```

Please note that `diff` is only an arbitrary name; since the module exports only one default 
function you can use whatever name you like, e. g., `diffHTML`.

Result:

```html
<p><del data-operation-index="1" class="myClass">This</del><ins data-operation-index="1" class="myClass">That</ins> is some<ins data-operation-index="3" class="myClass"> more</ins> text.</p>
```


## Command line interface

```bash
htmldiff beforeFile afterFile diffedFile [-c className] [-p dataPrefix] [-t atomicTags]
```

Parameters: 

- `beforeFile` An HTML input file in its original form.

- `afterFile` An HTML input file, based on `beforeFile` but with changes.

- `diffedFile` Name of the diffed HTML output file. All differences between
  `beforeFile` and `afterFile` will be surrounded with `<ins>` and `<del>`
  tags. If diffedFile is `-` (minus) the result will be written with 
  `console.log()` to stdout.

Options:

`-c className`, `-p dataPrefix` and `-t atomicTags` are all optional. For a
description please see API documentation above.


## Development

After cloning the repository run `npm install` to install the dependencies.

Everything is TypeScript. The library lives in `src/` and is compiled to CommonJS in `js/`
(`js/htmldiff.js` is the entry point, `js/htmldiff.d.ts` the typings); `js/` is what gets
published.

- `src/htmldiff.ts` is the facade: it runs the table pass, then the flat diff.
- `src/core/` is the flat diff, one module per stage: `atomicTags` (which elements are one
  token), `tokens` (tokenizing and token keys), `matching` (matching blocks), `operations`
  (insert, delete, replace, equal), `rendering` (ins/del markup and the recursive inner
  diff) and `diff` (the pipeline).
- `src/tables/` is the structural table pass, one class per concern: `Cell`, `Row` and
  `Table` are the model, `TableVersion` a table as the alignment reads it, `SequenceAligner`,
  `ColumnAligner`, `RowAligner` and `TableAligner` decide what is the same, `MergedCells`
  handles spans, `TableMerger` writes the merged table and `TableRedlining` is the pass
  itself. `html.ts`, `similarity.ts` and `helpers.ts` are plain helper functions.

Tests are TypeScript too, run by mocha through `ts-node`. Every module and class has a spec
next to it (`src/**/*.spec.ts`, left out of the build); the end to end specs that go through
`diff()` itself live in `test/`.

Scripts:

- `npm run build` compiles `src/` to `js/`.
- `npm test` builds, type-checks sources and specs, then runs the specs.
- `npm run lint` checks sources and specs with ESLint.
- `npm run verify` does all of that in one go and compiles the CLI; `npm publish` runs it first
  (`prepublishOnly`), so nothing unbuilt or untested can be published. `npm install` in a clone
  builds `js/` as well (`prepare`).
- `npm run make` builds the library and the command line interface, `htmldiff-cli.ts`.
- `npm run testsample` diffs the HTML sample files from the directory `sample` and logs the
  result to the console.


## Credits

This module wouldn't have been possible without code from the following projects/persons:

- Original project: [The Network Inc.](http://www.tninetwork.com), [Github](https://github.com/tnwinc/htmldiff.js)
- Massive improvements of the original code: [Inkling](https://www.inkling.com), [Github](https://github.com/inkling/htmldiff.js)
- Support of more tags: Ian White, [Github](https://github.com/ian97531)


## License

MIT © [idesis GmbH](https://www.idesis.de), Max-Keith-Straße 66 (E 11), D-45136 Essen

See the `LICENSE` file for details.
