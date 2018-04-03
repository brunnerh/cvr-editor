import * as ng from "@angular/core"
import { PEProperty, PEInstance } from "../properties.component";

export class PropertyEditorBase
{
	/** Gets the instance owning the property to be edited. */
	instance: any;
	/** Gets the name of the property to be edited. */
	property: string;
	
	get value() { return this.instance[this.property] }
	set value(value: any) { this.instance[this.property] = value }

	constructor(
		injector: ng.Injector
	)
	{
		this.instance = injector.get(PEInstance);
		this.property = injector.get(PEProperty);
	}
}