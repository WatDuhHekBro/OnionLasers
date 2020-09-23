import path from "path";
import {Collection} from "discord.js";
import {promises as ffs, existsSync, readdirSync} from "fs";
import {toTitleCase, isType, removeExtension} from "./util";
import {Command} from "./command";
import {categories} from "./constants";
import {activateMessageEvent} from "../internal/events";

const BASE_DIR = path.dirname(process.argv[1]);
const COMMANDS_DIR = path.join(BASE_DIR, "commands");
const EVENTS_DIR = path.join(BASE_DIR, "events");

export const commands = (async() => {
	const commands = new Collection<string, Command>();
	const dir = await ffs.opendir(COMMANDS_DIR);
	const listMisc: string[] = [];
	let selected;
	
	// There will only be one level of directory searching (per category).
	while(selected = await dir.read())
	{
		if(selected.isDirectory())
		{
			if(selected.name === "subcommands")
				continue;
			
			const subdir = await ffs.opendir(path.join(COMMANDS_DIR, selected.name));
			const category = toTitleCase(selected.name);
			const list: string[] = [];
			let cmd;
			
			while(cmd = await subdir.read())
			{
				if(cmd.isDirectory())
				{
					if(cmd.name === "subcommands")
						continue;
					else
						console.warn(`You can't have multiple levels of directories! From: "${path.join(COMMANDS_DIR, cmd.name)}"`);
				}
				//else
				//	loadCommand(cmd.name, list, selected.name);
			}
			
			subdir.close();
			categories.set(category, list);
		}
		//else
		//	loadCommand(selected.name, listMisc);
	}
	
	dir.close();
	categories.set("Miscellaneous", listMisc);
	activateMessageEvent(commands);
	
	return commands;
})();

export function loadEvents()
{
	for(const file of open(EVENTS_DIR).filter(filename => filename.endsWith(".js")))
	{
		const header = file.substring(0, file.indexOf(".js"));
		console.log(`Loading Event: ${header}`);
		
		import(path.join(EVENTS_DIR, header)).then(() => {
			console.log(`Event ${header} successfully loaded!`);
		}).catch(() => {
			console.error(`Event ${header} failed to load!`);
		});
	}
}

/*async function loadCommand(filename: string, list: string[], category?: string)
{
	if(!commands)
		return console.error(`Function "loadCommand" was called without first initializing commands!`);
	
	const prefix = category ?? "";
	// The filename MUST be agnostic of specific extensions since it can run under certain conditions (ts-node + mocha interprets TS code).
	const header = filename.substring(0, filename.lastIndexOf("."));
	const command = (await import(path.join(COMMANDS_DIR, prefix, header))).default as Command|undefined;
	
	if(!command)
		return console.warn(`Command "${header}" has no default export which is a Command instance!`);
	
	command.originalCommandName = header;
	list.push(header);
	
	if(commands.has(header))
		console.warn(`Command "${header}" already exists! Make sure to make each command uniquely identifiable across categories!`);
	else
		commands.set(header, command);
	
	for(const alias of command.aliases)
	{
		if(commands.has(alias))
			console.warn(`Top-level alias "${alias}" from command "${header}" already exists either as a command or alias!`);
		else
			commands.set(alias, command);
	}
	
	console.log(`Loading Command: ${header} (${category ? toTitleCase(category) : "Miscellaneous"})`);
}*/

// Accepts both Node.js pure exports and an ES6 default exports.
export async function loadCommand(pathString: string)
{
	const header = removeExtension(path.basename(pathString));
	const command = await import(pathString); // Note: The import function is relative to the executing file unless specified by an absolute path.
	
	// module.exports = new Command() or export = new Command() || export default new Command()
	if(isType(command, Command) || isType(command?.default, Command))
	{
		console.log("pure")
	}
	// Invalid command file.
	else
	{
		console.log("invalid")
	}
}

function open(path: string): string[]
{
	if(existsSync(path))
		return readdirSync(path);
	else
		return [];
}