import { ProjectViewModel, SceneViewModel, MenuItemViewModel } from '../../js/view-models';
import { MatDialog } from '@angular/material';
import { RenameComponent } from '../utility/rename.component';
import { notify } from '../../js/utility/ng-notify';
import { VideoResourceViewModel } from "../../js/view-models/editor/video-resource-view-model"
import * as ng from '@angular/core';
import { DBService } from '../db.service';
import { DelegateCommand } from '../../js/utility/command';
import { cachedGetter } from '../../js/utility/decorators';
import { fileUpload } from '../../js/utility/file-utility';
import { ShellDialogComponent, ShellDialogComponentData } from '../utility/shell-dialog.component';
import { FancyDialogsService } from '../utility/fancy-dialogs.service';
import * as afd from '../../js/view-models/editor/affordances';
import { SelectOptionComponent, SOCParameters, SelectOptionComponentParameters } from './select-option.component';

@ng.Component({
	selector: 'cvr-editor-project',
	template: require('./project.component.html'),
	styles: []
})
export class ProjectComponent
{
	get videoResources(): ReadonlyArray<VideoResourceViewModel> { return this.db.videoResources; }
	@ng.Input() project: ProjectViewModel;

	/** Gets or sets the currently inspected item, i.e. whose properties are to be shown. */
	@notify()
	@ng.Input() inspectedItem: any | null;
	@ng.Output() inspectedItemChange = new ng.EventEmitter<any>();

	/** Gets the item to display in the details view if any. Relies on the DetailsType interface. */
	@cachedGetter<ProjectComponent>(p => p.inspectedItem)
	get detailsItem(): any | null
	{
		const item = this.inspectedItem;
		if (item == null)
			return null;

		// Else assume item in project tree -> walk up the tree
		let current = item;
		while (current != null && current.detailsType == null)
			current = current.parent;

		return current;
	}

	/** Gets the current scene if any. */
	@cachedGetter<ProjectComponent>(p => p.inspectedItem)
	get currentScene(): SceneViewModel | null
	{
		const item = this.inspectedItem;
		if (item == null)
			return null;

		// Else assume item in project tree -> walk up the tree
		let current = item;
		while (current instanceof SceneViewModel == false && current != null)
			current = current.parent;

		return current;
	}

	/** Gets a video source to display. */
	@cachedGetter<ProjectComponent>(p => [
		p.detailsItem,
		p.currentScene == null ? null : p.currentScene.videoSrc
	])
	get videoSrc(): string | undefined
	{
		const item = this.detailsItem;
		if (item == null)
			return "";

		// If video resource, return source directly.
		if (item instanceof VideoResourceViewModel || item instanceof SceneViewModel)
			return item.videoSrc;

		return "";
	}

	readonly videoResourcesContextMenu: MenuItemViewModel<VideoResourceViewModel>[] = [
		{
			label: "Delete",
			icon: "delete",
			command: new DelegateCommand(async item =>
			{
				if (await this.fancyDialogs.confirm("Are you sure you want to delete this video?"))
					this.db.videoResourceDelete(item);
			})
		}
	];

	constructor(
		private dialog: MatDialog,
		private componentFactoryResolver: ng.ComponentFactoryResolver,
		private injector: ng.Injector,
		public db: DBService,
		private fancyDialogs: FancyDialogsService
	)
	{
	}

	async renameScene(scene: SceneViewModel)
	{
		const dialogRef = this.dialog.open(ShellDialogComponent, {
			data: <ShellDialogComponentData>{
				title: "Rename Scene?",
				hasCancel: true,
				component: () => ({
					factory: this.componentFactoryResolver.resolveComponentFactory(RenameComponent),
					injector: ng.Injector.create([{ provide: "name", useValue: scene.name }], this.injector)
				})
			}
		});
		const result = await dialogRef.afterClosed().toPromise<RenameComponent | null>();
		if (result == null)
			return;

		scene.name = result.name;
	}

	async videoUpload()
	{
		const files = await fileUpload("video/*", true);

		for (const file of Array.from(files))
		{
			await this.db.videoResourceAdd(file);
		}
	}

	async affordanceAdd()
	{
		const dialogRef = this.dialog.open(ShellDialogComponent, {
			data: <ShellDialogComponentData>{
				title: "Select Affordance Type",
				hasCancel: true,
				component: () => ({
					factory: this.componentFactoryResolver.resolveComponentFactory(SelectOptionComponent),
					injector: ng.Injector.create([
						{ provide: SOCParameters, useValue: <SelectOptionComponentParameters<afd.AffordanceType>>{
							label: "Affordance Type",
							value: "shape",
							options: [
								{ label: "Shapes", value: "shape" },
								{ label: "Cursor", value: "cursor" },
								{ label: "Lines", value: "line" },
								{ label: "Halos", value: "halo" },
								{ label: "Edge Indicators", value: "edge-indicator" },
							]
						} }
					], this.injector)
				})
			}
		});
		const result = await dialogRef.afterClosed().toPromise<SelectOptionComponent<afd.AffordanceType> | null>();
		if (result == null)
			return;

		let affordance: afd.AffordanceViewModel;
		switch (result.value)
		{
			case "shape":
				affordance = new afd.ShapeAffordanceViewModel(this.project);
				break;
			case "cursor":
				affordance = new afd.CursorAffordanceViewModel(this.project);
				break;
			case "line":
				affordance = new afd.LineAffordanceViewModel(this.project);
				break;
			case "halo":
				affordance = new afd.HaloAffordanceViewModel(this.project);
				break;
			case "edge-indicator":
				affordance = new afd.EdgeIndicatorAffordanceViewModel(this.project);
				break;
			default:
				throw new Error(`Unhandled type: ${result.value}`);
		}

		this.project.affordances.push(affordance);

		this.inspectedItem = affordance;
	}
}