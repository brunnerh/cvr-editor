import * as ng from "@angular/core";
import { PropertyEditorBase } from "./property-editor-base";

/**
 * Key for injecting the options for the number editor. Type: A function that is passed the object instance & property value and returns {@link PENumberOptions}.
 */
export const PENumberOptions = "pe-number-options";

@ng.Component({
	selector: 'cvr-number-editor',
	template: `
		<input type="number"
			style="width: 100%"
			[min]="options.min"
			[max]="options.max"
			[step]="options.step"
			[(ngModel)]="value"/>
	`
})
export class NumberEditorComponent extends PropertyEditorBase
{
	options: NumberEditorOptions;

	constructor(injector: ng.Injector)
	{
		super(injector);

		const optionsFactory = <(instance: any, value: any) => NumberEditorOptions>injector.get(PENumberOptions, () => { });
		let options = optionsFactory(this.instance, this.value);

		if (options == null)
			options = {};
		if (options.min == null)
			options.min = "";
		if (options.max == null)
			options.max = "";
		if (options.step == null)
			options.step = "";

		this.options = options;
	}
}

export interface NumberEditorOptions
{
	/**
	 * The minimal value. Default: ""
	 */
	min?: string;
	/**
	 * The minimal value. Default: ""
	 */
	max?: string;
	/**
	 * The step applied when incrementing/decrementing the value. Default: ""
	 */
	step?: string;
}