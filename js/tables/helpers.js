"use strict";
/** Small array helpers the table pass uses throughout. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniqueValues = exports.last = exports.flatten = exports.range = void 0;
/**
 * The integers from start up to end.
 * @param start The first.
 * @param end The one after the last.
 * @returns The integers.
 */
function range(start, end) {
    const result = [];
    for (let i = start; i < end; i++) {
        result.push(i);
    }
    return result;
}
exports.range = range;
/**
 * The arrays joined into one.
 * @param arrays The arrays.
 * @returns One array.
 */
function flatten(arrays) {
    return [].concat(...arrays);
}
exports.flatten = flatten;
/**
 * The last entry of an array.
 * @param array The array.
 * @returns The last entry, undefined when empty.
 */
function last(array) {
    return array[array.length - 1];
}
exports.last = last;
/**
 * The values without repeats, first occurrence kept.
 * @param values The values.
 * @returns The distinct values.
 */
function uniqueValues(values) {
    return values.filter((value, index) => values.indexOf(value) === index);
}
exports.uniqueValues = uniqueValues;
