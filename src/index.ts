import * as discord from "./modules/discord";
import * as util from "./modules/util";
import * as loader from "./modules/loader";
import * as permissions from "./modules/permissions";
import * as dynamic from "./modules/dynamic";
import * as constants from "./modules/constants";
import * as command from "./modules/command";

export = {
	...discord,
	...util,
	...loader,
	...permissions,
	...dynamic,
	...constants,
	...command
};