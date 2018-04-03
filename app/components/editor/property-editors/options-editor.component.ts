import * as ng from "@angular/core";
import { PropertyEditorBase } from "./property-editor-base";

/**
 * Key for injecting the options for the select list. Type: A function that is passed the object instance and returns {@link OptionsEditorOption[]} or a provider ({@link OptionProvider}).
 */
export const PESelectOptions = "pe-select-options";

@ng.Component({
	selector: 'cvr-options-editor',
	template: `
		<select [(ngModel)]="value" style="width: 100%">
			<option *ngFor="let option of optionsFactory(instance)"
				[ngValue]="option.value"
				[label]="option.label"></option>
		</select>
	`
})
export class OptionsEditorComponent<T> extends PropertyEditorBase
{
	optionsFactory: (instance: any) => OptionsEditorOption<T>[];

	constructor(@ng.Inject(ng.Injector) injector: ng.Injector)
	{
		super(injector);

		const provider = <() => OptionsEditorOption<T>[] | OptionProvider<T>> injector.get(PESelectOptions);
		if (typeof provider == "function")
			this.optionsFactory = <(instance: any) => OptionsEditorOption<T>[]>provider;
		else
			this.optionsFactory = () => (<OptionProvider<T>>provider).options;

		//TODO if optgroup is used, transform option list to tree, grouping by optgroup
	}
}

export type OptionsEditorOption<T> = { label: string, value?: T, optGroup?: string }

export interface OptionProvider<T>
{
	// Property that returns the options to be used.
	options: OptionsEditorOption<T>[];
}