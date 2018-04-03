import * as ng from "@angular/core";

/**
 * Dynamically injects a component into the host element.
 */
@ng.Directive({
	selector: "[inject-component]",
})
export class InjectComponentDirective implements ng.OnInit
{
	/**
	 * An object that holds objects relevant to the construction of the injected component.
	 */
	@ng.Input("inject-component") componentDescriptor: ComponentInjectionDescriptor;

	private _component: ng.ComponentRef<any> | null = null;
	/** Gets the component created from the descriptor. */
	get component() { return this._component; }

	constructor(
		private vcr: ng.ViewContainerRef
	)
	{
	}

	ngOnInit(): void
	{
		this.vcr.clear();
		this._component = this.vcr.createComponent(
			this.componentDescriptor.factory,
			undefined,
			this.componentDescriptor.injector,
			undefined,
			this.componentDescriptor.module
		);
	}
}

export interface ComponentInjectionDescriptor
{
	/** The component factory for the given component. */
	factory: ng.ComponentFactory<any>;

	/**
	 * Injector instance used for the creation of the component, if any.
	 * Can be used to inject values required by the component.
	 */
	injector?: ng.Injector;

	/**
	 * Module instance used for the creation of the component, if any.
	 */
	module?: ng.NgModuleRef<any>;
}