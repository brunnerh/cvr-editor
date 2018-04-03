import { Component, Input, Output, ContentChild } from "@angular/core";
import * as ng from "@angular/core";
import { notify } from "../../js/utility/ng-notify";
import { MenuItemViewModel } from "../../js/view-models";

/**
 * Component for list templating.
 * 
 * See property documentation.
 */
@Component({
	selector: 'cvr-list-view',
	template: require("./list-view.component.html"),
	styles: [ require("./list-view.component.less") ]
})
export class ListViewComponent<T>
{
	/** Gets or sets the items to template. */
	@Input() items: T[];

	/** Sets a {@link ng.TrackByFunction<T>} to be applied to the ngFor directive. */
	@Input() trackBy: ng.TrackByFunction<T>;

	/** Gets or sets the selected item. */
	@notify()
	@Input() selectedItem: T | null = null;
	@Output() selectedItemChange = new ng.EventEmitter<T>();

	/**
	 * Sets the template for the items. Specify the item template as an ng-template child element, with an implicit 'let' declaration for the current item. The template should be referenced as "itemTemplate".
	 * 
	 * e.g.
	 * <ng-template #itemTemplate let-item>
	 * 	Name: {{ item.name }}
	 * </ng-template>
	 */
	@ContentChild("itemTemplate") itemTemplate: ng.TemplateRef<any>;

	/**
	 * Similar to {@link itemTemplate} but this is inserted after the item template, thus outside the selection area.
	 */
	@ContentChild("detailsTemplate") detailsTemplate: ng.TemplateRef<any>;

	/**
	 * Sets the context menu for the items if any.
	 */
	@Input() contextMenu: MenuItemViewModel<T>[] | null = null;

	/**
	 * Sets whether drag and drop sorting of items is enabled. Default: false
	 */
	@Input() dragSortingEnabled = false;

	/** Sets what drag and drop zones this list belongs to. Set to a unique string to prevent item dragging into other list views. */
	@Input() dropZones: Array<string> = [];
}