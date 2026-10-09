/** Small array helpers the table pass uses throughout. */

/**
 * The integers from start up to end.
 * @param start The first.
 * @param end The one after the last.
 * @returns The integers.
 */
export function range(start: number, end: number): number[] {
    const result: number[] = [];
    for (let i = start; i < end; i++) {
        result.push(i);
    }
    return result;
}

/**
 * The arrays joined into one.
 * @param arrays The arrays.
 * @returns One array.
 */
export function flatten<T>(arrays: T[][]): T[] {
    return ([] as T[]).concat(...arrays);
}

/**
 * The last entry of an array.
 * @param array The array.
 * @returns The last entry, undefined when empty.
 */
export function last<T>(array: T[]): T | undefined {
    return array[array.length - 1];
}

/**
 * The values without repeats, first occurrence kept.
 * @param values The values.
 * @returns The distinct values.
 */
export function uniqueValues<T>(values: T[]): T[] {
    return Array.from(new Set(values));
}
