import {GuildMember} from "discord.js";
import {PermissionLevels} from "./dynamic";

export function hasPermission(member: GuildMember, permission: number): boolean
{
	// If the requested permission is higher than any defined permission, no one will have that permission.
	if(permission > PermissionLevels.length)
		return false;
	// If the requested permission is lower than any defined permission, everyone can use it.
	// The one gotcha is that -1 is reserved for permission inheritance when instantiating a new Command instance.
	// So you'll want to reserve 0 for the lowest permission level which will function as expected.
	else if(permission < 0)
		return true;
	
	for(let i = PermissionLevels.length-1; i >= permission; i--)
		if(PermissionLevels[i].check(member.user, member))
			return true;
	return false;
}

export function getPermissionLevel(member: GuildMember): number
{
	for(let i = PermissionLevels.length-1; i >= 0; i--)
		if(PermissionLevels[i].check(member.user, member))
			return i;
	return 0;
}

export function getPermissionName(level: number)
{
	if(level > PermissionLevels.length || PermissionLevels.length < 0)
		return "N/A";
	else
		return PermissionLevels[level].name;
}