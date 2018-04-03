import { Command } from "../../utility/command";

export interface MenuItemViewModel<T>
{
	/** Label of the menu item. */
	label: string;

	/** Optional icon, should be material icon font name. */
	icon?: string;

	/**
	 * The command to execute upon click.
	 * Can also be a string referring to a command registered with the commands service.
	 */
	command?: Command<T> | string;

	/** Function that gets arguments with which to invoke the command. */
	args?: () => T;

	/** The child items of the menu item. */
	children?: MenuItemViewModel<any>[];
}