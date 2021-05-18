import {Collection} from "discord.js";
import glob from "glob";
import path from "path";
import {NamedCommand, CommandInfo} from "./command";
import {loadableCommands, categoryTransformer} from "./interface";
import {SlashCommand} from "./slashCommands";

// Internally, it'll keep its original capitalization. It's up to you to convert it to title case when you make a help command.
const categories = new Collection<string, string[]>();
export const slashCommandRegistry = new Collection<string, SlashCommand>(); // Collection<command name, command instance>

// This will go through all the .js/.ts files and import them. .js is used when a project is compiled normally, .ts is used when a project is interpreted via a REPL.
// This will avoid the problems of being a node module by requiring absolute imports, which the user will pass in as a launch parameter.
export async function loadCommands(
    commandsDir: string,
    useTSExtension: boolean
): Promise<Collection<string, NamedCommand>> {
    // Add a trailing separator so that the reduced filename list will reliably cut off the starting part.
    // "C:/some/path/to/commands" --> "C:/some/path/to/commands/" (and likewise for \)
    commandsDir = path.normalize(commandsDir);
    if (!commandsDir.endsWith(path.sep)) commandsDir += path.sep;

    const commands = new Collection<string, NamedCommand>();
    const files = await globP(path.join(commandsDir, "**", useTSExtension ? "*.ts" : "*.js")); // This stage filters out source maps (.js.map).
    // Because glob will use / regardless of platform, the following regex pattern can rely on / being the case.
    const filesClean = files.map((filename) => filename.substring(commandsDir.length));
    // Extract the usable parts from commands directory if the path is 1 to 2 subdirectories (a or a/b, not a/b/c).
    // No further checks will be made to exclude template command files or test command files, keeping it structure-agnostic.
    const pattern = new RegExp(`^([^/]+(?:\\/[^/]+)?)\\.${useTSExtension ? "ts" : "js"}$`);
    const lists: {[category: string]: string[]} = {};

    for (let i = 0; i < files.length; i++) {
        const match = pattern.exec(filesClean[i]);
        if (!match) continue;
        const commandID = match[1]; // e.g. "utilities/info"
        const slashIndex = commandID.indexOf("/");
        const isMiscCommand = slashIndex !== -1;
        const category = isMiscCommand ? commandID.substring(0, slashIndex) : "miscellaneous";
        const commandName = isMiscCommand ? commandID.substring(slashIndex + 1) : commandID; // e.g. "info"

        // This try-catch block MUST be here or Node.js' dynamic require() will silently fail.
        try {
            // If the dynamic import works, it must be an object at the very least. Then, just test to see if it's a proper instance.
            const command = (await import(files[i])).default as unknown;

            if (command instanceof NamedCommand) {
                const isNameOverridden = command.isNameSet();
                if (!isNameOverridden) command.name = commandName;
                const header = command.name;

                if (commands.has(header)) {
                    console.warn(
                        `Command "${header}" already exists! Make sure to make each command uniquely identifiable across categories!`
                    );
                } else {
                    commands.set(header, command);
                }

                for (const alias of command.aliases) {
                    if (commands.has(alias)) {
                        console.warn(
                            `Top-level alias "${alias}" from command "${commandID}" already exists either as a command or alias!`
                        );
                    } else {
                        commands.set(alias, command);
                    }
                }

                if (!(category in lists)) lists[category] = [];
                lists[category].push(header);

                if (isNameOverridden) console.log(`Loaded Command: "${commandID}" as "${header}"`);
                else console.log(`Loaded Command: ${commandID}`);
            } else if (command instanceof SlashCommand) {
                // Doing without name overrides shouldn't ever be a problem.
                // Slash command names are restricted to lowercase and alphanumeric, all of which are available in common file systems.
                slashCommandRegistry.set(commandName, command);
            } else {
                console.warn(
                    `Command "${commandID}" has no default export which is a NamedCommand or SlashCommand instance!`
                );
            }
        } catch (error) {
            console.error(error);
        }
    }

    for (const category in lists) {
        categories.set(category, lists[category]);
    }

    return commands;
}

function globP(path: string) {
    return new Promise<string[]>((resolve, reject) => {
        glob(path, (error, files) => {
            if (error) {
                reject(error);
            } else {
                resolve(files);
            }
        });
    });
}

/**
 * Returns a list of categories and their associated commands.
 */
export async function getCommandList(): Promise<Collection<string, NamedCommand[]>> {
    const list = new Collection<string, NamedCommand[]>();
    const commands = await loadableCommands;

    for (const [category, headers] of categories) {
        const commandList: NamedCommand[] = [];
        for (const header of headers) commandList.push(commands.get(header)!);
        // Ignore empty categories like "miscellaneous" (if it's empty).
        if (commandList.length > 0) list.set(categoryTransformer(category), commandList);
    }

    return list;
}

/**
 * Resolves a command based on the arguments given.
 * - Returns a string if there was an error.
 * - Returns a CommandInfo/category tuple if it was a success.
 */
export async function getCommandInfo(args: string[]): Promise<[CommandInfo, string] | string> {
    // Use getCommandList() instead if you're just getting the list of all commands.
    if (args.length === 0) return "No arguments were provided!";

    // Setup the root command
    const commands = await loadableCommands;
    let header = args.shift()!;
    const command = commands.get(header);
    if (!command) return `No command found by the name \`${header}\`.`;
    if (!(command instanceof NamedCommand)) return "Command is not a proper instance of NamedCommand.";
    // If it's an alias, set the header to the original command name.
    if (command.name) header = command.name;

    // Search categories
    let category = "Unknown";
    for (const [referenceCategory, headers] of categories) {
        if (headers.includes(header)) {
            category = categoryTransformer(referenceCategory);
            break;
        }
    }

    // Gather info
    const result = command.resolveInfo(args, header);
    if (result.type === "error") return result.message;
    else return [result, category];
}
