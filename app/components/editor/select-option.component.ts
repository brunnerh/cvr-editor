import * as ng from "@angular/core";

/** Injection key for parameters, provided value has type {@link SelectOptionComponentParameters}. */
export const SOCParameters = "SelectOptionsComponentParameters";

/**
 * Generic shell dialog component for selecting among several options.
 * Requires injection of parameters ({@link SOCParameters}).
 */
@ng.Component({
	selector: "cvr-select-option",
	template: `
		<form>
			<mat-form-field [color]="'accent'">
				<mat-select [placeholder]="placeholder" [(value)]="value">
					<mat-option *ngFor="let option of options" [value]="option.value">
						{{ option.label }}
					</mat-option>
				</mat-select>
			</mat-form-field>
		</form>
	`
})
export class SelectOptionComponent<T>
{
	placeholder = "Options";

	value: T;

	options: { label: string, value: T }[];

	constructor(injector: ng.Injector)
	{
		const params = <SelectOptionComponentParameters<T> | null>injector.get(SOCParameters, null);
		if (params == null)
			throw new Error("Injections of parameters is required for this component.");

		if (params.label != null)
			this.placeholder = params.label;

		if (params.options == null)
			throw new Error("Parameter 'options' is required for this component.");
		else
			this.options = params.options;

		if (params.value != null)
			this.value = params.value;
		else
			this.value = this.options[0].value;
	}
}

export interface SelectOptionComponentParameters<T>
{
	/** The label for the select list. */
	label?: string;

	/** The selected default value. */
	value?: T;

	/** The list of all options. Required. */
	options: { label: string, value: T }[];
}