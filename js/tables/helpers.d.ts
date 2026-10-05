/** Small array helpers the table pass uses throughout. */
/**
 * The integers from start up to end.
 * @param start The first.
 * @param end The one after the last.
 * @returns The integers.
 */
export declare function range(start: number, end: number): number[];
/**
 * The arrays joined into one.
 * @param arrays The arrays.
 * @returns One array.
 */
export declare function flatten<T>(arrays: T[][]): T[];
/**
 * The last entry of an array.
 * @param array The array.
 * @returns The last entry, undefined when empty.
 */
export declare function last<T>(array: T[]): T | undefined;
/**
 * The values without repeats, first occurrence kept.
 * @param values The values.
 * @returns The distinct values.
 */
export declare function uniqueValues<T>(values: T[]): T[];
