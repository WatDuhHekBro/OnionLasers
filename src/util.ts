/**
 * Allows you to store a template string with variable markers and parse it later.
 * - Use `%name%` for variables
 * - `%%` = `%`
 * - If the invalid token is null/undefined, nothing is changed.
 */
export function parseVars(line: string, definitions: {[key: string]: string}, invalid: string | null = ""): string {
    let result = "";
    let inVariable = false;
    let token = "";

    for (const c of line) {
        if (c === "%") {
            if (inVariable) {
                if (token === "") result += "%";
                else {
                    if (token in definitions) result += definitions[token];
                    else if (invalid === null) result += `%${token}%`;
                    else result += invalid;

                    token = "";
                }
            }

            inVariable = !inVariable;
        } else if (inVariable) token += c;
        else result += c;
    }

    return result;
}

/**
 * Utility function to require all possible cases to be handled at compile time.
 *
 * To use this function, place it in the "default" case of a switch statement or the "else" statement of an if-else branch.
 * If all cases are handled, the variable being tested for should be of type "never", and if it isn't, that means not all cases are handled yet.
 */
export function requireAllCasesHandledFor(variable: never): never {
    throw new Error(`This function should never be called but got the value: ${variable}`);
}
