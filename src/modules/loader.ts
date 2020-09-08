import path from "path";
import {Collection} from "discord.js";
import {promises as ffs, existsSync, mkdirSync, readdirSync} from "fs";
import {toTitleCase} from "./util";
import {Command} from "./command";
import {categories} from "./constants";

const BASE_DIR = path.dirname(process.argv[1]);
const COMMANDS_DIR = path.join(BASE_DIR, "commands");
const EVENTS_DIR = path.join(BASE_DIR, "events");

let commands: Collection<string, Command>|null = null;

/** Returns the cache of the commands if it exists and searches the directory if not. */
export async function loadCommands(): Promise<Collection<string, Command>>
{
	if(commands)
		return commands;
	
	commands = new Collection();
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
				else
					loadCommand(cmd.name, list, selected.name);
			}
			
			subdir.close();
			categories.set(category, list);
		}
		else
			loadCommand(selected.name, listMisc);
	}
	
	dir.close();
	categories.set("Miscellaneous", listMisc);
	
	return commands;
}

export function loadEvents()
{
	for(const file of open(EVENTS_DIR, (filename: string) => filename.endsWith(".js")))
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

// Accept both a Node.js pure export and an ES6 default export. (Later)
async function loadCommand(filename: string, list: string[], category?: string)
{
	if(!commands)
		return console.error(`Function "loadCommand" was called without first initializing commands!`);
	
	const prefix = category ?? "";
	const header = filename.substring(0, filename.indexOf(".js"));
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
}

function open(path: string, filter?: (value: string, index: number, array: string[]) => unknown): string[]
{
	if(!existsSync(path))
		mkdirSync(path);
	
	let directory = readdirSync(path);
	
	if(filter)
		directory = directory.filter(filter);
	
	return directory;
}