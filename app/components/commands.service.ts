import * as ng from "@angular/core";
import { Command } from "../js/utility/command";

export interface CommandRegistration
{
	/** The name of the command. */
	name: string;

	/** The description of the command if any. */
	description?: string;

	/** The command implementation. */
	command: Command<any>
}

/** Service for registering commands. */
@ng.Injectable()
export class CommandsService
{
	private readonly _commands: CommandRegistration[] = [];

	/**
	 * Registers a new command.
	 * 
	 * @param name Name of the command.
	 * @param command Implementation logic of the command.
	 */
	registerCommand(name: string, command: Command<any>, description?: string)
	{
		if (this._commands.some(c => c.name == name))
		{
			console.error(`Command already registered under given name: ${name}.`);
			return;
		}

		this._commands.push({
			name: name,
			command: command,
			description: description
		});
	}

	/** Gets the command with the given name if any. */
	getCommand(name: string): CommandRegistration | null
	{
		for (const c of this._commands)
			if (c.name == name)
				return c;

		return null;
	}

	getCommands(): ReadonlyArray<CommandRegistration>
	{
		return this._commands;
	}
}