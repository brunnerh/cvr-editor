import "reflect-metadata";
import { PropertyEditorBase } from "./property-editors/property-editor-base";
import { ComponentInjectionDescriptor } from "../utility/inject-component.directive";
import { cachedGetter } from "../../js/utility/decorators";
import * as ng from "@angular/core";

/** Dependency injection key for the property editor object instance. */
export const PEInstance = "pe-instance";
/** Dependency injection key for the property editor property key. */
export const PEProperty = "pe-property";

/**
 * Component that enumerates a given item's properties and provides editors for those decorated with
 * the {@link editorProperty} decorator.
 */
@ng.Component({
	selector: 'cvr-editor-properties',
	template: require('./properties.component.html'),
	styles: [require('./properties.component.less')],
})
export class PropertiesComponent
{
	/** Gets or sets a value indicating whether the header should be shown. Default: true */
	@ng.Input() showHeader: boolean = true;

	/** Gets or sets the item that is being inspected/edited. */
	@ng.Input() item: any | null = null;

	@cachedGetter<PropertiesComponent>(self => self.item)
	get properties()
	{
		if (this.item == null)
			return [];

		const properties = Object.getOwnPropertyNames(this.item)
			.concat(...Object.getOwnPropertyNames(Object.getPrototypeOf(this.item)));

		return properties.map(property =>
		{
			let meta = editorPropertyInfo(this.item, property);
			if (meta == null)
				return null;

			if (meta.dependencies == null)
				meta.dependencies = [];

			// Create new injector that can inject the item instance and property dependencies into the
			// newly created property editor component.
			const propertyInjector = ng.Injector.create(meta.dependencies.slice().concat(
				{ provide: PEInstance, useValue: this.item },
				{ provide: PEProperty, useValue: property }
			), this.injector);

			return {
				instance: this.item,
				property: property,
				label: meta.label,
				// editorFactory: editorComponentFactory
				editorFactory: <ComponentInjectionDescriptor>{
					factory: this.resolver.resolveComponentFactory<any>(meta.editor()),
					injector: propertyInjector
				},
				options: meta.options
			}
		})
		.filter(x => x != null)
		.sort((a, b) => a!.options.sortOrder! - b!.options.sortOrder!);
	}

	constructor(
		@ng.Inject(ng.Injector) private injector: ng.Injector,
		@ng.Inject(ng.ComponentFactoryResolver) private resolver: ng.ComponentFactoryResolver
	)
	{

	}
}

const key = Symbol("properties-editor-property");
/**
 * Marks a property for editing in the property editor section of the editor.
 * 
 * @param label The label for the property in the view.
 * @param editor The component type that should be instantiated to edit the property. Resolved as a function to prevent module loading issues.
 * @param dependencies Additional dependencies that are required by the editor for the property. Check respective editor class documentation.
 */
export function editorProperty<T extends typeof PropertyEditorBase>(
	label: string | null,
	editor: () => T,
	dependencies: ng.StaticProvider[] = [],
	options?: EditorPropertyOptions
)
{
	if (options == null)
		options = {};
	if (options.fullRow == null)
		options.fullRow = false;
	if (options.sortOrder == null)
		options.sortOrder = 0;
	if (options.tooltip == null)
		options.tooltip = undefined;

	return Reflect.metadata(key, <EditorPropertyMetadata<T>>{
		label: label,
		editor: editor,
		dependencies: dependencies,
		options: options
	});
}
function editorPropertyInfo(instance: any, property: string): EditorPropertyMetadata<any>
{
	return Reflect.getMetadata(key, instance, property);
}

interface EditorPropertyOptions
{
	/** Gets or sets a value indicating whether the editor should be placed on a new row. Default: false */
	fullRow?: boolean;
	/** Gets or sets the sort order of a property, properties with lower value are displayed earlier. Default: 0 */
	sortOrder?: number;
	/** Gets or sets the tooltip of a property. Default: undefined */
	tooltip?: string;
}

interface EditorPropertyMetadata<T extends typeof PropertyEditorBase>
{
	label: string | null;
	editor: () => T;
	dependencies: ng.StaticProvider[];
	options: EditorPropertyOptions;
}