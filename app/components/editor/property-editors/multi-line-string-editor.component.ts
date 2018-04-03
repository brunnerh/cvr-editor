import * as ng from "@angular/core";
import { PropertyEditorBase } from "./property-editor-base";

@ng.Component({
	selector: 'cvr-multi-line-string-editor',
	template: `
		<textarea [(ngModel)]="value" style="width: 100%"></textarea>`
})
export class MultiLineStringEditorComponent extends PropertyEditorBase
{
	constructor( @ng.Inject(ng.Injector) injector: ng.Injector)
	{
		super(injector);

	}
}