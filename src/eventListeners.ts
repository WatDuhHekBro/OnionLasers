import {Client, Permissions, Message, MessageReaction, User, PartialUser} from "discord.js";

// A list of message ID and callback pairs. You get the emote name and ID of the user reacting.
// This will handle removing reactions automatically (if the bot has the right permission).
export const reactEventListeners = new Map<string, (reaction: MessageReaction, user: User | PartialUser) => void>();
export const emptyReactEventListeners = new Map<string, () => void>();

// A list of "channel-message" and callback pairs. Also, I imagine that the callback will be much more maintainable when discord.js v13 comes out with a dedicated message.referencedMessage property.
export const replyEventListeners = new Map<string, (message: Message) => void>();

export function attachEventListenersToClient(client: Client) {
    client.on("messageReactionAdd", (reaction, user) => {
        // The reason this is inside the call is because it's possible to switch a user's permissions halfway and suddenly throw an error.
        // This will dynamically adjust for that, switching modes depending on whether it currently has the "Manage Messages" permission.
        const canDeleteEmotes = !!reaction.message.guild?.me?.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES);
        const hasReactionHandler = reactEventListeners.has(reaction.message.id);

        if (hasReactionHandler && !reaction.partial) {
            reactEventListeners.get(reaction.message.id)!(reaction, user);
            // Remove the reaction if that specific message has a reaction handler attached, the bot has permission to do so, and the user isn't a bot.
            // It's VERY important this is contained within the check, otherwise, the bot will remove all reactions regardless of the message source.
            if (canDeleteEmotes && !user.partial && !user.bot) reaction.users.remove(user);
        }
    });

    client.on("messageReactionRemove", (reaction, user) => {
        const canDeleteEmotes = reaction.message.guild?.me?.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES);
        // If reactions aren't automatically removed, then call the event listener again.
        if (!canDeleteEmotes && !reaction.partial) reactEventListeners.get(reaction.message.id)?.(reaction, user);
    });

    client.on("messageReactionRemoveAll", (message) => {
        reactEventListeners.delete(message.id);
        emptyReactEventListeners.get(message.id)?.();
        emptyReactEventListeners.delete(message.id);
    });

    client.on("message", (message) => {
        // If there's an inline reply, fire off that event listener (if it exists).
        if (message.reference) {
            const reference = message.reference;
            replyEventListeners.get(`${reference.channelId}-${reference.messageId}`)?.(message);
        }
    });
}
