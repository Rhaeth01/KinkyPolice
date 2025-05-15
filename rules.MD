TITLE: Implementing Slash Command Execution (discord.js)
DESCRIPTION: This asynchronous function defines the core logic that runs when a user invokes the slash command. It receives the `interaction` object and uses `interaction.reply()` to send a message back to the user in the channel. Replying to the interaction is mandatory to indicate success to Discord and prevent a 'command failed' message.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/creating-your-bot/slash-commands.md#_snippet_1

LANGUAGE: js
CODE:
```
async execute(interaction) {
	await interaction.reply('Pong!')
}
```

----------------------------------------

TITLE: Initializing Basic Discord.js Client
DESCRIPTION: This code snippet initializes a new Discord bot client instance with the necessary intents to handle guild messages and reactions. It sets up a listener for the `ClientReady` event to confirm successful login and includes a basic interaction handler boilerplate.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/popular-topics/reactions.md#_snippet_0

LANGUAGE: js
CODE:
```
const { Client, Events, GatewayIntentBits } = require('discord.js');

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions],
});

client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, interaction => {
	// ...
});

client.login('your-token-goes-here');
```

----------------------------------------

TITLE: Initializing Discord.js Client with GatewayIntentBits (JavaScript)
DESCRIPTION: This snippet demonstrates how to initialize a discord.js `Client` instance by passing an array of required `GatewayIntentBits` enum values to the `intents` property in the constructor. This is the standard way to tell Discord which event groups your bot needs to subscribe to.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/popular-topics/intents.md#_snippet_0

LANGUAGE: javascript
CODE:
```
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
	],
});
```

----------------------------------------

TITLE: Basic Discord.js Bot Template JavaScript
DESCRIPTION: Provides a foundational template for a discord.js bot, including client initialization with intents, basic event listeners for ready and interaction events, and the login call. This serves as the starting point for subsequent examples.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/additional-info/async-await.md#_snippet_4

LANGUAGE: javascript
CODE:
```
const { Client, Events, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, () => {
	console.log('I am ready!');
});

client.on(Events.InteractionCreate, interaction => {
	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === 'react') {
		// ...
	}
});

client.login('your-token-goes-here');
```

----------------------------------------

TITLE: Installing Node.js Dependencies with npm (Shell)
DESCRIPTION: Runs the `npm install` command in a project directory containing a `package.json` file. This command reads the listed dependencies and devDependencies and installs them into the local `node_modules` folder. It's a standard step after modifying `package.json` or after clearing the cache/deleting `node_modules`.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/popular-topics/errors.md#_snippet_8

LANGUAGE: Shell
CODE:
```
npm install
```

----------------------------------------

TITLE: Installing discord.js Library with npm
DESCRIPTION: This command installs the discord.js library into the Node.js project using the npm package manager, adding it as a dependency in the package.json file.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/preparations/README.md#_snippet_8

LANGUAGE: sh
CODE:
```
npm install discord.js
```

----------------------------------------

TITLE: Initial Client#interactionCreate Event Handler (Discord.js)
DESCRIPTION: Shows the basic structure of an `interactionCreate` event handler focused solely on processing chat input commands (`isChatInputCommand`). It retrieves the command, checks for its existence, and executes it, including basic error handling. It explicitly returns for other interaction types.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/message-components/interactions.md#_snippet_3

LANGUAGE: javascript
CODE:
```
const { Events } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (!interaction.isChatInputCommand()) return;

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(`Error executing ${interaction.commandName}`);
			console.error(error);
		}
	},
};
```

----------------------------------------

TITLE: Executing Discord Slash Commands with Error Handling - JavaScript
DESCRIPTION: The complete implementation of the `interactionCreate` handler for chat input commands. It retrieves the command from the `client.commands` Collection using `interaction.commandName`. If found, it attempts to execute the command's `execute` method within a try-catch block, handling potential errors during execution by sending an ephemeral error message back to the user via `reply` or `followUp`.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/creating-your-bot/command-handling.md#_snippet_5

LANGUAGE: JavaScript
CODE:
```
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		}
	}
});
```

----------------------------------------

TITLE: Quickly Initializing Node.js Project with npm
DESCRIPTION: This command quickly initializes a new Node.js project using npm, creating a package.json file with default values without prompting the user for details.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/preparations/README.md#_snippet_4

LANGUAGE: sh
CODE:
```
npm init -y
```

----------------------------------------

TITLE: Accessing Promise Resolved Value Async/Await JavaScript
DESCRIPTION: Demonstrates how to retrieve and use the resolved value of an awaited Promise. The result of the `await` expression (the reply response) is assigned directly to a variable, allowing easy access to the message object for subsequent actions like deletion within the async function.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/additional-info/async-await.md#_snippet_10

LANGUAGE: javascript
CODE:
```
client.on(Events.InteractionCreate, async interaction => {
	if (commandName === 'delete') {
		try {
			const response = await interaction.reply({ content: 'This message will be deleted.', withResponse: true });
			setTimeout(() => response.resource.message.delete(), 10_000);
		} catch (error) {
			// handle error
		}
	}
});
```

----------------------------------------

TITLE: Using dotenv to Load Variables from .env File
DESCRIPTION: Explains the format of a .env file for storing key-value environment variables and demonstrates how to use the `dotenv` package in Node.js to load these variables into `process.env` for application access.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/creating-your-bot/README.md#_snippet_3

LANGUAGE: env
CODE:
```
A=123
B=456
DISCORD_TOKEN=your-token-goes-here
```

LANGUAGE: javascript
CODE:
```
const dotenv = require('dotenv');

dotenv.config();

console.log(process.env.A);
console.log(process.env.B);
console.log(process.env.DISCORD_TOKEN);
```

----------------------------------------

TITLE: Dynamically Loading Command Files into Collection - JavaScript
DESCRIPTION: Reads command files from subdirectories within a specified 'commands' folder using Node.js `fs` and `path` modules. It iterates through folders and files, `require`s each JavaScript file, validates that the required module has `data` and `execute` properties, and then stores the command module in the `client.commands` Collection using the command name as the key.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/creating-your-bot/command-handling.md#_snippet_1

LANGUAGE: JavaScript
CODE:
```
client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}
```

----------------------------------------

TITLE: Initializing package.json File
DESCRIPTION: Shows the commands to generate a new package.json file in the current directory using different package managers. The -y flag for npm, yarn, and bun accepts defaults, while pnpm requires a manual init command.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/improving-dev-environment/package-json-scripts.md#_snippet_1

LANGUAGE: sh
CODE:
```
npm init -y
```

LANGUAGE: sh
CODE:
```
yarn init -y
```

LANGUAGE: sh
CODE:
```
pnpm init
```

LANGUAGE: sh
CODE:
```
bun init -y
```

----------------------------------------

TITLE: Initializing discord.js Client and Logging In (JavaScript)
DESCRIPTION: This JavaScript snippet sets up the core of a discord.js bot. It imports required modules, creates a `Client` instance specifying `GatewayIntentBits.Guilds`, registers a listener for the `ClientReady` event to confirm successful connection, and authenticates the bot using a token read from a `config.json` file.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/creating-your-bot/main-file.md#_snippet_0

LANGUAGE: javascript
CODE:
```
// Require the necessary discord.js classes
const { Client, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Log in to Discord with your client's token
client.login(token);
```

----------------------------------------

TITLE: Creating and Handling Promise JavaScript
DESCRIPTION: Defines a JavaScript function that returns a Promise. The promise demonstrates resolution with a value after a delay and rejection with an error based on an input condition. It shows how to consume the promise using `.then()` for success and `.catch()` for failure.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/additional-info/async-await.md#_snippet_0

LANGUAGE: javascript
CODE:
```
function deleteMessages(amount) {
	return new Promise((resolve, reject) => {
		if (amount > 10) return reject(new Error('You can\'t delete more than 10 Messages at a time.'));
		setTimeout(() => resolve('Deleted 10 messages.'), 2_000);
	});
}

deleteMessages(5).then(value => {
	// `deleteMessages` is complete and has not encountered any errors
	// the resolved value will be the string "Deleted 10 messages"
}).catch(error => {
	// `deleteMessages` encountered an error
	// the error will be an Error Object
});
```

----------------------------------------

TITLE: Filtering Discord InteractionCreate to Chat Input Commands - JavaScript
DESCRIPTION: Refines the `interactionCreate` event listener to ensure that only chat input commands (slash commands) are processed. It uses the `interaction.isChatInputCommand()` method as a guard clause, returning early if the interaction is of a different type.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/creating-your-bot/command-handling.md#_snippet_3

LANGUAGE: JavaScript
CODE:
```
client.on(Events.InteractionCreate, interaction => {
	if (!interaction.isChatInputCommand()) return;
	console.log(interaction);
});
```

----------------------------------------

TITLE: Listening for Discord InteractionCreate Event - JavaScript
DESCRIPTION: Sets up an event listener on the client for the `Events.InteractionCreate` event. This event fires whenever any interaction (like slash commands, buttons, etc.) occurs, and this initial snippet simply logs the interaction object to the console for inspection.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/creating-your-bot/command-handling.md#_snippet_2

LANGUAGE: JavaScript
CODE:
```
client.on(Events.InteractionCreate, interaction => {
	console.log(interaction);
});
```

----------------------------------------

TITLE: Converting Collection to Array - JavaScript
DESCRIPTION: This snippet illustrates different methods for converting a discord.js Collection into a standard JavaScript Array. It demonstrates retrieving values, keys, and [key, value] pairs using `Array.from()` and the spread syntax (`...`). Requires a Collection instance.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/additional-info/collections.md#_snippet_1

LANGUAGE: js
CODE:
```
// For values.
Array.from(collection.values());
[...collection.values()];

// For keys.
Array.from(collection.keys());
[...collection.keys()];

// For [key, value] pairs.
Array.from(collection);
[...collection];
```

----------------------------------------

TITLE: Managing Intents with IntentsBitField in Discord.js (JavaScript)
DESCRIPTION: This snippet shows how to use the `IntentsBitField` utility class to programmatically build and modify a collection of intents. It allows adding and removing flags (intent names) using `.add()` and `.remove()` methods before the resulting bitfield object is passed to the `Client` constructor's `intents` option, offering more dynamic control over intent configuration.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/popular-topics/intents.md#_snippet_1

LANGUAGE: javascript
CODE:
```
const { Client, IntentsBitField } = require('discord.js');

const myIntents = new IntentsBitField();
myIntents.add(IntentsBitField.Flags.GuildPresences, IntentsBitField.Flags.GuildMembers);

const client = new Client({ intents: myIntents });

// other examples:
const otherIntents = new IntentsBitField([IntentsBitField.Flags.Guilds, IntentsBitField.Flags.DirectMessages]);
otherIntents.remove([IntentsBitField.Flags.DirectMessages]);
```

----------------------------------------

TITLE: Loading and Registering Event Handlers (index.js - Final)
DESCRIPTION: The complete index.js file after refactoring. It initializes the client, loads commands from the 'commands' directory (as before), and adds new logic to dynamically read event files from the 'events' directory. It then registers each event listener on the client using `client.once` or `client.on` based on the event file's configuration.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/creating-your-bot/event-handling.md#_snippet_4

LANGUAGE: javascript
CODE:
```
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

client.login(token);
```

----------------------------------------

TITLE: Modified Client#interactionCreate Handler for Multiple Types (Discord.js)
DESCRIPTION: Modifies the `interactionCreate` event handler logic to process chat input commands within an `if` block instead of returning early. This prepares the handler to include `else if` blocks for other interaction types like buttons or select menus.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/message-components/interactions.md#_snippet_4

LANGUAGE: javascript
CODE:
```
const { Events } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				await command.execute(interaction);
			} catch (error) {
				console.error(`Error executing ${interaction.commandName}`);
				console.error(error);
			}
		}
	},
};
```

----------------------------------------

TITLE: Using ES6 Arrow Functions for Event Handlers and Declarations (JavaScript)
DESCRIPTION: This snippet demonstrates the use of ES6 arrow functions (`=>`) as replacements for traditional ES5 functions. It shows how arrow functions provide a more concise syntax for event handlers and function expressions, including implicit return for single-line expressions and optional parentheses for single parameters.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/additional-info/es6-syntax.md#_snippet_7

LANGUAGE: JavaScript
CODE:
```
// arrow functions, full ES6
client.once(Events.ClientReady, () => console.log('Ready!'));

client.on(Events.TypingStart, typing => console.log(`${typing.user.tag} started typing in #${typing.channel.name}`));

client.on(Events.MessageCreate, message => console.log(`${message.author.tag} sent: ${message.content}`));

const doubleAge = age => `Your age doubled is: ${age * 2}`;

// inside a message collector command
const collectorFilter = m => m.content === 'I agree' && !m.author.bot;
const collector = message.createMessageCollector({ filter: collectorFilter, time: 15_000 });
```

----------------------------------------

TITLE: Initializing Node.js Project with pnpm
DESCRIPTION: This command initializes a new Node.js project using the pnpm package manager. It creates a package.json file to manage project dependencies and configuration, prompting the user for project details.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/preparations/README.md#_snippet_2

LANGUAGE: sh
CODE:
```
pnpm init
```

----------------------------------------

TITLE: Accessing Standard Slash Command Options in discord.js JavaScript
DESCRIPTION: Shows how to retrieve the values of standard command options ('target' user, 'reason' string) within the execute method of a slash command using the interaction.options object. It demonstrates using `.getUser()` and `.getString()` and handling optional parameters with the nullish coalescing operator.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/slash-commands/parsing-options.md#_snippet_1

LANGUAGE: javascript
CODE:
```
module.exports = {
	// data: new SlashCommandBuilder()...
	async execute(interaction) {
		const target = interaction.options.getUser('target');
		const reason = interaction.options.getString('reason') ?? 'No reason provided';

		await interaction.reply(`Banning ${target.username} for reason: ${reason}`);
		await interaction.guild.members.ban(target);
	},
};
```

----------------------------------------

TITLE: Handling Buy Command Interaction JavaScript
DESCRIPTION: This snippet handles the `/buy` slash command. It finds the specified item in the `CurrencyShop` database (using case-insensitive search with `Op.like`), checks if the user has enough currency using `getBalance`, and if so, deducts the item cost using `addBalance` and adds the item to the user's inventory via the `addItem()` association method. It replies with a confirmation or an error message.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/sequelize/currency.md#_snippet_11

LANGUAGE: JavaScript
CODE:
```
else if (commandName === 'buy') {
	const itemName = interaction.options.getString('item');
	const item = await CurrencyShop.findOne({ where: { name: { [Op.like]: itemName } } });

	if (!item) return interaction.reply(`That item doesn't exist.`);
	if (item.cost > getBalance(interaction.user.id)) {
		return interaction.reply(`You currently have ${getBalance(interaction.user.id)}, but the ${item.name} costs ${item.cost}!`);
	}

	const user = await Users.findOne({ where: { user_id: interaction.user.id } });
	addBalance(interaction.user.id, -item.cost);
	await user.addItem(item);

	return interaction.reply(`You've bought: ${item.name}.`);
}
```

----------------------------------------

TITLE: Initializing Node.js Project with npm
DESCRIPTION: This command initializes a new Node.js project using the npm package manager. It creates a package.json file to manage project dependencies and configuration, prompting the user for project details.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/preparations/README.md#_snippet_0

LANGUAGE: sh
CODE:
```
npm init
```

----------------------------------------

TITLE: Handling InteractionCreate Event in index.js (Initial)
DESCRIPTION: Registers an 'on' listener for the `InteractionCreate` event in the initial index.js file. This listener fires every time an interaction is received. It specifically handles chat input commands by finding and executing the corresponding command logic, including error handling.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/creating-your-bot/event-handling.md#_snippet_1

LANGUAGE: javascript
CODE:
```
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		}
	}
});
```

----------------------------------------

TITLE: Checking if Discord.js Structure is Partial (JavaScript)
DESCRIPTION: This code snippet illustrates how to determine if a Discord.js structure, such as a message object received in an event, is a partial structure. It checks the boolean `.partial` property of the structure; if `true`, it's a partial containing only the ID, otherwise, it's a full structure with complete data. This check is crucial before attempting to access other properties or methods.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/popular-topics/partials.md#_snippet_1

LANGUAGE: javascript
CODE:
```
if (message.partial) {
	console.log('The message is partial.');
} else {
	console.log('The message is not partial.');
}
```

----------------------------------------

TITLE: Handling Promise Rejections Async/Await Try/Catch JavaScript
DESCRIPTION: Illustrates how to handle potential Promise rejections when using `async/await` by wrapping the awaited asynchronous operations within a `try...catch` block. Any rejected Promise inside the `try` block will transfer control to the `catch` block.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/additional-info/async-await.md#_snippet_8

LANGUAGE: javascript
CODE:
```
client.on(Events.InteractionCreate, async interaction => {
	if (commandName === 'react') {
		try {
			const response = await interaction.reply({ content: 'Reacting!', withResponse: true });
			const { message } = response.resource;
			await message.react('🇦');
			await message.react('🇧');
			await message.react('🇨');
		} catch (error) {
			// handle failure of any Promise rejection inside here
		}
	}
});
```

----------------------------------------

TITLE: Defining Slash Command Metadata (discord.js)
DESCRIPTION: This snippet demonstrates how to use the SlashCommandBuilder from discord.js to define the basic metadata for a slash command. It sets the command's name ('ping') and provides a description ('Replies with Pong!') which will be displayed in the Discord client's command picker.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/creating-your-bot/slash-commands.md#_snippet_0

LANGUAGE: js
CODE:
```
new SlashCommandBuilder()
	.setName('ping')
	.setDescription('Replies with Pong!');
```

----------------------------------------

TITLE: Awaiting Discord.js Modal Submission JavaScript
DESCRIPTION: This snippet demonstrates how to wait for a modal submission after an initial interaction using `awaitModalSubmit`. It sets a timeout of 60 seconds and uses a filter (represented by the `filter` variable, which needs to be defined elsewhere) to specify which modal submission to listen for. The code handles successful submission via `.then()` and timeout/errors via `.catch()`.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/popular-topics/collectors.md#_snippet_7

LANGUAGE: javascript
CODE:
```
initialInteraction.awaitModalSubmit({ time: 60_000, filter })
	.then(interaction => interaction.editReply('Thank you for your submission!'))
	.catch(err => console.log('No modal submit interaction was collected'));
```

----------------------------------------

TITLE: Defining a Simple Ping Slash Command - JavaScript
DESCRIPTION: Provides an example structure for an individual command file using `SlashCommandBuilder`. It defines the command's metadata (`name`, `description`) in the `data` property and includes an asynchronous `execute` function that handles the command's logic, in this case, replying with "Pong!".
SOURCE: https://github.com/discordjs/guide/blob/main/guide/creating-your-bot/command-handling.md#_snippet_4

LANGUAGE: JavaScript
CODE:
```
module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
	async execute(interaction) {
		await interaction.reply('Pong!');
	},
};
```

----------------------------------------

TITLE: Fetching data from Random Cat API
DESCRIPTION: Makes an asynchronous GET request to the random.cat API endpoint using `undici`. It then parses the JSON response body to extract the `file` property, which contains the URL of a random cat image.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/additional-info/rest-api.md#_snippet_3

LANGUAGE: js
CODE:
```
const catResult = await request('https://aws.random.cat/meow');
const { file } = await catResult.body.json();
```

----------------------------------------

TITLE: Awaiting Single Component Interaction with Filter (Discord.js)
DESCRIPTION: Demonstrates awaiting a single component interaction (`awaitMessageComponent`) on a message sent in response to an interaction. It includes a filter to ensure only the original user can interact and a timeout. Handles the timeout by editing the message.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/message-components/interactions.md#_snippet_0

LANGUAGE: javascript
CODE:
```
const response = await interaction.reply({
	content: `Are you sure you want to ban ${target.username} for reason: ${reason}?`,
	components: [row],
	withResponse: true,
});

const collectorFilter = i => i.user.id === interaction.user.id;

try {
	const confirmation = await response.resource.message.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });
} catch {
	await interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', components: [] });
}
```

----------------------------------------

TITLE: Deploying Discord Guild Commands (JavaScript)
DESCRIPTION: This script uses `discord.js`'s REST module to register slash commands for a specific Discord guild. It reads command definitions from local files in the 'commands' directory, prepares the command data, and uses the `PUT` method on the `applicationGuildCommands` route to update the guild's command list. It requires a `config.json` file with `clientId`, `guildId`, and `token`.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/creating-your-bot/command-deployment.md#_snippet_1

LANGUAGE: javascript
CODE:
```
const { REST, Routes } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');
const fs = require('node:fs');
const path = require('node:path');

const commands = [];
// Grab all the command folders from the commands directory you created earlier
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	// Grab all the command files from the commands directory you created earlier
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			commands.push(command.data.toJSON());
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token);

// and deploy your commands!
(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationGuildCommands(clientId, guildId),
			{ body: commands },
		);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();
```

----------------------------------------

TITLE: Collecting Multiple Component Interactions (Discord.js)
DESCRIPTION: Illustrates using `createMessageComponentCollector` on a message to listen for multiple component interactions. It specifies the component type and a time limit. The `collect` event handler processes each interaction, accessing the selected value(s) and replying.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/message-components/interactions.md#_snippet_2

LANGUAGE: javascript
CODE:
```
const response = await interaction.reply({
	content: 'Choose your starter!',
	components: [row],
	withResponse: true,
});

const collector = response.resource.message.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 3_600_000 });

collector.on('collect', async i => {
	const selection = i.values[0];
	await i.reply(`${i.user} has selected ${selection}!`);
});
```

----------------------------------------

TITLE: Initializing Discord Client with Command Collection - JavaScript
DESCRIPTION: Initializes the discord.js client with necessary intents, imports core Node.js modules like `fs` and `path`, and creates a `Collection` instance to store command modules, attaching it to the client object for easy access throughout the bot.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/creating-your-bot/command-handling.md#_snippet_0

LANGUAGE: JavaScript
CODE:
```
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
```

----------------------------------------

TITLE: Creating Ping Slash Command Module (discord.js)
DESCRIPTION: This complete module file defines a simple 'ping' slash command. It exports a `data` property containing the command's metadata created with `SlashCommandBuilder` and an `execute` function that handles the interaction by replying 'Pong!'. This structure allows the command handler and deployment script to easily load and register the command.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/creating-your-bot/slash-commands.md#_snippet_2

LANGUAGE: js
CODE:
```
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
	async execute(interaction) {
		await interaction.reply('Pong!');
	},
};
```

----------------------------------------

TITLE: Implementing Fetch Tag Command (JS)
DESCRIPTION: Adds functionality to handle a '/tag' chat input command. It retrieves a tag by name using `Tags.findOne()`, increments its usage count if found, and replies with the tag's description. If the tag is not found, it sends a 'not found' message.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/sequelize/README.md#_snippet_6

LANGUAGE: js
CODE:
```
if (commandName === 'addtag') {
	// ...
}
else if (command === 'tag') {
	const tagName = interaction.options.getString('name');

	// equivalent to: SELECT * FROM tags WHERE name = 'tagName' LIMIT 1;
	const tag = await Tags.findOne({ where: { name: tagName } });

	if (tag) {
		// equivalent to: UPDATE tags SET usage_count = usage_count + 1 WHERE name = 'tagName';
		tag.increment('usage_count');

		return interaction.reply(tag.get('description'));
	}

	return interaction.reply(`Could not find tag: ${tagName}`);
}
```

----------------------------------------

TITLE: Using Await Message Component in Discord.js
DESCRIPTION: Awaits a single string select menu interaction from the expected user on a message for up to 60 seconds, deferring the update immediately. It edits the original reply with the selected values upon success or logs a message if no interaction is collected within the time limit.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/popular-topics/collectors.md#_snippet_6

LANGUAGE: javascript
CODE:
```
const { ComponentType } = require('discord.js');

const collectorFilter = i => {
	i.deferUpdate();
	return i.user.id === interaction.user.id;
};

message.awaitMessageComponent({ filter: collectorFilter, componentType: ComponentType.StringSelect, time: 60_000 })
	.then(interaction => interaction.editReply(`You selected ${interaction.values.join(', ')}!`))
	.catch(err => console.log('No interactions were collected.'));
```

----------------------------------------

TITLE: Responding to Slash Command with Basic Reply (discord.js)
DESCRIPTION: This code snippet shows how to use the `interaction.reply()` method within a discord.js slash command's `execute` function. It sends a simple text message ("Pong!") back to the user who issued the command. This is the standard way to acknowledge and respond immediately to an interaction, confirming receipt to Discord.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/slash-commands/response-methods.md#_snippet_0

LANGUAGE: javascript
CODE:
```
module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
	async execute(interaction) {
		await interaction.reply('Pong!');
	},
};
```

----------------------------------------

TITLE: Fetching Property Values Across Shards - JavaScript
DESCRIPTION: This code demonstrates using the `fetchClientValues` method from `client.shard` to get a specific property (`guilds.cache.size`) from the Client object of every running shard. It returns a promise that resolves with an array containing the value of the specified property for each shard. Useful for gathering simple, comparable data from all shards.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/sharding/README.md#_snippet_2

LANGUAGE: javascript
CODE:
```
client.shard.fetchClientValues('guilds.cache.size').then(console.log);
```

----------------------------------------

TITLE: Sending Discord.js Buttons in Reply (JavaScript)
DESCRIPTION: This code demonstrates how to group Discord.js buttons into an `ActionRowBuilder` and then include that action row in the `components` property of an `interaction.reply`. This sends the buttons along with a message to the user, allowing them to interact with the command's output.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/message-components/buttons.md#_snippet_1

LANGUAGE: javascript
CODE:
```
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');

module.exports = {
	// data: new SlashCommandBuilder()...
	async execute(interaction) {
		const target = interaction.options.getUser('target');
		const reason = interaction.options.getString('reason') ?? 'No reason provided';

		const confirm = new ButtonBuilder()
			.setCustomId('confirm')
			.setLabel('Confirm Ban')
			.setStyle(ButtonStyle.Danger);

		const cancel = new ButtonBuilder()
			.setCustomId('cancel')
			.setLabel('Cancel')	
			.setStyle(ButtonStyle.Secondary);

		const row = new ActionRowBuilder()
			.addComponents(cancel, confirm);

		await interaction.reply({
			content: `Are you sure you want to ban ${target} for reason: ${reason}?`,
			components: [row],
		});
	},
};
```

----------------------------------------

TITLE: Implementing Currency Helper Functions JavaScript
DESCRIPTION: This snippet defines core helper functions for managing user currency. The `addBalance` function updates a user's balance in both the in-memory cache (Collection) and the database (`Users` model), creating a new user entry if none exists. The `getBalance` function safely retrieves a user's balance from the cache, returning 0 if the user is not found in the cache.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/sequelize/currency.md#_snippet_6

LANGUAGE: JavaScript
CODE:
```
async function addBalance(id, amount) {
	const user = currency.get(id);

	if (user) {
		user.balance += Number(amount);
		return user.save();
	}

	const newUser = await Users.create({ user_id: id, balance: amount });
	currency.set(id, newUser);

	return newUser;
}

function getBalance(id) {
	const user = currency.get(id);
	return user ? user.balance : 0;
}
```

----------------------------------------

TITLE: Creating Basic Reaction Collector in Discord.js
DESCRIPTION: Creates a reaction collector on a message that listens for '👍' reactions specifically from the original message author for 15 seconds. It logs collected reactions and the total count when the collector ends.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/popular-topics/collectors.md#_snippet_3

LANGUAGE: javascript
CODE:
```
const collectorFilter = (reaction, user) => {
	return reaction.emoji.name === '👍' && user.id === message.author.id;
};

const collector = message.createReactionCollector({ filter: collectorFilter, time: 15_000 });

collector.on('collect', (reaction, user) => {
	console.log(`Collected ${reaction.emoji.name} from ${user.tag}`);
});

collector.on('end', collected => {
	console.log(`Collected ${collected.size} items`);
});
```

----------------------------------------

TITLE: Adding Component Handling to interactionCreate (Discord.js)
DESCRIPTION: Extends the `interactionCreate` event handler by adding `else if` blocks to specifically check if the interaction is a button (`isButton`) or a string select menu (`isStringSelectMenu`). This structure allows implementing dedicated logic for permanent component interactions.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/message-components/interactions.md#_snippet_5

LANGUAGE: javascript
CODE:
```
const { Events } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				await command.execute(interaction);
			} catch (error) {
				console.error(`Error executing ${interaction.commandName}`);
				console.error(error);
			}
		} else if (interaction.isButton()) {
			// respond to the button
		} else if (interaction.isStringSelectMenu()) {
			// respond to the select menu
		}
	},
};
```

----------------------------------------

TITLE: Playing Audio Resource and Subscribing Connections - Discord.js
DESCRIPTION: Shows how to create an audio resource and play it using the `player.play()` method. It also demonstrates how multiple voice connections (`connection1`, `connection2`) can subscribe to the same audio player using `subscribe(player)` to receive its audio. Requires `createAudioResource` and existing voice connection instances.
SOURCE: https://github.com/discordjs/guide/blob/main/guide/voice/audio-player.md#_snippet_3

LANGUAGE: js
CODE:
```
const resource = createAudioResource('/home/user/voice/track.mp3');
player.play(resource);

// Play "track.mp3" across two voice connections
connection1.subscribe(player);
connection2.subscribe(player);
```