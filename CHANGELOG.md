# 1.1.3
- Made `reactInOrder` public
- Moved last executed command rejection handler to just a callback for better user customization. **You'll need to implement `process.on("unhandledRejection", ...)` now.**

# 1.1.2
- Fixed an issue where a bot would end up deleting all reactions regardless of whether or not the message had a reaction event listener to begin with (i.e. for `paginate`).

# 1.1.1
- Fixed an issue where a bot would send the "no permissions to send in channel" message even if the message wasn't a command.

# 1.1.0
- Added `getUserByNickname` utility function

# 1.0.0
First major release
