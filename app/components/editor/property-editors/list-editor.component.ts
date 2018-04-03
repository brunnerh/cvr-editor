import * as ng from "@angular/core";
import { PropertyEditorBase } from "./property-editor-base";
import { MenuItemViewModel } from "../../../js/view-models/utility/menu-item-view-model";
import { DelegateCommand } from "../../../js/utility/command";
import { cachedGetter } from "../../../js/utility/decorators";

/**
 * Key for injecting the options for the select list. Type: A function that is passed the object instance & property value and returns {@link ListEditorOptions}.
 */
export const PEListOptions = "pe-list-options";

@ng.Component({
	selector: 'cvr-list-editor',
	template: `
		<ng-container *ngFor="let item of value; index as i">
			<div>{{ i + 1 }}:</div>
			<cvr-editor-properties
				[showHeader]="false"
				[item]="item">
			</cvr-editor-properties>

			<ng-container *ngIf="hasMenu">
				<div>
					<mat-menu #subMenu="matMenu">
						<cvr-menu-item *ngFor="let menuItem of menuItems"
							[item]="menuItem"
							[args]="item">
						</cvr-menu-item>
					</mat-menu>
				</div>
				<button mat-icon-button [matMenuTriggerFor]="subMenu">
					<mat-icon>more_horiz</mat-icon>
				</button>
			</ng-container>
		</ng-container>

		<ng-container *ngIf="options.createItem">
			<div></div>
			<button mat-raised-button (click)="createItem()">
				<mat-icon>add</mat-icon>
			</button>
		</ng-container>
	`,
	styles: [`
		:host
		{
			display: grid;
			grid-template-columns: min-content auto;
			grid-template-rows: repeat(auto-fill, min-content);
			grid-row-gap: 5px;
			grid-column-gap: 5px;
		}
	`]
})
export class ListEditorComponent extends PropertyEditorBase
{
	options: ListEditorOptions;

	private get list()
	{
		return <any[]>this.value;
	}

	get hasMenu()
	{
		return this.options.canDelete || this.options.replaceItem != null;
	}

	@cachedGetter()
	get menuItems(): MenuItemViewModel<any>[]
	{
		const items: MenuItemViewModel<any>[] = [];
		if (this.options.canDelete)
			items.push({
				label: "Delete",
				command: new DelegateCommand<any>((listItem: any) =>
					this.list.splice(this.list.indexOf(listItem), 1)
				)
			});

		if (this.options.replaceItem != null)
			items.push({
				label: "Replace",
				command: new DelegateCommand<any>(async (listItem: any) =>
				{
					// TODO: test replacing
					const newItem = await this.options.replaceItem!(listItem);
					if (newItem == null)
						return;

					this.list.splice(this.list.indexOf(listItem), 1, newItem);
				})
			})

		return items;
	}

	constructor(injector: ng.Injector)
	{
		super(injector);

		const optionsFactory = <(instance: any, value: any) => ListEditorOptions>injector.get(PEListOptions, () => {});
		const options = optionsFactory(this.instance, this.value);
		if (options.canDelete == null)
			options.canDelete = true;

		this.options = options;
	}

	async createItem()
	{
		const list = <any[]>this.value;
		const newItem = await this.options.createItem!();
		if (newItem != null)
			list.push(newItem);
	}
}

export interface ListEditorOptions
{
	/** Factory for a new item instance, returns null on cancel. If this function is provided new items can be added. */
	createItem?: () => Promise<any | null>,

	/**
	 * Function that replaces a given item, returns null on cancel. If this function is provided items can be replaced.
	 * @param item Existing item to be replaced.
	 */
	replaceItem?: (item: any) => Promise<any | null>,

	/** Gets or sets whether items can be deleted. Default: true. */
	canDelete?: boolean;
}