import * as ng from "@angular/core";
import { PropertyEditorBase } from "./property-editor-base";
import { Command } from "../../../js/utility/command";

/**
 * Key for injecting the options for the button. Type: A function that is passed the object instance & property value and returns {@link ButtonDisplayOptions}.
 */
export const PEButtonOptions = 'pe-button-options';

@ng.Component({
	selector: 'cvr-button-display',
	template: `
		<button mat-raised-button (click)="click()">
			<mat-icon *ngIf="options.icon">
				{{ options.icon }}
			</mat-icon>
			{{ options.label }}
		</button>
	`
})
export class ButtonDisplayComponent extends PropertyEditorBase
{
	options: ButtonDisplayOptions;

	constructor(injector: ng.Injector)
	{
		super(injector);

		const optionsFactory = <(instance: any, value: any) => ButtonDisplayOptions>injector.get(PEButtonOptions, () => {});
		const options = optionsFactory(this.instance, this.value);
		if (options.icon == null)
			options.icon = "mode_edit";
		if (options.label == null)
			options.label = "";

		this.options = options;
	}

	click()
	{
		const command = <Command<any>>this.value;
		const args = null; // TODO: args resolution?
		if (command.canExecute(args))
			command.execute(args);
	}
}

export interface ButtonDisplayOptions
{
	/** Material icon name. Default: mode_edit */
	icon?: string;

	/** Button label. Default: <Empty> */
	label?: string;
}