import * as ng from "@angular/core";
import { MenuItemViewModel } from "../../js/view-models/utility/menu-item-view-model";
import { CommandsService } from "../commands.service";
import { KeyboardShortcutsService } from "../keyboard-shortcuts.service";

@ng.Component({
	selector: "cvr-menu-item",
	template: `
		<!-- Button contents -->
		<ng-template #contentTemplate>
			<span class="flex-container center-items">
				<mat-icon class="flex-constant" *ngIf="item.icon != null">{{ item.icon }}</mat-icon>
				<span class="flex-star">{{ item.label }}</span>
				<span class="flex-constant ml-20 keyboard-gesture">{{ gesture }}</span>
			</span>
		</ng-template>

		<!-- Leaf button -->
		<button *ngIf="item.children == null" mat-menu-item
			(click)="executeCommand()"
			[disabled]="enabled == false">
			<ng-container *ngTemplateOutlet="contentTemplate"></ng-container>
		</button>
		<!-- Node button -->
		<ng-container *ngIf="item.children != null">
			<button mat-menu-item
				[matMenuTriggerFor]="subMenu">
				<ng-container *ngTemplateOutlet="contentTemplate"></ng-container>
			</button>

			<mat-menu #subMenu="matMenu">
				<cvr-menu-item *ngFor="let child of item.children" [item]="child"></cvr-menu-item>
			</mat-menu>
		</ng-container>
	`,
	styles: [
		`
		.keyboard-gesture
		{
			opacity: 0.5;
			font-size: smaller;
		}
		`
	]
})
export class MenuItemComponent
{
	/** The view-model to render. */
	@ng.Input() item: MenuItemViewModel<any>;

	/** Provides arguments for the menu item command, if none are supplied by the menu item itself. */
	@ng.Input() args?: any;

	/** Gets arguments from menu item or local override, if any. */
	private getArgs = () => this.item.args ? this.item.args()
		: (this.args ? this.args : null);
	
	/** Gets the command for the item. Resolves name references. */
	private get command()
	{
		const command = this.item.command;

		if (command == null)
			return null;

		return typeof command == "string" ?
			this.commandsService.getCommand(command)!.command : command;
	}

	/**
	 * Gets whether the menu item should be enabled.
	 */
	get enabled()
	{
		return this.command!.canExecute(this.getArgs());
	}

	/**
	 * Gets the keyboard gesture associated with the command.
	 */
	get gesture()
	{
		const command = this.item.command;
		if (command == null)
			return null;

		if (typeof command == "string")
		{
			const registration = this.keyboardShortcutsService.getShortcut(command)
			if (registration == null)
				return null;

			return registration.gesture;
		}

		return null;
	}

	constructor(
		private commandsService: CommandsService,
		private keyboardShortcutsService: KeyboardShortcutsService
	)
	{
	}

	executeCommand()
	{
		const command = this.item.command!;
		const args = this.getArgs();
		let commandImpl = typeof command == "string" ?
			this.commandsService.getCommand(command)!.command : command;

		if (commandImpl.canExecute(args))
			commandImpl.execute(args);
	}
}