import * as ng from "@angular/core";
import { PropertyEditorBase } from "./property-editor-base";

@ng.Component({
	selector: 'cvr-boolean-editor',
	template: `
		<input type="checkbox" [(ngModel)]="value"/>`
})
export class BooleanEditorComponent extends PropertyEditorBase
{
	constructor( @ng.Inject(ng.Injector) injector: ng.Injector)
	{
		super(injector);

	}
}