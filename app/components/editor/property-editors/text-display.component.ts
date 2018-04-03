import * as ng from "@angular/core";
import { PropertyEditorBase } from "./property-editor-base";

@ng.Component({
	selector: 'cvr-text-display',
	template: `
		<div>{{ value }}</div>
	`
})
export class TextDisplayComponent extends PropertyEditorBase
{
	constructor( @ng.Inject(ng.Injector) injector: ng.Injector)
	{
		super(injector);
	}
}