//import assert from "assert";
//import inquirer from "inquirer";
import path from "path";
import {loadCommand} from "../src";

describe("asdf", function() {
	it("qwer", function() {
		loadCommand(path.join(__dirname, "dummy", "types")).catch(console.error);
	})
})