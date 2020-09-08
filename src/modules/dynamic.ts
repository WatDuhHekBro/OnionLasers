// User-Defined Behavior
import {User, GuildMember, Guild} from "discord.js";
import {client} from "./constants";
import {loadCommands, loadEvents} from "./loader";

export interface PermissionLevel
{
	name: string;
	check: (user: User, member: GuildMember|null) => boolean;
}

export interface LaunchSettings
{
	onFail: (error: Error) => void;
	permissions?: PermissionLevel[];
	getPrefix?: (guild: Guild|null) => string;
}

export let PermissionLevels: PermissionLevel[] = [];
export let getPrefix: (guild: Guild|null) => string = () => ".";

export function launch(token: string, settings?: LaunchSettings)
{
	if(settings?.getPrefix)
		getPrefix = settings.getPrefix;
	loadCommands();
	loadEvents();
	client.login(token).catch(settings?.onFail || console.error);
}