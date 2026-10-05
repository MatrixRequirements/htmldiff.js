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
export declare function isTag(token: string): string | false;
/**
 * Checks if a tag is a void tag, written with the XML style '/>'.
 * @param token The token to check.
 * @returns True if the token is a void tag, false otherwise.
 */
export declare function isVoidTag(token: string): boolean;
/**
 * Checks if a tag name is an HTML void element. Void elements cannot have content and can
 * skip a closing tag, so an atomic element with a void tag name ends with its opening tag,
 * with or without the XML style '/>'.
 * @param tag The tag name to check.
 * @returns True if the tag name is a void element.
 */
export declare function isVoidTagName(tag: string): boolean;
/**
 * Checks if a token can be wrapped inside a tag: text, images, void tags and atomic tags
 * can, other tags cannot.
 * @param token The token to check.
 * @returns True if the token can be wrapped inside a tag, false otherwise.
 */
export declare function isWrappable(token: string): boolean;
/**
 * Creates a token that holds a string and key representation. The key is used for diffing
 * comparisons and the string is used to recompose the document after the diff is complete.
 * @param currentWord The section of the document to create a token for.
 * @returns A token object with a string and key property.
 */
export declare function createToken(currentWord: string): Token;
/**
 * Creates a key that should be used to match tokens. This is useful, for example, if we want
 * to consider two open tag tokens as equal, even if they don't have the same attributes. We
 * use a key instead of overwriting the token because we may want to render the original
 * string without losing the attributes.
 * @param token The token to create the key for.
 * @returns The identifying key that should be used to match before and after tokens.
 */
export declare function getKeyForToken(token: string): string;
/**
 * Tokenizes a string of HTML.
 * @param html The string to tokenize.
 * @returns The list of tokens.
 */
export declare function htmlToTokens(html: string): Token[];
