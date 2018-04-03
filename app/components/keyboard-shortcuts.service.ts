import * as ng from "@angular/core";
import { CommandsService } from "./commands.service";

export interface KeyboardShortcutRegistration
{
	/** Name of the command. */
	command: string;
	/** Key for the command. */
	key: string;
	/** Whether Ctrl should be pressed. */
	ctrl: boolean;
	/** Whether Shift should be pressed. */
	shift: boolean;
	/** Whether Alt should be pressed. */
	alt: boolean;
	/** Deferred arguments that should be passed to the command upon invocation. */
	args: () => any;
	/** Gets the gesture for the shortcut in string form. */
	gesture: string;
}

@ng.Injectable()
export class KeyboardShortcutsService
{
	private _kbShortcuts: KeyboardShortcutRegistration[] = [];

	constructor(
		@ng.Inject('window') window: Window,
		commandsService: CommandsService
	)
	{
		window.addEventListener("keydown", e =>
			this._kbShortcuts.forEach(sc =>
			{
				if (e.key == sc.key && e.ctrlKey === sc.ctrl && e.altKey === sc.alt && e.shiftKey === sc.shift)
				{
					const command = commandsService.getCommand(sc.command)!.command;
					if (command == null)
						throw new Error(`Command "${sc.command}" not found.`);

					const args = sc.args();
					if (command.canExecute(args))
						command.execute(args);

					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();
				}
			})
		);
	}

	/**
	 * Registers a keyboard shortcut.
	 * 
	 * @param command The name of the command to execute. Commands are registered via the commands service.
	 * @param key The key to be pressed to invoke the command. Should be sensitive to modifiers, i.e. "A" for Shift+A. Shift argument has to match accordingly.
	 * @param ctrl If the Ctrl modifier has to be pressed.
	 * @param alt If the Alt modifier has to be pressed.
	 * @param shift If the Shift modifier has to be pressed.
	 * @param args A function that returns the arguments with which the command should be invoked.
	 */
	registerShortcut(
		command: string,
		key: string,
		ctrl: boolean = false,
		alt: boolean = false,
		shift: boolean = false,
		args: () => any = () => null
	)
	{
		let existing = this._kbShortcuts.filter(sc => sc.key == key && sc.ctrl == ctrl && sc.alt == alt && sc.shift == shift);
		if (existing.length > 0)
		{
			console.error(`Keyboard shortcut with gesture ${existing[0].gesture} already registered for command ${existing[0].command}.`);
			return;
		}

		this._kbShortcuts.push({
			command, key, ctrl, alt, shift, args,
			get gesture()
			{
				return `${(this.ctrl ? "Ctrl+" : "")}${(this.alt ? "Alt+" : "")}${(this.shift ? "Shift+" : "")}${this.key.toUpperCase()}`;
			}
		});
	}

	/** Gets the keyboard shortcut registration for a given command if any. */
	getShortcut(command: string): KeyboardShortcutRegistration | null
	{
		for (const c of this._kbShortcuts)
			if (c.command == command)
				return c;

		return null;
	}

	/** Gets the list of registered shortcuts. */
	getShortcuts(): ReadonlyArray<KeyboardShortcutRegistration>
	{
		return this._kbShortcuts;
	}
}