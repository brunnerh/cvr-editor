import * as ng from "@angular/core";
import { PropertyEditorBase } from "./property-editor-base";

@ng.Component({
	selector: 'cvr-string-editor',
	template: `
		<input type="text" [(ngModel)]="value" style="width: 100%"/>`
})
export class StringEditorComponent extends PropertyEditorBase
{
	constructor( @ng.Inject(ng.Injector) injector: ng.Injector)
	{
		super(injector);

	}
}