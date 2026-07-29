/**
 * htmldiff.js is a library that compares HTML content. It creates a diff between two
 * HTML documents by combining the two documents and wrapping the differences with
 * <ins> and <del> tags. Here is a high-level overview of how the diff works.
 *
 * 1. Tokenize the before and after HTML with htmlToTokens.
 * 2. Generate a list of operations that convert the before list of tokens to the after
 *    list of tokens with calculateOperations, which does the following:
 *      a. Find all the matching blocks of tokens between the before and after lists of
 *         tokens with findMatchingBlocks. This is done by finding the single longest
 *         matching block with findMatch, then iteratively finding the next longest
 *         matching blocks that precede and follow the longest matching block.
 *      b. Determine insertions, deletions, and replacements from the matching blocks.
 *         This is done in calculateOperations.
 * 3. Render the list of operations by wrapping tokens with <ins> and <del> tags where
 *    appropriate with renderOperations.
 *
 * Example usage:
 *
 *   var htmldiff = require('htmldiff.js');
 *
 *   htmldiff('<p>this is some text</p>', '<p>this is some more text</p>')
 *   == '<p>this is some <ins>more </ins>text</p>'
 *
 *   htmldiff('<p>this is some text</p>', '<p>this is some more text</p>', 'diff-class')
 *   == '<p>this is some <ins class="diff-class">more </ins>text</p>'
 */
(function(){
    'use strict';

    function isEndOfTag(char){
        return char === '>';
    }

    function isStartOfTag(char){
        return char === '<';
    }

    function isWhitespace(char){
        return /^\s+$/.test(char);
    }

    /**
     * Determines if the given token is a tag.
     *
     * @param {string} token The token in question.
     *
     * @return {boolean|string} False if the token is not a tag, or the tag name otherwise.
     */
    function isTag(token){
        var match = token.match(/^\s*<([^!>][^>]*)>\s*$/);
        return !!match && match[1].trim().split(' ')[0];
    }

    function isntTag(token){
        return !isTag(token);
    }

    function isStartofHTMLComment(word){
        return /^<!--/.test(word);
    }

    function isEndOfHTMLComment(word){
        return /--\>$/.test(word);
    }

    /**
     * Regular expression to check atomic tags.
     * @see function diff.
     */
    // Added head and style (for style tags inside the body)
    // The tag name must be followed by a delimiter (not a \b word boundary): the tokenizer
    // matches against partially read tags, and a word boundary would match at the end of an
    // incomplete name, e.g. detecting '<abbr>' as the atomic tag 'a' while reading '<a'.
    var defaultAtomicTagsRegExp = new RegExp('^<(iframe|object|math|svg|script|video|head|style|a)[\\s/>]');
    var atomicTagsRegExp = defaultAtomicTagsRegExp;
    
    /**
     * Matches an element whose own opening tag carries data-htmldiff-id; captures tag name and
     * attribute value. The skip before the attribute is quote aware, so it cannot run past '>'
     * into a nested child. The leading \s prevents matching 'x-data-htmldiff-id'.
     * @see isStartOfAtomicTag and createToken.
     */
    const dataHtmlDiffIdRegExp =
        /^<([a-z\-]+)(?:[^>"']|"[^"]*"|'[^']*')*\sdata-htmldiff-id=["']?((?:.(?!["']?\s+(?:\S+)=|\s*\/?[>"']))*.)["']?/;

    /**
     * Opt-in marker for the recursive inner diff. When two matched atomic tokens (typically
     * matched by data-htmldiff-id) have equal keys but different content, an element carrying
     * this attribute gets its inner HTML diffed recursively instead of being rendered as is.
     * The attribute must appear in the element's opening tag. Captures the attribute value;
     * a bare attribute or any value other than "false" enables the opt-in.
     * @see OPS.equal and renderInnerDiff.
     */
    const dataHtmlDiffInnerDiffRegExp =
        /^<[^>]*\sdata-htmldiff-inner-diff(?:\s*=\s*["']?([^"'\s/>]*)|(?=[\s/>]))/;

    /**
     * Per-element override for the atomic tags used inside a recursive inner diff. The value
     * is a comma separated tag name list, like the atomicTags parameter of the diff function;
     * an empty value means no tag name is atomic. Without the attribute the default list
     * without 'a' is used, so anchors have their text content diffed word by word while
     * embedded content like svg stays atomic. The attribute is only consulted on elements
     * that opted in via data-htmldiff-inner-diff.
     */
    const dataHtmlDiffInnerDiffAtomicTagsRegExp =
        /^<[^>]*\sdata-htmldiff-inner-diff-atomic-tags\s*=\s*["']([^"']*)["']/;

    // Atomic tags used inside a recursive inner diff unless the element overrides them via
    // data-htmldiff-inner-diff-atomic-tags: the default list without 'a'.
    var defaultInnerDiffAtomicTagsRegExp =
        new RegExp('^<(iframe|object|math|svg|script|video|head|style)[\\s/>]');

    // Matches no tag at all: used when data-htmldiff-inner-diff-atomic-tags is empty.
    const noAtomicTagsRegExp = /^<(?!)/;

    // The number of currently active recursive inner diffs. Recursion is governed per
    // element (each nesting level requires its own data-htmldiff-inner-diff attribute), so
    // the depth is naturally bounded by the nesting of opted-in elements; the cap is only a
    // backstop against pathologically deep documents.
    var innerDiffDepth = 0;
    const maxInnerDiffDepth = 10;

    /**
     * Builds the atomic tags regular expression from a comma separated tag name list.
     *
     * @param {string} atomicTags Comma separated list of tag names, e.g. 'head,script,style'.
     *
     * @return {RegExp} The regular expression matching the start of those tags.
     */
    function buildAtomicTagsRegExp(atomicTags){
        // Require a delimiter after the name (see defaultAtomicTagsRegExp on why not \b).
        return new RegExp('^<(' + atomicTags.replace(/\s*/g, '').replace(/,/g, '|') + ')[\\s/>]');
    }
    
    /**
     * Checks if the current word is the beginning of an atomic tag. An atomic tag is one whose
     * child nodes should not be compared - the entire tag should be treated as one token. This
     * is useful for tags where it does not make sense to insert <ins> and <del> tags.
     *
     * @param {string} word The characters of the current token read so far.
     *
     * @return {string|null} The name of the atomic tag if the word will be an atomic tag,
     *    null otherwise
     */
    function isStartOfAtomicTag(word){
        var result = atomicTagsRegExp.exec(word) || dataHtmlDiffIdRegExp.exec(word);
        return result && result[1];
    }

    /**
     * Inspects the last tag in the given string its slice from the final '<'. A '>' before the slice's end
     * means text follows e.g. "a > b" in a <script>, not a clean tag, so returns false.
     * @return {boolean} True if word ends with an opening (non-self-closing) tag for the given
     *    tag name.
     */
    function isOpeningTagOf(word, tag){
        var tagText = word.substring(word.lastIndexOf('<'));
        if (tagText.indexOf('>') !== tagText.length - 1) {
            return false;
        }
        return new RegExp('^<' + tag + '(\\s|>)').test(tagText) && !/\/>$/.test(tagText);
    }

    /**
     * Inspects the last tag in the given string its slice from the final '<'. A '>' before the slice's end
     * means text follows e.g. "a > b" in a <script>, not a clean tag, so returns false.
     * @return {boolean} True if word ends with a closing tag for the given tag name.
     */
    function isClosingTagOf(word, tag){
        var tagText = word.substring(word.lastIndexOf('<'));
        if (tagText.indexOf('>') !== tagText.length - 1) {
            return false;
        }
        return new RegExp('^</' + tag + '(\\s|>)').test(tagText);
    }

    /**
     * Checks if a tag is a void tag.
     *
     * @param {string} token The token to check.
     *
     * @return {boolean} True if the token is a void tag, false otherwise.
     */
    function isVoidTag(token){
        return /^\s*<[^>]+\/>\s*$/.test(token);
    }

    /**
     * Checks if a tag name is an HTML void element. Void elements cannot have content and can skip a
     * closing tag, so an atomic element with a void tag name ends with its opening tag -
     * with or without the XML style '/>'.
     *
     * @param {string} tag The tag name to check.
     *
     * @return {boolean} True if the tag name is a void element.
     */
    function isVoidTagName(tag){
        return /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/
            .test(tag);
    }

    /**
     * Checks if a token can be wrapped inside a tag.
     *
     * @param {string} token The token to check.
     *
     * @return {boolean} True if the token can be wrapped inside a tag, false otherwise.
     */
    function isWrappable(token){
        var is_img = /^<img[\s>]/.test(token);
        return is_img|| isntTag(token) || isStartOfAtomicTag(token) || isVoidTag(token);
    }

    /**
     * Creates a token that holds a string and key representation. The key is used for diffing
     * comparisons and the string is used to recompose the document after the diff is complete.
     *
     * @param {string} currentWord The section of the document to create a token for.
     *
     * @return {Object} A token object with a string and key property.
     */
    function createToken(currentWord){
        return {
            string: currentWord,
            key: getKeyForToken(currentWord)
        };
    }

    /**
     * A Match stores the information of a matching block. A matching block is a list of
     * consecutive tokens that appear in both the before and after lists of tokens.
     *
     * @param {number} startInBefore The index of the first token in the list of before tokens.
     * @param {number} startInAfter The index of the first token in the list of after tokens.
     * @param {number} length The number of consecutive matching tokens in this block.
     * @param {Segment} segment The segment where the match was found.
     */
    function Match(startInBefore, startInAfter, length, segment){
        this.segment = segment;
        this.length = length;

        this.startInBefore = startInBefore + segment.beforeIndex;
        this.startInAfter = startInAfter + segment.afterIndex;
        this.endInBefore = this.startInBefore + this.length - 1;
        this.endInAfter = this.startInAfter + this.length - 1;

        this.segmentStartInBefore = startInBefore;
        this.segmentStartInAfter = startInAfter;
        this.segmentEndInBefore = (this.segmentStartInBefore + this.length) - 1;
        this.segmentEndInAfter = (this.segmentStartInAfter + this.length) - 1;
    }

    /**
     * Tokenizes a string of HTML.
     *
     * @param {string} html The string to tokenize.
     *
     * @return {Array.<string>} The list of tokens.
     */
    function htmlToTokens(html){
        var mode = 'char';
        var currentWord = '';
        var currentAtomicTag = '';
        var currentAtomicTagDepth = 0;
        // The quote character of the attribute value currently being read, or null. Quoted
        // attribute values may contain any character including '>', so no tag boundary or
        // atomic tag detection applies inside them.
        var currentQuote = null;
        // True while reading the atomic tag's own opening tag. Quote tracking in atomic
        // mode is limited to that region: quotes in the element's content (text
        // apostrophes, comments, nested tags) must not affect how the token ends.
        var inAtomicOpeningTag = false;
        var words = [];

        /**
         * Consumes a character belonging to a quoted attribute value, updating the quote
         * state. Quoted values may contain any character including '>', so as long as a
         * quote is open no tag boundary or atomic tag detection applies.
         *
         * @param {string} char The current character.
         * @param {boolean} canOpenQuote Whether a quote may start at this position.
         *
         * @return {boolean} True if the character was consumed and no other handling
         *    applies to it.
         */
        function consumeAttributeQuote(char, canOpenQuote){
            if (currentQuote){
                if (char === currentQuote){
                    currentQuote = null;
                }
                return true;
            }
            if (canOpenQuote && (char === '"' || char === "'")){
                currentQuote = char;
                return true;
            }
            return false;
        }

        for (var i = 0; i < html.length; i++){
            var char = html[i];
            switch (mode){
                case 'tag':
                    // Quote handling must come before the atomic tag detection:
                    // dataHtmlDiffIdRegExp can match right at the opening quote of the
                    // attribute value, which would enter atomic mode with the quote
                    // tracking out of sync.
                    if (consumeAttributeQuote(char, true)){
                        currentWord += char;
                        break;
                    }
                    // The atomic tag regexps require a delimiter after the tag name, so the
                    // current character must be included in the check: without it a tag
                    // ending right at the name (e.g. '<script' + '>') would never match.
                    var atomicTag = isStartOfAtomicTag(currentWord + char);
                    if (atomicTag && isEndOfTag(char) &&
                            (isVoidTagName(atomicTag) || /\/$/.test(currentWord))){
                        // The atomic tag itself is void or self-closing: it has no content
                        // that could be swallowed, emit it as a complete token.
                        currentWord += '>';
                        words.push(createToken(currentWord));
                        currentWord = '';
                        mode = 'char';
                    } else if (atomicTag){
                        mode = 'atomic_tag';
                        currentAtomicTag = atomicTag;
                        // we are still inside the atomic tag's own opening tag unless this
                        // character just ended it
                        inAtomicOpeningTag = !isEndOfTag(char);
                        // skip standalone tags like <script> and <style>
                        currentAtomicTagDepth = isEndOfTag(char) ? 1 : 0;
                        currentWord += char;
                    } else if (isStartofHTMLComment(currentWord)){
                        mode = 'html_comment';
                        currentWord += char;
                    } else if (isEndOfTag(char)){
                        currentWord += '>';
                        words.push(createToken(currentWord));
                        currentWord = '';
                        if (isWhitespace(char)){
                            mode = 'whitespace';
                        } else {
                            mode = 'char';
                        }
                    } else {
                        currentWord += char;
                    }
                    break;
                case 'atomic_tag':
                    currentWord += char;
                    // Quotes may only open inside the atomic tag's own opening tag, where
                    // attribute values may contain '>' or '/>' and must not affect the
                    // depth tracking below. Quote characters in the element's content
                    // (text apostrophes, comments) are not attribute quotes.
                    if (consumeAttributeQuote(char, inAtomicOpeningTag)){
                        break;
                    }
                    // track the same name nested tags depth;
                    // end the atomic token only when it returns to 0.
                    if (isEndOfTag(char)){
                        inAtomicOpeningTag = false;
                        if (isClosingTagOf(currentWord, currentAtomicTag)){
                            currentAtomicTagDepth--;
                            if (currentAtomicTagDepth <= 0){
                                words.push(createToken(currentWord));
                                currentWord = '';
                                currentAtomicTag = '';
                                currentAtomicTagDepth = 0;
                                mode = 'char';
                            }
                        } else if (currentAtomicTagDepth === 0 &&
                                (isVoidTagName(currentAtomicTag) || /\/>$/.test(currentWord))){
                            // At depth 0 this '>' can only end the atomic tag's own opening
                            // tag. When the element is void or self-closing it has no
                            // content: end the token so trailing content tokenizes normally.
                            words.push(createToken(currentWord));
                            currentWord = '';
                            currentAtomicTag = '';
                            mode = 'char';
                        } else if (isOpeningTagOf(currentWord, currentAtomicTag)){
                            currentAtomicTagDepth++;
                        }
                    }
                    break;
                case 'html_comment':
                    currentWord += char;
                    if (isEndOfHTMLComment(currentWord)){
                        currentWord = '';
                        mode = 'char';
                    }
                    break;
                case 'char':
                    if (isStartOfTag(char)){
                        if (currentWord){
                            words.push(createToken(currentWord));
                        }
                        currentWord = '<';
                        mode = 'tag';
                    } else if (/\s/.test(char)){
                        if (currentWord){
                            words.push(createToken(currentWord));
                        }
                        currentWord = char;
                        mode = 'whitespace';
                    } else if (/[\w\d\#@]/.test(char)){
                        currentWord += char;
                    } else if (/&/.test(char)){
                        if (currentWord){
                            words.push(createToken(currentWord));
                        }
                        currentWord = char;
                    } else {
                        currentWord += char;
                        words.push(createToken(currentWord));
                        currentWord = '';
                    }
                    break;
                case 'whitespace':
                    if (isStartOfTag(char)){
                        if (currentWord){
                            words.push(createToken(currentWord));
                        }
                        currentWord = '<';
                        mode = 'tag';
                    } else if (isWhitespace(char)){
                        currentWord += char;
                    } else {
                        if (currentWord){
                            words.push(createToken(currentWord));
                        }
                        currentWord = char;
                        mode = 'char';
                    }
                    break;
                default:
                    throw new Error('Unknown mode ' + mode);
            }
        }
        if (currentWord){
            words.push(createToken(currentWord));
        }
        return words;
    }

    /**
     * Creates a key that should be used to match tokens. This is useful, for example, if we want
     * to consider two open tag tokens as equal, even if they don't have the same attributes. We
     * use a key instead of overwriting the token because we may want to render the original string
     * without losing the attributes.
     *
     * @param {string} token The token to create the key for.
     *
     * @return {string} The identifying key that should be used to match before and after tokens.
     */
    function getKeyForToken(token){
        // If the token is an image element, grab it's src attribute to include in the key.
        var img = /^<img.*src=['"]([^"']*)['"].*>$/.exec(token);
        if (img) {
            return '<img src="' + img[1] + '">';
        }
        
        // If the token is an a element, grab it's data attribute to include in the key.
        // Only when <a> is atomic: if it has been excluded from the atomic tags (as done in
        // recursive inner diffs), the token is just the opening tag.
        var a = /^<a.*href=['"]([^"']*)['"]/.exec(token);
        if (a && atomicTagsRegExp.test('<a ')) {
            return '<a href="' + a[1] + '"></a>';
        }

        // If the token is an object element, grab it's data attribute to include in the key.
        var object = /^<object.*data=['"]([^"']*)['"]/.exec(token);
        if (object) {
            return '<object src="' + object[1] + '"></object>';
        }

        // If it's a video, math or svg element, the entire token should be compared except the
        // data-uuid.
        if(/^<(svg|math|video)[\s>]/.test(token)) {
            var uuid = token.indexOf('data-uuid="');
            if (uuid !== -1) {
                var start = token.slice(0, uuid);
                var end = token.slice(uuid + 44);
                return start + end;
            } else {
                return token;
            } 
        }

        // If the token is an iframe element, grab it's src attribute to include in it's key.
        var iframe = /^<iframe.*src=['"]([^"']*)['"].*>/.exec(token);
        if (iframe) {
            return '<iframe src="' + iframe[1] + '"></iframe>';
        }

        // if the token has data-htmldiff-uuid use it as a key
        const uuidTag = dataHtmlDiffIdRegExp.exec(token);
        if (uuidTag) {
            return uuidTag[2];
        }

        // If the token is any other element, just grab the tag name.
        var tagName = /<([^\s>]+)[\s>]/.exec(token);
        if (tagName){
            return '<' + (tagName[1].toLowerCase()) + '>';
        }

        // Otherwise, the token is text, collapse the whitespace
        // (except new lines, see https://matrixreq.atlassian.net/browse/MATRIX-7880)
        // potentially, this also causing the problems with prettified HTML (with "\n" between the tags),
        // so it's required to "flatten" html before passing it to the diffing function
        if (token) {
            return token.replace(/([^\S\r\n]+|&nbsp;|&#160;)/g, ' ');
        }
        return token;
    }

    /**
     * Creates a map from token key to an array of indices of locations of the matching token in
     * the list of all tokens.
     *
     * @param {Array.<string>} tokens The list of tokens to be mapped.
     *
     * @return {Object} A mapping that can be used to search for tokens.
     */
    function createMap(tokens){
        return tokens.reduce(function(map, token, index){
            if (map[token.key]){
                map[token.key].push(index);
            } else {
                map[token.key] = [index];
            }
            return map;
        }, Object.create(null));
    }

    /**
     * Compares two match objects to determine if the second match object comes before or after the
     * first match object. Returns -1 if the m2 should come before m1. Returns 1 if m1 should come
     * before m2. If the two matches criss-cross each other, a null is returned.
     *
     * @param {Match} m1 The first match object to compare.
     * @param {Match} m2 The second match object to compare.
     *
     * @return {number} Returns -1 if the m2 should come before m1. Returns 1 if m1 should come
     *    before m2. If the two matches criss-cross each other, 0 is returned.
     */
    function compareMatches(m1, m2){
        if (m2.endInBefore < m1.startInBefore && m2.endInAfter < m1.startInAfter){
            return -1;
        } else if (m2.startInBefore > m1.endInBefore && m2.startInAfter > m1.endInAfter){
            return 1;
        } else {
            return 0;
        }
    }

    /**
     * A constructor for a binary search tree used to keep match objects in the proper order as
     * they're found.
     *
     * @constructor
     */
    function MatchBinarySearchTree(){
        this._root = null;
    }

    MatchBinarySearchTree.prototype = {
        /**
         * Adds matches to the binary search tree.
         *
         * @param {Match} value The match to add to the binary search tree.
         */
        add: function (value){
            // Create the node to hold the match value.
            var node = {
                value: value,
                left: null,
                right: null
            };

            var current = this._root;
            if(current){
                while (true){
                    // Determine if the match value should go to the left or right of the current
                    // node.
                    var position = compareMatches(current.value, value);
                    if (position === -1){
                        // The position of the match is to the left of this node.
                        if (current.left){
                            current = current.left;
                        } else {
                            current.left = node;
                            break;
                        }
                    } else if (position === 1){
                        // The position of the match is to the right of this node.
                        if (current.right){
                            current = current.right;
                        } else {
                            current.right = node;
                            break;
                        }
                    } else {
                        // If 0 was returned from compareMatches, that means the node cannot
                        // be inserted because it overlaps an existing node.
                        break;
                    }
                }
            } else {
                // If no nodes exist in the tree, make this the root node.
                this._root = node;
            }
        },

        /**
         * Converts the binary search tree into an array using an in-order traversal.
         *
         * @return {Array.<Match>} An array containing the matches in the binary search tree.
         */
        toArray: function(){
            function inOrder(node, nodes){
                if (node){
                    inOrder(node.left, nodes);
                    nodes.push(node.value);
                    inOrder(node.right, nodes);
                }
                return nodes;
            }

            return inOrder(this._root, []);
        }
    };


    /**
     * Finds and returns the best match between the before and after arrays contained in the segment
     * provided.
     *
     * @param {Segment} segment The segment in which to look for a match.
     *
     * @return {Match} The best match.
     */
    function findBestMatch(segment){
        var beforeTokens = segment.beforeTokens;
        var afterMap = segment.afterMap;
        var lastSpace = null;
        var bestMatch = null;

        // Iterate through the entirety of the beforeTokens to find the best match.
        for (var beforeIndex = 0; beforeIndex < beforeTokens.length; beforeIndex++){
            var lookBehind = false;

            // If the current best match is longer than the remaining tokens, we can bail because we
            // won't find a better match.
            var remainingTokens = beforeTokens.length - beforeIndex;
            if (bestMatch && remainingTokens < bestMatch.length){
                break;
            }

            // If the current token is whitespace, make a note of it and move on. Trying to start a
            // set of matches with whitespace is not efficient because it's too prevelant in most
            // documents. Instead, if the next token yields a match, we'll see if the whitespace can
            // be included in that match.
            var beforeToken = beforeTokens[beforeIndex];
            if (beforeToken.key === ' '){
                lastSpace = beforeIndex;
                continue;
            }

            // Check to see if we just skipped a space, if so, we'll ask getFullMatch to look behind
            // by one token to see if it can include the whitespace.
            if (lastSpace === beforeIndex - 1){
                lookBehind = true;
            }

            // If the current token is not found in the afterTokens, it won't match and we can move
            // on.
            var afterTokenLocations = afterMap[beforeToken.key];
            if(!afterTokenLocations){
                continue;
            }

            // For each instance of the current token in afterTokens, let's see how big of a match
            // we can build.
            afterTokenLocations.forEach(function(afterIndex){
                // getFullMatch will see how far the current token match will go in both
                // beforeTokens and afterTokens.
                var bestMatchLength = bestMatch ? bestMatch.length : 0;
                var match = getFullMatch(
                        segment, beforeIndex, afterIndex, bestMatchLength, lookBehind);

                // If we got a new best match, we'll save it aside.
                if (match && match.length > bestMatchLength){
                    bestMatch = match;
                }
            });
        }

        return bestMatch;
    }

    /**
     * Takes the start of a match, and expands it in the beforeTokens and afterTokens of the
     * current segment as far as it can go.
     *
     * @param {Segment} segment The segment object to search within when expanding the match.
     * @param {number} beforeStart The offset within beforeTokens to start looking.
     * @param {number} afterStart The offset within afterTokens to start looking.
     * @param {number} minLength The minimum length match that must be found.
     * @param {boolean} lookBehind If true, attempt to match a whitespace token just before the
     *    beforeStart and afterStart tokens.
     *
     * @return {Match} The full match.
     */
    function getFullMatch(segment, beforeStart, afterStart, minLength, lookBehind){
        var beforeTokens = segment.beforeTokens;
        var afterTokens = segment.afterTokens;

        // If we already have a match that goes to the end of the document, no need to keep looking.
        var minBeforeIndex = beforeStart + minLength;
        var minAfterIndex = afterStart + minLength;
        if(minBeforeIndex >= beforeTokens.length || minAfterIndex >= afterTokens.length){
            return;
        }

        // If a minLength was provided, we can do a quick check to see if the tokens after that
        // length match. If not, we won't be beating the previous best match, and we can bail out
        // early.
        if (minLength){
            var nextBeforeWord = beforeTokens[minBeforeIndex].key;
            var nextAfterWord = afterTokens[minAfterIndex].key;
            if (nextBeforeWord !== nextAfterWord){
                return;
            }
        }

        // Extend the current match as far foward as it can go, without overflowing beforeTokens or
        // afterTokens.
        var searching = true;
        var currentLength = 1;
        var beforeIndex = beforeStart + currentLength;
        var afterIndex = afterStart + currentLength;

        while (searching && beforeIndex < beforeTokens.length && afterIndex < afterTokens.length){
            var beforeWord = beforeTokens[beforeIndex].key;
            var afterWord = afterTokens[afterIndex].key;
            if (beforeWord === afterWord){
                currentLength++;
                beforeIndex = beforeStart + currentLength;
                afterIndex = afterStart + currentLength;
            } else {
                searching = false;
            }
        }

        // If we've been asked to look behind, it's because both beforeTokens and afterTokens may
        // have a whitespace token just behind the current match that was previously ignored. If so,
        // we'll expand the current match to include it.
        if (lookBehind && beforeStart > 0 && afterStart > 0){
            var prevBeforeKey = beforeTokens[beforeStart - 1].key;
            var prevAfterKey = afterTokens[afterStart - 1].key;
            if (prevBeforeKey === ' ' && prevAfterKey === ' '){
                beforeStart--;
                afterStart--;
                currentLength++;
            }
        }

        return new Match(beforeStart, afterStart, currentLength, segment);
    }

    /**
     * Creates segment objects from the original document that can be used to restrict the area that
     * findBestMatch and it's helper functions search to increase performance.
     *
     * @param {Array.<Token>} beforeTokens Tokens from the before document.
     * @param {Array.<Token>} afterTokens Tokens from the after document.
     * @param {number} beforeIndex The index within the before document where this segment begins.
     * @param {number} afterIndex The index within the after document where this segment behinds.
     *
     * @return {Segment} The segment object.
     */
    function createSegment(beforeTokens, afterTokens, beforeIndex, afterIndex){
        return {
            beforeTokens: beforeTokens,
            afterTokens: afterTokens,
            beforeMap: createMap(beforeTokens),
            afterMap: createMap(afterTokens),
            beforeIndex: beforeIndex,
            afterIndex: afterIndex
        };
    }

    /**
     * Finds all the matching blocks within the given segment in the before and after lists of
     * tokens.
     *
     * @param {Segment} The segment that should be searched for matching blocks.
     *
     * @return {Array.<Match>} The list of matching blocks in this range.
     */
    function findMatchingBlocks(segment){
        // Create a binary search tree to hold the matches we find in order.
        var matches = new MatchBinarySearchTree();
        var match;
        var segments = [segment];

        // Each time the best match is found in a segment, zero, one or two new segments may be
        // created from the parts of the original segment not included in the match. We will
        // continue to iterate until all segments have been processed.
        while(segments.length){
            segment = segments.pop();
            match = findBestMatch(segment);

            if (match && match.length){
                // If there's an unmatched area at the start of the segment, create a new segment
                // from that area and throw it into the segments array to get processed.
                if (match.segmentStartInBefore > 0 && match.segmentStartInAfter > 0){
                    var leftBeforeTokens = segment.beforeTokens.slice(
                            0, match.segmentStartInBefore);
                    var leftAfterTokens = segment.afterTokens.slice(0, match.segmentStartInAfter);

                    segments.push(createSegment(leftBeforeTokens, leftAfterTokens,
                            segment.beforeIndex, segment.afterIndex));
                }

                // If there's an unmatched area at the end of the segment, create a new segment from that
                // area and throw it into the segments array to get processed.
                var rightBeforeTokens = segment.beforeTokens.slice(match.segmentEndInBefore + 1);
                var rightAfterTokens = segment.afterTokens.slice(match.segmentEndInAfter + 1);
                var rightBeforeIndex = segment.beforeIndex + match.segmentEndInBefore + 1;
                var rightAfterIndex = segment.afterIndex + match.segmentEndInAfter + 1;

                if (rightBeforeTokens.length && rightAfterTokens.length){
                    segments.push(createSegment(rightBeforeTokens, rightAfterTokens,
                            rightBeforeIndex, rightAfterIndex));
                }

                matches.add(match);
            }
        }

        return matches.toArray();
    }

    /**
     * Gets a list of operations required to transform the before list of tokens into the
     * after list of tokens. An operation describes whether a particular list of consecutive
     * tokens are equal, replaced, inserted, or deleted.
     *
     * @param {Array.<string>} beforeTokens The before list of tokens.
     * @param {Array.<string>} afterTokens The after list of tokens.
     *
     * @return {Array.<Object>} The list of operations to transform the before list of
     *      tokens into the after list of tokens, where each operation has the following
     *      keys:
     *      - {string} action One of {'replace', 'insert', 'delete', 'equal'}.
     *      - {number} startInBefore The beginning of the range in the list of before tokens.
     *      - {number} endInBefore The end of the range in the list of before tokens.
     *      - {number} startInAfter The beginning of the range in the list of after tokens.
     *      - {number} endInAfter The end of the range in the list of after tokens.
     */
    function calculateOperations(beforeTokens, afterTokens){
        if (!beforeTokens) throw new Error('Missing beforeTokens');
        if (!afterTokens) throw new Error('Missing afterTokens');

        var positionInBefore = 0;
        var positionInAfter = 0;
        var operations = [];
        var segment = createSegment(beforeTokens, afterTokens, 0, 0);
        var matches = findMatchingBlocks(segment);
        matches.push(new Match(beforeTokens.length, afterTokens.length, 0, segment));

        for (var index = 0; index < matches.length; index++){
            var match = matches[index];
            var actionUpToMatchPositions = 'none';
            if (positionInBefore === match.startInBefore){
                if (positionInAfter !== match.startInAfter){
                    actionUpToMatchPositions = 'insert';
                }
            } else {
                actionUpToMatchPositions = 'delete';
                if (positionInAfter !== match.startInAfter){
                    actionUpToMatchPositions = 'replace';
                }
            }
            if (actionUpToMatchPositions !== 'none'){
                operations.push({
                    action: actionUpToMatchPositions,
                    startInBefore: positionInBefore,
                    endInBefore: (actionUpToMatchPositions !== 'insert' ?
                            match.startInBefore - 1 : null),
                    startInAfter: positionInAfter,
                    endInAfter: (actionUpToMatchPositions !== 'delete' ?
                            match.startInAfter - 1 : null)
                });
            }
            if (match.length !== 0){
                operations.push({
                    action: 'equal',
                    startInBefore: match.startInBefore,
                    endInBefore: match.endInBefore,
                    startInAfter: match.startInAfter,
                    endInAfter: match.endInAfter
                });
            }
            positionInBefore = match.endInBefore + 1;
            positionInAfter = match.endInAfter + 1;
        }

        var postProcessed = [];
        var lastOp = {action: 'none'};

        function isSingleWhitespace(op){
            if (op.action !== 'equal'){
                return false;
            }
            if (op.endInBefore - op.startInBefore !== 0){
                return false;
            }
            return /^\s$/.test(beforeTokens.slice(op.startInBefore, op.endInBefore + 1));
        }

        for (var i = 0; i < operations.length; i++){
            var op = operations[i];

            if ((isSingleWhitespace(op) && lastOp.action === 'replace') ||
                    (op.action === 'replace' && lastOp.action === 'replace')){
                lastOp.endInBefore = op.endInBefore;
                lastOp.endInAfter = op.endInAfter;
            } else {
                postProcessed.push(op);
                lastOp = op;
            }
        }
        return postProcessed;
    }

    /**
     * A TokenWrapper provides a utility for grouping segments of tokens based on whether they're
     * wrappable or not. A tag is considered wrappable if it is closed within the given set of
     * tokens. For example, given the following tokens:
     *
     *      ['</b>', 'this', ' ', 'is', ' ', 'a', ' ', '<b>', 'test', '</b>', '!']
     *
     * The first '</b>' is not considered wrappable since the tag is not fully contained within the
     * array of tokens. The '<b>', 'test', and '</b>' would be a part of the same wrappable segment
     * since the entire bold tag is within the set of tokens.
     *
     * TokenWrapper has a method 'combine' which allows walking over the segments to wrap them in
     * tags.
     */
    function TokenWrapper(tokens){
        this.tokens = tokens;
        this.notes = tokens.reduce(function(data, token, index){
            data.notes.push({
                isWrappable: isWrappable(token),
                insertedTag: false
            });

            var tag = !isVoidTag(token) && isTag(token);
            var lastEntry = data.tagStack[data.tagStack.length - 1];
            if (tag){
                if (lastEntry && '/' + lastEntry.tag === tag){
                    data.notes[lastEntry.position].insertedTag = true;
                    data.tagStack.pop();
                } else {
                    data.tagStack.push({
                        tag: tag,
                        position: index
                    });
                }
            }
            return data;
        }, {notes: [], tagStack: []}).notes;
    }

    /**
     * Wraps the contained tokens in tags based on output given by a map function. Each segment of
     * tokens will be visited. A segment is a continuous run of either all wrappable
     * tokens or unwrappable tokens. The given map function will be called with each segment of
     * tokens and the resulting strings will be combined to form the wrapped HTML.
     *
     * @param {function(boolean, Array.<string>)} mapFn A function called with an array of tokens
     *      and whether those tokens are wrappable or not. The result should be a string.
     */
    TokenWrapper.prototype.combine = function(mapFn, tagFn){
        var notes = this.notes;
        var tokens = this.tokens.slice();
        var segments = tokens.reduce(function(data, token, index){
            if (notes[index].insertedTag){
                tokens[index] = tagFn(tokens[index]);
            }
            if (data.status === null){
                data.status = notes[index].isWrappable;
            }
            var status = notes[index].isWrappable;

            // Handling atomic tags wrapping independently
            // each atomic tag is wrapped with their own ins/del tags
            var isAtomic = isStartOfAtomicTag(token);
            if (status !== data.status || (isAtomic && index > data.lastIndex) || data.lastWasAtomic){
                data.list.push({
                    isWrappable: data.status,
                    tokens: tokens.slice(data.lastIndex, index)
                });
                data.lastIndex = index;
                data.status = status;
            }
            // tracking if the last token was an atomic tag
            // if so then we break the segment and wrap them
            data.lastWasAtomic = isAtomic;
            if (index === tokens.length - 1){
                data.list.push({
                    isWrappable: data.status,
                    tokens: tokens.slice(data.lastIndex, index + 1)
                });
            }
            return data;
        }, {list: [], status: null, lastIndex: 0, lastWasAtomic: false}).list;

        return segments.map(mapFn).join('');
    };

    /**
     * Wraps and concatenates a list of tokens with a tag. Does not wrap tag tokens,
     * unless they are wrappable (i.e. void and atomic tags).
     *
     * @param {sting} tag The tag name of the wrapper tags.
     * @param {Array.<string>} content The list of tokens to wrap.
     * @param {string} dataPrefix (Optional) The prefix to use in data attributes.
     * @param {string} className (Optional) The class name to include in the wrapper tag.
     */
    function wrap(tag, content, opIndex, dataPrefix, className){
        var wrapper = new TokenWrapper(content);
        dataPrefix = dataPrefix ? dataPrefix + '-' : '';
        var attrs = ' data-' + dataPrefix + 'operation-index="' + opIndex + '"';
        if (className){
            attrs += ' class="' + className + '"';
        }

        return wrapper.combine(function(segment){
            if (segment.isWrappable){
                var val = segment.tokens.join('');
                if (val.trim()){
                    return '<' + tag + attrs + '>' + val + '</' + tag + '>';
                }
            } else {
                return segment.tokens.join('');
            }
            return '';
        }, function(openingTag){
            var dataAttrs = ' data-diff-node="' + tag + '"';
            dataAttrs += ' data-' + dataPrefix + 'operation-index="' + opIndex + '"';

            return openingTag.replace(/>\s*$/, dataAttrs + '$&');
        });
    }

    /**
     * Checks whether a token is an atomic tag that opted into the recursive inner diff via
     * the data-htmldiff-inner-diff attribute. A bare attribute or any value other than
     * "false" counts as opted in. Opted-in elements nested inside other opted-in elements
     * are diffed recursively as well, up to the depth cap; beyond it, opted-in tokens are
     * rendered verbatim like any other atomic token.
     *
     * @param {string} tokenString The token string to check.
     *
     * @return {boolean} True if the token should get a recursive inner diff.
     */
    function isInnerDiffToken(tokenString){
        if (innerDiffDepth >= maxInnerDiffDepth || !isStartOfAtomicTag(tokenString)){
            return false;
        }
        var attr = dataHtmlDiffInnerDiffRegExp.exec(tokenString);
        return !!attr && attr[1] !== 'false';
    }

    /**
     * Finds the index of the '>' that ends the opening tag at the start of the given token
     * string, skipping any '>' inside quoted attribute values (e.g. title="a > b").
     *
     * @param {string} tokenString The token string starting with an opening tag.
     *
     * @return {number} The index of the closing '>' of the opening tag, or -1 if there is
     *    none (e.g. an unterminated tag or an unbalanced attribute quote).
     */
    function findOpeningTagEnd(tokenString){
        var quote = null;
        for (var i = 0; i < tokenString.length; i++){
            var char = tokenString[i];
            // quote is closed
            if (char === quote){
                quote = null;
                continue;
            }
            // inside quote
            if (quote){
                continue;
            }
            // quote start
            if (char === '"' || char === "'"){
                quote = char;
                continue;
            }
            // not inside quote, check for tag end
            if (char === '>'){
                return i;
            }
        }
        return -1;
    }

    /**
     * Splits an atomic token string into its opening tag, inner HTML and closing tag.
     * A token consisting of a single tag (a void or self-closing element) has an empty
     * inner HTML and no closing tag.
     *
     * @param {string} tokenString The atomic token string, e.g. '<div a="b">content</div>'.
     *
     * @return {Object|null} An object with openingTag, innerHtml and closingTag properties,
     *    or null if the token cannot be split (e.g. an unterminated tag).
     */
    function splitAtomicTokenString(tokenString){
        var openingTagEnd = findOpeningTagEnd(tokenString);
        if (openingTagEnd === -1) {
            return null;
        }
        if (openingTagEnd === tokenString.length - 1) {
            // The token is a single tag (void or self-closing): the element has no content.
            return {
                openingTag: tokenString,
                innerHtml: '',
                closingTag: ''
            };
        }
        var closingTagStart = tokenString.lastIndexOf('<');
        if (closingTagStart <= openingTagEnd || tokenString[closingTagStart + 1] !== '/') {
            return null;
        }
        return {
            openingTag: tokenString.slice(0, openingTagEnd + 1),
            innerHtml: tokenString.slice(openingTagEnd + 1, closingTagStart),
            closingTag: tokenString.slice(closingTagStart)
        };
    }

    /**
     * Renders the recursive inner diff of two matched atomic tokens with equal keys but
     * different content. The after version's opening and closing tags are emitted with the
     * diff of the two inner HTML fragments in between. Inside the recursion the default
     * atomic tags without 'a' are used, so link text is diffed word by word and href-only
     * changes do not produce any markup. The after version's
     * data-htmldiff-inner-diff-atomic-tags attribute overrides that list. Nested opted-in
     * elements are diffed recursively as well, up to a hardcoded depth cap.
     *
     * @param {string} beforeString The before version of the atomic token.
     * @param {string} afterString The after version of the atomic token.
     * @param {string} dataPrefix (Optional) The prefix to use in data attributes.
     * @param {string} className (Optional) The class name to include in the wrapper tag.
     *
     * @return {string} The rendered element with inner differences wrapped in ins/del tags.
     */
    function renderInnerDiff(beforeString, afterString, dataPrefix, className){
        var before = splitAtomicTokenString(beforeString);
        var after = splitAtomicTokenString(afterString);
        if (!before || !after){
            return afterString;
        }
        var atomicTagsOverride = dataHtmlDiffInnerDiffAtomicTagsRegExp.exec(afterString);
        var outerAtomicTagsRegExp = atomicTagsRegExp;
        innerDiffDepth++;
        // we need to clean up the innerDiffDepth update and atomicTagsRegExp restoration in case of an error, hence try/finally
        try {
            atomicTagsRegExp = defaultInnerDiffAtomicTagsRegExp;

            if (atomicTagsOverride) {
                atomicTagsRegExp = atomicTagsOverride[1]
                    ? buildAtomicTagsRegExp(atomicTagsOverride[1])
                    : noAtomicTagsRegExp;
            }

            var innerDiff = diffCore(before.innerHtml, after.innerHtml, className, dataPrefix);
        } finally {
            innerDiffDepth--;
            atomicTagsRegExp = outerAtomicTagsRegExp;
        }
        return after.openingTag + innerDiff + after.closingTag;
    }

    /**
     * OPS.equal/insert/delete/replace are functions that render an operation into
     * HTML content.
     *
     * @param {Object} op The operation that applies to a prticular list of tokens. Has the
     *      following keys:
     *      - {string} action One of ['replace', 'insert', 'delete', 'equal'].
     *      - {number} startInBefore The beginning of the range in the list of before tokens.
     *      - {number} endInBefore The end of the range in the list of before tokens.
     *      - {number} startInAfter The beginning of the range in the list of after tokens.
     *      - {number} endInAfter The end of the range in the list of after tokens.
     * @param {Array.<string>} beforeTokens The before list of tokens.
     * @param {Array.<string>} afterTokens The after list of tokens.
     * @param {number} opIndex The index into the list of operations that identifies the change to
     *      be rendered. This is used to mark wrapped HTML as part of the same operation.
     * @param {string} dataPrefix (Optional) The prefix to use in data attributes.
     * @param {string} className (Optional) The class name to include in the wrapper tag.
     *
     * @return {string} The rendering of that operation.
     */
    var OPS = {
        'equal': function(op, beforeTokens, afterTokens, opIndex, dataPrefix, className){
            // Tokens in an equal operation pair up one to one between before and after. Equal
            // keys do not guarantee equal strings (e.g. atomic tokens matched by
            // data-htmldiff-id): elements that opted in via data-htmldiff-inner-diff get a
            // recursive diff of their content, everything else renders the after version.
            var result = '';
            for (var i = 0; op.startInAfter + i <= op.endInAfter; i++){
                var afterToken = afterTokens[op.startInAfter + i];
                var beforeToken = beforeTokens[op.startInBefore + i];
                if (beforeToken && beforeToken.string !== afterToken.string &&
                        isInnerDiffToken(afterToken.string)){
                    result += renderInnerDiff(
                            beforeToken.string, afterToken.string, dataPrefix, className);
                } else {
                    result += afterToken.string;
                }
            }
            return result;
        },
        'insert': function(op, beforeTokens, afterTokens, opIndex, dataPrefix, className){
            var tokens = afterTokens.slice(op.startInAfter, op.endInAfter + 1);
            var val = tokens.map(function(token){
                return token.string;
            });

            const res = wrap('ins', val, opIndex, dataPrefix, className);

            // handling inserted tags, see https://matrixreq.atlassian.net/browse/MATRIX-7876
            if (/^<[^.\/]+?>$/.exec(res)) {
                return `${res.slice(0, res.length - 1)} data-inserted="true">`;
            }

            return res;
        },
        'delete': function(op, beforeTokens, afterTokens, opIndex, dataPrefix, className){
            var tokens = beforeTokens.slice(op.startInBefore, op.endInBefore + 1);
            var val = tokens.map(function(token){
                return token.string;
            });
            const res = wrap("del", val, opIndex, dataPrefix, className);

            // handling cases like deleted </p><p>, see https://matrixreq.atlassian.net/browse/MATRIX-7688
            if (/^<\/.+?><.+?>$/.exec(res) && !res.includes("del")) {
                return `<del>${val.slice(1, val.length - 1).join("")}</del>`;
            }

            return res;
        },
        'replace': function(){
            return OPS['delete'].apply(null, arguments) + OPS['insert'].apply(null, arguments);
        }
    };

    /**
     * Renders a list of operations into HTML content. The result is the combined version
     * of the before and after tokens with the differences wrapped in tags.
     *
     * @param {Array.<string>} beforeTokens The before list of tokens.
     * @param {Array.<string>} afterTokens The after list of tokens.
     * @param {Array.<Object>} operations The list of operations to transform the before
     *      list of tokens into the after list of tokens, where each operation has the
     *      following keys:
     *      - {string} action One of {'replace', 'insert', 'delete', 'equal'}.
     *      - {number} startInBefore The beginning of the range in the list of before tokens.
     *      - {number} endInBefore The end of the range in the list of before tokens.
     *      - {number} startInAfter The beginning of the range in the list of after tokens.
     *      - {number} endInAfter The end of the range in the list of after tokens.
     * @param {string} dataPrefix (Optional) The prefix to use in data attributes.
     * @param {string} className (Optional) The class name to include in the wrapper tag.
     *
     * @return {string} The rendering of the list of operations.
     */
    function renderOperations(beforeTokens, afterTokens, operations, dataPrefix, className){
        return operations.reduce(function(rendering, op, index){
            return rendering + OPS[op.action](
                    op, beforeTokens, afterTokens, index, dataPrefix, className);
        }, '');
    }

    /**
     * Compares two pieces of HTML content and returns the combined content with differences
     * wrapped in <ins> and <del> tags.
     *
     * @param {string} before The HTML content before the changes.
     * @param {string} after The HTML content after the changes.
     * @param {string} className (Optional) The class attribute to include in <ins> and <del> tags.
     * @param {string} dataPrefix (Optional) The data prefix to use for data attributes. The
     *      operation index data attribute will be named `data-${dataPrefix-}operation-index`.
     * @param {string} atomicTags (Optional) Comma separated list of atomic tag names. The 
     *     list has to be in the form `tag1,tag2,...` e. g. `head,script,style`. If not used, 
     *     the default list `iframe,object,math,svg,script,video,head,style` will be used.
     *
     * @return {string} The combined HTML content with differences wrapped in <ins> and <del> tags.
     */
    function diff(before, after, className, dataPrefix, atomicTags){
        // Enable user provided atomic tag list.
        atomicTags ?
            (atomicTagsRegExp = buildAtomicTagsRegExp(atomicTags))
            : (atomicTagsRegExp = defaultAtomicTagsRegExp);

        return diffCore(before, after, className, dataPrefix);
    }

    /**
     * Runs the diff pipeline with whatever atomic tags regular expression is currently active.
     * Used by the diff function after resolving the atomicTags parameter and by
     * renderInnerDiff, which sets the regular expression itself.
     *
     * @see function diff for the parameter and return value descriptions.
     */
    function diffCore(before, after, className, dataPrefix){
        if (before === after) return before;

        before = htmlToTokens(before);
        after = htmlToTokens(after);
        var ops = calculateOperations(before, after);
        return renderOperations(before, after, ops, dataPrefix, className);
    }

    diff.htmlToTokens = htmlToTokens;
    diff.findMatchingBlocks = findMatchingBlocks;
    findMatchingBlocks.findBestMatch = findBestMatch;
    findMatchingBlocks.createMap = createMap;
    findMatchingBlocks.createToken = createToken;
    findMatchingBlocks.createSegment = createSegment;
    findMatchingBlocks.getKeyForToken = getKeyForToken;
    diff.calculateOperations = calculateOperations;
    diff.renderOperations = renderOperations;

    if (typeof define === 'function'){
        define([], function(){
          return diff;
        });
    } else if (typeof module !== 'undefined' && module !== null){
        module.exports = diff;
    } else {
        this.htmldiff = diff;
    }
}).call(this);
