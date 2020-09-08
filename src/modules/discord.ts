import {Message, Guild, GuildMember, Permissions} from "discord.js";
import {client, eventListeners} from "./constants";

export function botHasPermission(guild: Guild|null, permission: number): boolean
{
	return !!(client.user && guild?.members.resolve(client.user)?.hasPermission(permission))
}

// Pagination function that allows for customization via a callback.
// Define your own pages outside the function because this only manages the actual turning of pages.
export async function paginate(message: Message, senderID: string, total: number, callback: (page: number) => void, duration = 60000)
{
	let page = 0;
	const turn = (amount: number) => {
		page += amount;
		
		if(page < 0)
			page += total;
		else if(page >= total)
			page -= total;
		
		callback(page);
	}
	const handle = (emote: string, reacterID: string) => {
		if(reacterID === senderID)
		{
			switch(emote)
			{
				case '⬅️': turn(-1); break;
				case '➡️': turn(1); break;
			}
		}
	};
	
	// Listen for reactions and call the handler.
	await message.react('⬅️');
	await message.react('➡️');
	eventListeners.set(message.id, handle);
	await message.awaitReactions((reaction, user) => {
		// The reason this is inside the call is because it's possible to switch a user's permissions halfway and suddenly throw an error.
		// This will dynamically adjust for that, switching modes depending on whether it currently has the "Manage Messages" permission.
		const canDeleteEmotes = botHasPermission(message.guild, Permissions.FLAGS.MANAGE_MESSAGES);
		handle(reaction.emoji.name, user.id);
		
		if(canDeleteEmotes)
			reaction.users.remove(user);
		
		return false;
	}, {time: duration});
	
	// When time's up, remove the bot's own reactions.
	eventListeners.delete(message.id);
	message.reactions.cache.get('⬅️')?.users.remove(message.author);
	message.reactions.cache.get('➡️')?.users.remove(message.author);
}

// Waits for the sender to either confirm an action or let it pass (and delete the message).
export async function prompt(message: Message, senderID: string, onConfirm: () => void, duration = 10000)
{
	let isDeleted = false;
	
	message.react('✅');
	await message.awaitReactions((reaction, user) => {
		if(user.id === senderID)
		{
			if(reaction.emoji.name === '✅')
				onConfirm();
			isDeleted = true;
			message.delete();
		}
		
		// CollectorFilter requires a boolean to be returned.
		// My guess is that the return value of awaitReactions can be altered by making a boolean filter.
		// However, because that's not my concern with this command, I don't have to worry about it.
		// May as well just set it to false because I'm not concerned with collecting any reactions.
		return false;
	}, {time: duration});
	
	if(!isDeleted)
		message.delete();
}

export async function getMemberByUsername(guild: Guild, username: string)
{
	return (await guild.members.fetch({
		query: username,
		limit: 1
	})).first();
}

/** Convenience function to handle false cases automatically. */
export async function callMemberByUsername(message: Message, username: string, onSuccess: (member: GuildMember) => void)
{
	const guild = message.guild;
	const send = message.channel.send;
	
	if(guild)
	{
		const member = await getMemberByUsername(guild, username);
		
		if(member)
			onSuccess(member);
		else
			send(`Couldn't find a user by the name of \`${username}\`!`);
	}
	else
		send("You must execute this command in a server!");
}