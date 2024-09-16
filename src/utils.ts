export const isAlpha = (string: string) => /^[a-zA-Z]+$/.test(string);

/**
 * Debounces a function, so that it is only called after a certain amount of time
 * has passed since the last time it was called.
 *
 * @param callback The function to debounce.
 * @param delay The amount of time to wait before calling the function.
 * @returns A debounced version of the function.
 */
export function debounce(callback: Function, delay: number) {
    let timeoutId: number | undefined;
    return (...args: any[]) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = window.setTimeout(() => {
            callback(...args);
        }, delay);
    };
}