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

After cloning the repository run `npm i` or `npm install` to install the necessary 
dependencies. A run of `npm run make` creates the JavaScript output file. 
`npm run lint` checks the TypeScript sources with TSLint. `npm test` runs all the
tests from the `test` directory. `npm run testsample` diffs the HTML sample files 
from the directory `sample` and logs the result to the console.

The command line interface of htmldiff is developed in TypeScript so you have to run
`npm run make` once to create the JavaScript output file.


## Credits

This module wouldn't have been possible without code from the following projects/persons:

- Original project: [The Network Inc.](http://www.tninetwork.com), [Github](https://github.com/tnwinc/htmldiff.js)
- Massive improvements of the original code: [Inkling](https://www.inkling.com), [Github](https://github.com/inkling/htmldiff.js)
- Support of more tags: Ian White, [Github](https://github.com/ian97531)


## License

MIT © [idesis GmbH](https://www.idesis.de), Max-Keith-Straße 66 (E 11), D-45136 Essen

See the `LICENSE` file for details.
