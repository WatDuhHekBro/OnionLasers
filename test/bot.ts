// Overrides //
process.argv[1] = __filename; // Set the base directory used by the framework to here.

import assert from "assert";
import inquirer from "inquirer";
import {launch, client, getPrefix} from "../src";

async function confirm(prompt: string): Promise<boolean>
{
	return (await inquirer.prompt({
		type: "confirm",
		name: "value",
		message: prompt
	})).value;
}

// Since a Discord bot never ends its process (unless closed by the program itself), mocha will continue being alive.
// Be sure to call mocha with the "--exit" flag to properly exit after all the tests are conducted.
describe("A bot using this framework...", async function() {
	this.timeout(0);
	
	before(async function() {
		launch((await inquirer.prompt({
			// @ts-ignore
			type: "password",
			name: "token",
			message: "What's your bot's token?",
			mask: true
		})).token);
		
		client.once("ready", () => {
			client.user?.setActivity({
				type: "LISTENING",
				name: `${getPrefix()}help`
			});
		});
	})
	
	it("should login successfully", function(done) {
		client.once("ready", done);
	})
	
	it("should WAIT", async function() {
		assert(await confirm("Did this happen?"));
	})
})