import * as ng from "@angular/core";
import { PropertyEditorBase } from "./property-editor-base";

/**
 * Key for injecting the options for the select list. Type: A function that is passed the object instance and returns {@link OptionsEditorOption[]} or a provider ({@link OptionProvider}).
 */
export const PEColorOptions = "pe-color-options";

@ng.Component({
	selector: 'cvr-color-editor',
	template: `
		<div class="flex-container center-items" style="width: 100">
			<input type="checkbox" *ngIf="options.nullable" [(ngModel)]="isEnabled"/>
			<input type="color" class="flex-star" [(ngModel)]="value" [disabled]="isEnabled == false"/>
		</div>
	`
})
export class ColorEditorComponent extends PropertyEditorBase
{
	private _isEnabled: boolean;
	get isEnabled() { return this._isEnabled; }
	set isEnabled(value: boolean)
	{
		this._isEnabled = value;
		this.value = value ? this.color : null;
	}

	private _color: string = "808080";
	get color() { return this._color; }
	set color(value: string)
	{
		this._color = value;
		this.value = value;
	}


	options = <ColorEditorOptions>{
		nullable: false
	};

	constructor(@ng.Inject(ng.Injector) injector: ng.Injector)
	{
		super(injector);

		const options = <ColorEditorOptions>injector.get(PEColorOptions);
		Object.assign(this.options, options);

		this._isEnabled = this.options.nullable == false || this.value != null;
	}
}

export interface ColorEditorOptions
{
	/** Gets or sets whether the color can be disabled, yielding null as the property value. Default: false. */
	nullable?: boolean;
}