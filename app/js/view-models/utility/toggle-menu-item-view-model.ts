import * as ng from "@angular/core";
import { MenuItemViewModel } from "./menu-item-view-model";
import { Command } from "../../utility/command";
import { notify } from "../../utility/ng-notify";

/**
 * Represents a menu item that can be toggled.
 * It takes care of the command implementation and sets the appropriate icon automatically.
 */
export class ToggleMenuItemViewModel implements MenuItemViewModel<null>
{
	// (Ordering matters here, because isChecked is set and the event has to be present.)
	isCheckedChange = new ng.EventEmitter<boolean>();
	/** Gets a value indicating whether the menu item is checked. */
	@notify()
	isChecked = true;

	get icon() { return this.isChecked ? "check_box" : "check_box_outline_blank"; }

	/** The command implementation for the toggle action. */
	commandImpl: Command<null>;

	command: Command<null> | string;

	/**
	 * Creates a new menu item that can be toggled.
	 * 
	 * @param label The label for the menu item.
	 * @param commandName A command name that should be used to expose the command.
	 *                    This allows the menu component to resolve keyboard gesture indications if a gesture
	 *                    is registered in the keyboard shortcuts service.
	 */
	constructor(public label: string, public commandName?: string)
	{
		const self = this;
		
		this.commandImpl = {
			execute() { self.isChecked = !self.isChecked },
			canExecute() { return true; }
		}

		this.command = commandName ? commandName : this.commandImpl;
	}
}