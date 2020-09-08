import {Collection, Client, Message, TextChannel, DMChannel, NewsChannel, Guild, User, GuildMember} from "discord.js";

enum TYPES
{
	SUBCOMMAND, // Any specifically-defined keywords / string literals.
	CHANNEL, // <#...>
	ROLE, // <@&...>
	EMOTE, // <::ID> (The previous two values, animated and emote name respectively, do not matter at all for finding the emote.)
	MESSAGE, // Available by using the built-in "Copy Message Link" button. https://discordapp.com/channels/<Guild ID>/<Channel ID>/<Message ID> or https://discord.com/...
	USER, // <@...> and <@!...>
	ID, // Any number with 17-19 digits.
	NUMBER, // Any valid number via the Number() function, except for NaN and Infinity (because those can really mess with the program).
	ANY, // Generic argument case.
	NONE // No subcommands exist.
}

interface CommandMenu
{
	args: any[];
	client: Client;
	message: Message;
	channel: TextChannel|DMChannel|NewsChannel;
	guild: Guild|null;
	author: User;
	member: GuildMember|null;
}

interface CommandOptions
{
	description?: string;
	endpoint?: boolean;
	usage?: string;
	permission?: number;
	aliases?: string[];
	run?: (($: CommandMenu) => Promise<any|void>)|string;
	subcommands?: {[key: string]: Command};
	channel?: Command;
	role?: Command;
	emote?: Command;
	message?: Command;
	user?: Command;
	id?: "channel"|"role"|"emote"|"message"|"user";
	number?: Command;
	any?: Command;
}

export class Command
{
	public readonly description: string;
	public readonly endpoint: boolean;
	public readonly usage: string;
	public readonly permission: number;
	public readonly aliases: string[]; // This is to keep the array intact for parent Command instances to use. It'll also be used when loading top-level aliases.
	public originalCommandName: string|null; // If the command is an alias, what's the original name?
	public run: (($: CommandMenu) => Promise<any|void>)|string;
	public readonly subcommands: Collection<string, Command>; // This is the final data structure you'll actually use to work with the commands the aliases point to.
	public channel: Command|null;
	public role: Command|null;
	public emote: Command|null;
	public message: Command|null;
	public user: Command|null;
	public id: Command|null;
	public number: Command|null;
	public any: Command|null;
	public static readonly TYPES = TYPES;
	public header: string; // Header for debugging use.
	
	constructor(options?: CommandOptions)
	{
		this.description = options?.description || "No description.";
		this.endpoint = options?.endpoint || false;
		this.usage = options?.usage || "";
		this.permission = options?.permission ?? -1;
		this.aliases = options?.aliases || [];
		this.originalCommandName = null;
		this.run = options?.run || "No action was set on this command!";
		this.subcommands = new Collection(); // Populate this collection after setting subcommands.
		this.channel = options?.channel || null;
		this.role = options?.role || null;
		this.emote = options?.emote || null;
		this.message = options?.message || null;
		this.user = options?.user || null;
		this.number = options?.number || null;
		this.any = options?.any || null;
		this.header = "";
		
		switch(options?.id || "user")
		{
			case "channel": this.id = this.channel; break;
			case "role": this.id = this.role; break;
			case "emote": this.id = this.emote; break;
			case "message": this.id = this.message; break;
			case "user": this.id = this.user; break;
		}
				
		if(options?.subcommands)
		{
			const originalSubcommands = options.subcommands;
			const baseSubcommandNames = Object.keys(originalSubcommands);
			
			// Loop once to set the base subcommands.
			for(const name in originalSubcommands)
				this.subcommands.set(name, originalSubcommands[name]);
			
			// Then loop again to make aliases point to the base subcommands and warn if something's not right.
			// This shouldn't be a problem because JS should store these as references that point to the same object.
			for(const name in originalSubcommands)
			{
				const subcmd = originalSubcommands[name];
				subcmd.originalCommandName = name;
				const aliases = subcmd.aliases;
				
				for(const alias of aliases)
				{
					if(baseSubcommandNames.includes(alias))
						console.warn(`"${alias}" in subcommand "${name}" was attempted to be declared as an alias but it already exists in the base commands! (Look at the next "Loading Command" line to see which command is affected.)`);
					else if(this.subcommands.has(alias))
						console.warn(`Duplicate alias "${alias}" at subcommand "${name}"! (Look at the next "Loading Command" line to see which command is affected.)`);
					else
						this.subcommands.set(alias, subcmd);
				}
			}
		}
		
		// Because command aliases don't actually do anything except for subcommands, let the user know that this won't do anything.
		warnCommandAliases(this.channel, "channel");
		warnCommandAliases(this.role, "role");
		warnCommandAliases(this.emote, "emote");
		warnCommandAliases(this.message, "message");
		warnCommandAliases(this.user, "user");
		warnCommandAliases(this.number, "number");
		warnCommandAliases(this.any, "any");

		// Warn on unused endpoints too.
		if(this.endpoint && (this.subcommands.size > 0 || this.channel || this.role || this.emote || this.message || this.user || this.number || this.any))
			console.warn(`An endpoint cannot have subcommands! Check ${this.header} again.`);
	}
	
	public resolve(param: string): TYPES
	{
		if(this.subcommands.has(param))
			return TYPES.SUBCOMMAND;
		else if(this.channel && /^<#\d{17,19}>$/.test(param))
			return TYPES.CHANNEL;
		else if(this.role && /^<@&\d{17,19}>$/.test(param))
			return TYPES.ROLE;
		else if(this.emote && /^<a?:.*?:\d{17,19}>$/.test(param))
			return TYPES.EMOTE;
		else if(this.message && /\d{17,19}\/\d{17,19}\/\d{17,19}$/.test(param))
			return TYPES.MESSAGE;
		else if(this.user && /^<@!?\d{17,19}>$/.test(param))
			return TYPES.USER;
		else if(this.id && /^\d{17,19}$/.test(param))
			return TYPES.ID;
		else if(this.number && !Number.isNaN(Number(param)) && param !== "Infinity" && param !== "-Infinity")
			return TYPES.NUMBER;
		else if(this.any)
			return TYPES.ANY;
		else
			return TYPES.NONE;
	}
	
	// You can also optionally send in a pre-calculated value if you already called Command.resolve so you don't call it again.
	public get(param: string, type?: TYPES): Command
	{
		// This expression only runs once, don't worry.
		switch(type ?? this.resolve(param))
		{
			case TYPES.SUBCOMMAND: return checkResolvedCommand(this.subcommands.get(param));
			case TYPES.CHANNEL: return checkResolvedCommand(this.channel);
			case TYPES.ROLE: return checkResolvedCommand(this.role);
			case TYPES.EMOTE: return checkResolvedCommand(this.emote);
			case TYPES.MESSAGE: return checkResolvedCommand(this.message);
			case TYPES.USER: return checkResolvedCommand(this.user);
			case TYPES.ID: return checkResolvedCommand(this.id);
			case TYPES.NUMBER: return checkResolvedCommand(this.number);
			case TYPES.ANY: return checkResolvedCommand(this.any);
			default: return this;
		}
	}
}

function warnCommandAliases(command: Command|null, type: string)
{
	if(command && command.aliases.length > 0)
		console.warn(`There are aliases defined for an "${type}"-type subcommand, but those aliases won't be used. (Look at the next "Loading Command" line to see which command is affected.)`);
}

function checkResolvedCommand(command: Command|null|undefined): Command
{
	if(!command)
		throw new Error("FATAL: Command type mismatch while calling Command.get!");
	return command;
}