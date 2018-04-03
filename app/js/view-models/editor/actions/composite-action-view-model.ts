import { editorProperty, PEInstance } from "../../../../components/editor/properties.component";
import { TextDisplayComponent, ListEditorComponent, PEListOptions, ListEditorOptions } from "../../../../components/editor/property-editors";
import { addToJSON } from "../../../utility/json";
import { ButtonViewModel } from "../button-view-model";
import { cachedGetter } from "../../../utility/decorators";
import { SceneViewModel } from "../scene-view-model";
import { ActionViewModel, ActionType } from "./action-view-model";
import { DelegateCommand } from "../../../utility/command";
import { ViewerComponent } from "../../../../components/editor/viewer.component";
import { ActionUtility } from "./action-utility";
import * as ng from "@angular/core";
import * as mat from "@angular/material";
import { ShellDialogComponent, ShellDialogComponentData } from "../../../../components/utility/shell-dialog.component";
import { SOCParameters, SelectOptionComponent, SelectOptionComponentParameters } from "../../../../components/editor/select-option.component";

export class CompositeActionViewModel extends ActionViewModel
{
	static deserialize(json: CompositeActionViewModel, parent: ButtonViewModel | SceneViewModel): CompositeActionViewModel
	{
		const action = new CompositeActionViewModel(parent);
		if (json.actions)
			action.actions = json.actions.map(a => ActionUtility.deserialize(parent, a));

		return action;
	}

	readonly type = "composite";

	@editorProperty(null, () => TextDisplayComponent)
	readonly description = "Executes multiple actions.";

	@editorProperty("Actions", () => ListEditorComponent, [
		{
			provide: PEListOptions,
			useFactory: (injector: ng.Injector, dialog: mat.MatDialog, componentFactoryResolver: ng.ComponentFactoryResolver) =>
				() => <ListEditorOptions>{
					createItem: () => CompositeActionViewModel.createAction(injector, dialog, componentFactoryResolver)
				},
			deps: [ng.Injector, mat.MatDialog, ng.ComponentFactoryResolver]
		}
	], {
		fullRow: true,
		tooltip: "The list of actions to execute.",
	})
	actions: ActionViewModel[] = [];

	@cachedGetter()
	get command()
	{
		return new DelegateCommand((viewer: ViewerComponent) =>
			this.actions.forEach(a => a.command.execute(viewer))
		);
	}

	static async createAction(injector: ng.Injector, dialog: mat.MatDialog, componentFactoryResolver: ng.ComponentFactoryResolver)
	{
		const instance = <CompositeActionViewModel>injector.get(PEInstance);
		const dialogRef = dialog.open(ShellDialogComponent, {
			data: <ShellDialogComponentData>{
				title: "Select Action Type",
				hasCancel: true,
				component: () => ({
					factory: componentFactoryResolver.resolveComponentFactory(SelectOptionComponent),
					injector: ng.Injector.create([
						{
							provide: SOCParameters, useValue: <SelectOptionComponentParameters<ActionType>>{
								label: "Action Type",
								value: "change-scene",
								options: ActionUtility.actionTypeOptionsProvider.useValue()
							}
						}
					], injector)
				})
			}
		});
		const result = await dialogRef.afterClosed().toPromise<SelectOptionComponent<ActionType> | null>();
		if (result == null)
			return null;

		return ActionUtility.actionFromType(instance.parent, result.value);
	}
}

addToJSON(CompositeActionViewModel.prototype, "type", "actions");