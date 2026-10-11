/**
 * Tokenizing: splits HTML into words, whitespace, tags and atomic elements, and gives every
 * token the key it is compared by.
 */
import { dataHtmlDiffIdRegExp, getAtomicTagsRegExp, isStartOfAtomicTag } from "./atomicTags";

/** A token holds the text to render and the key it is compared by. */
export interface Token {
    string: string;
    key: string;
}

/**
 * Determines if the given token is a tag.
 * @param token The token in question.
 * @returns False if the token is not a tag, or the tag name otherwise.
 */
export function isTag(token: string): string | false {
    const match = token.match(/^\s*<([^!>][^>]*)>\s*$/);
    return !!match && match[1].trim().split(" ")[0];
}

/**
 * Checks if a tag is a void tag, written with the XML style '/>'.
 * @param token The token to check.
 * @returns True if the token is a void tag, false otherwise.
 */
export function isVoidTag(token: string): boolean {
    return /^\s*<[^>]+\/>\s*$/.test(token);
}

/**
 * Checks if a tag name is an HTML void element. Void elements cannot have content and can
 * skip a closing tag, so an atomic element with a void tag name ends with its opening tag,
 * with or without the XML style '/>'.
 * @param tag The tag name to check.
 * @returns True if the tag name is a void element.
 */
export function isVoidTagName(tag: string): boolean {
    return /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(tag);
}

/**
 * Checks if a token can be wrapped inside a tag: text, images, void tags and atomic tags
 * can, other tags cannot.
 * @param token The token to check.
 * @returns True if the token can be wrapped inside a tag, false otherwise.
 */
export function isWrappable(token: string): boolean {
    const isImage = /^<img[\s>]/.test(token);
    return isImage || !isTag(token) || !!isStartOfAtomicTag(token) || isVoidTag(token);
}

/**
 * Creates a token that holds a string and key representation. The key is used for diffing
 * comparisons and the string is used to recompose the document after the diff is complete.
 * @param currentWord The section of the document to create a token for.
 * @returns A token object with a string and key property.
 */
export function createToken(currentWord: string): Token {
    return {
        string: currentWord,
        key: getKeyForToken(currentWord),
    };
}

/**
 * Creates a key that should be used to match tokens. This is useful, for example, if we want
 * to consider two open tag tokens as equal, even if they don't have the same attributes. We
 * use a key instead of overwriting the token because we may want to render the original
 * string without losing the attributes.
 * @param token The token to create the key for.
 * @returns The identifying key that should be used to match before and after tokens.
 */
export function getKeyForToken(token: string): string {
    // If the token is an image element, grab it's src attribute to include in the key.
    const img = /^<img.*src=['"]([^"']*)['"].*>$/.exec(token);
    if (img) {
        return '<img src="' + img[1] + '">';
    }

    // If the token is an a element, grab it's data attribute to include in the key.
    // Only when <a> is atomic: if it has been excluded from the atomic tags (as done in
    // recursive inner diffs), the token is just the opening tag.
    const a = /^<a.*href=['"]([^"']*)['"]/.exec(token);
    if (a && getAtomicTagsRegExp().test("<a ")) {
        return '<a href="' + a[1] + '"></a>';
    }

    // If the token is an object element, grab it's data attribute to include in the key.
    const object = /^<object.*data=['"]([^"']*)['"]/.exec(token);
    if (object) {
        return '<object src="' + object[1] + '"></object>';
    }

    // If it's a video, math or svg element, the entire token should be compared except the
    // data-uuid.
    if (/^<(svg|math|video)[\s>]/.test(token)) {
        const uuid = token.indexOf('data-uuid="');
        if (uuid !== -1) {
            const start = token.slice(0, uuid);
            const end = token.slice(uuid + 44);
            return start + end;
        }
        return token;
    }

    // If the token is an iframe element, grab it's src attribute to include in it's key.
    const iframe = /^<iframe.*src=['"]([^"']*)['"].*>/.exec(token);
    if (iframe) {
        return '<iframe src="' + iframe[1] + '"></iframe>';
    }

    // if the token has data-htmldiff-uuid use it as a key
    const uuidTag = dataHtmlDiffIdRegExp.exec(token);
    if (uuidTag) {
        return uuidTag[2];
    }

    // If the token is any other element, just grab the tag name.
    const tagName = /<([^\s>]+)[\s>]/.exec(token);
    if (tagName) {
        return "<" + tagName[1].toLowerCase() + ">";
    }

    // Otherwise, the token is text, collapse the whitespace
    // (except new lines, see https://matrixreq.atlassian.net/browse/MATRIX-7880)
    // potentially, this also causing the problems with prettified HTML (with "\n" between the tags),
    // so it's required to "flatten" html before passing it to the diffing function
    if (token) {
        return token.replace(/([^\S\r\n]+|&nbsp;|&#160;)/g, " ");
    }
    return token;
}

function isEndOfTag(char: string): boolean {
    return char === ">";
}

function isStartOfTag(char: string): boolean {
    return char === "<";
}

function isWhitespace(char: string): boolean {
    return /^\s+$/.test(char);
}

function isStartOfHtmlComment(word: string): boolean {
    return /^<!--/.test(word);
}

function isEndOfHtmlComment(word: string): boolean {
    return /-->$/.test(word);
}

/**
 * Inspects the last tag read, the text from its final '<'. A '>' before the text's end means
 * text follows e.g. "a > b" in a <script>, not a clean tag, so returns false.
 * @param tagText The characters from the last '<' read up to the current one.
 * @param tag The tag name.
 * @returns True if the text is an opening (non-self-closing) tag for the given tag name.
 */
function isOpeningTagOf(tagText: string, tag: string): boolean {
    if (tagText.indexOf(">") !== tagText.length - 1) {
        return false;
    }
    return new RegExp("^<" + tag + "(\\s|>)").test(tagText) && !/\/>$/.test(tagText);
}

/**
 * Inspects the last tag read, the text from its final '<'. A '>' before the text's end means
 * text follows e.g. "a > b" in a <script>, not a clean tag, so returns false.
 * @param tagText The characters from the last '<' read up to the current one.
 * @param tag The tag name.
 * @returns True if the text is a closing tag for the given tag name.
 */
function isClosingTagOf(tagText: string, tag: string): boolean {
    if (tagText.indexOf(">") !== tagText.length - 1) {
        return false;
    }
    return new RegExp("^</" + tag + "(\\s|>)").test(tagText);
}

type Mode = "char" | "tag" | "atomic_tag" | "html_comment" | "whitespace";

/**
 * Tokenizes a string of HTML.
 * @param html The string to tokenize.
 * @returns The list of tokens.
 */
export function htmlToTokens(html: string): Token[] {
    let mode: Mode = "char";
    let currentWord = "";
    let currentAtomicTag = "";
    let currentAtomicTagDepth = 0;
    // The quote character of the attribute value currently being read, or null. Quoted
    // attribute values may contain any character including '>', so no tag boundary or
    // atomic tag detection applies inside them.
    let currentQuote: string | null = null;
    // True while reading the atomic tag's own opening tag. Quote tracking in atomic
    // mode is limited to that region: quotes in the element's content (text
    // apostrophes, comments, nested tags) must not affect how the token ends.
    let inAtomicOpeningTag = false;
    // Where the last '<' read stands in the html: the tag being read inside an atomic
    // element is inspected there, instead of searching back through the whole token on
    // every '>', which made a large atomic element (a merged table) cost its size per tag.
    let lastTagStart = -1;
    const words: Token[] = [];

    /**
     * Consumes a character belonging to a quoted attribute value, updating the quote
     * state. Quoted values may contain any character including '>', so as long as a
     * quote is open no tag boundary or atomic tag detection applies.
     * @param char The current character.
     * @param canOpenQuote Whether a quote may start at this position.
     * @returns True if the character was consumed and no other handling applies to it.
     */
    function consumeAttributeQuote(char: string, canOpenQuote: boolean): boolean {
        if (currentQuote) {
            if (char === currentQuote) {
                currentQuote = null;
            }
            return true;
        }
        if (canOpenQuote && (char === '"' || char === "'")) {
            currentQuote = char;
            return true;
        }
        return false;
    }

    for (let i = 0; i < html.length; i++) {
        const char = html[i];
        if (isStartOfTag(char)) {
            lastTagStart = i;
        }
        switch (mode) {
            case "tag": {
                // Quote handling must come before the atomic tag detection:
                // dataHtmlDiffIdRegExp can match right at the opening quote of the
                // attribute value, which would enter atomic mode with the quote
                // tracking out of sync.
                if (consumeAttributeQuote(char, true)) {
                    currentWord += char;
                    break;
                }
                // The atomic tag regexps require a delimiter after the tag name, so the
                // current character must be included in the check: without it a tag
                // ending right at the name (e.g. '<script' + '>') would never match.
                const atomicTag = isStartOfAtomicTag(currentWord + char);
                if (atomicTag && isEndOfTag(char) && (isVoidTagName(atomicTag) || /\/$/.test(currentWord))) {
                    // The atomic tag itself is void or self-closing: it has no content
                    // that could be swallowed, emit it as a complete token.
                    currentWord += ">";
                    words.push(createToken(currentWord));
                    currentWord = "";
                    mode = "char";
                } else if (atomicTag) {
                    mode = "atomic_tag";
                    currentAtomicTag = atomicTag;
                    // we are still inside the atomic tag's own opening tag unless this
                    // character just ended it
                    inAtomicOpeningTag = !isEndOfTag(char);
                    // skip standalone tags like <script> and <style>
                    currentAtomicTagDepth = isEndOfTag(char) ? 1 : 0;
                    currentWord += char;
                } else if (isStartOfHtmlComment(currentWord)) {
                    mode = "html_comment";
                    currentWord += char;
                } else if (isEndOfTag(char)) {
                    currentWord += ">";
                    words.push(createToken(currentWord));
                    currentWord = "";
                    if (isWhitespace(char)) {
                        mode = "whitespace";
                    } else {
                        mode = "char";
                    }
                } else {
                    currentWord += char;
                }
                break;
            }
            case "atomic_tag":
                currentWord += char;
                // Quotes may only open inside the atomic tag's own opening tag, where
                // attribute values may contain '>' or '/>' and must not affect the
                // depth tracking below. Quote characters in the element's content
                // (text apostrophes, comments) are not attribute quotes.
                if (consumeAttributeQuote(char, inAtomicOpeningTag)) {
                    break;
                }
                // track the same name nested tags depth;
                // end the atomic token only when it returns to 0.
                if (isEndOfTag(char)) {
                    inAtomicOpeningTag = false;
                    // the current word holds the html from the element's '<' up to here, so
                    // its last tag is the html from the last '<' up to here
                    const tagText = html.slice(lastTagStart, i + 1);
                    if (isClosingTagOf(tagText, currentAtomicTag)) {
                        currentAtomicTagDepth--;
                        if (currentAtomicTagDepth <= 0) {
                            words.push(createToken(currentWord));
                            currentWord = "";
                            currentAtomicTag = "";
                            currentAtomicTagDepth = 0;
                            mode = "char";
                        }
                    } else if (currentAtomicTagDepth === 0 && (isVoidTagName(currentAtomicTag) || html[i - 1] === "/")) {
                        // At depth 0 this '>' can only end the atomic tag's own opening
                        // tag. When the element is void or self-closing it has no
                        // content: end the token so trailing content tokenizes normally.
                        words.push(createToken(currentWord));
                        currentWord = "";
                        currentAtomicTag = "";
                        mode = "char";
                    } else if (isOpeningTagOf(tagText, currentAtomicTag)) {
                        currentAtomicTagDepth++;
                    }
                }
                break;
            case "html_comment":
                currentWord += char;
                if (isEndOfHtmlComment(currentWord)) {
                    currentWord = "";
                    mode = "char";
                }
                break;
            case "char":
                if (isStartOfTag(char)) {
                    if (currentWord) {
                        words.push(createToken(currentWord));
                    }
                    currentWord = "<";
                    mode = "tag";
                } else if (/\s/.test(char)) {
                    if (currentWord) {
                        words.push(createToken(currentWord));
                    }
                    currentWord = char;
                    mode = "whitespace";
                } else if (/[\w\d#@]/.test(char)) {
                    currentWord += char;
                } else if (/&/.test(char)) {
                    if (currentWord) {
                        words.push(createToken(currentWord));
                    }
                    currentWord = char;
                } else {
                    currentWord += char;
                    words.push(createToken(currentWord));
                    currentWord = "";
                }
                break;
            case "whitespace":
                if (isStartOfTag(char)) {
                    if (currentWord) {
                        words.push(createToken(currentWord));
                    }
                    currentWord = "<";
                    mode = "tag";
                } else if (isWhitespace(char)) {
                    currentWord += char;
                } else {
                    if (currentWord) {
                        words.push(createToken(currentWord));
                    }
                    currentWord = char;
                    mode = "char";
                }
                break;
        }
    }
    if (currentWord) {
        words.push(createToken(currentWord));
    }
    return words;
}
