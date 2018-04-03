import * as ng from "@angular/core";
import { PropertyEditorBase } from "./property-editor-base";

/** Component that creates a properties editor for the property. */
@ng.Component({
	selector: 'cvr-recursive-editor',
	template: `
		<cvr-editor-properties
			[item]="value"
			[showHeader]="false">
		</cvr-editor-properties>
	`
})
export class RecursiveEditorComponent extends PropertyEditorBase
{
	constructor( @ng.Inject(ng.Injector) injector: ng.Injector)
	{
		super(injector);

	}
}