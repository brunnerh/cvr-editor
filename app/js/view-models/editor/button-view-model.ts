import { editorProperty } from "../../../components/editor/properties.component";
import { StringEditorComponent, RecursiveEditorComponent, ListEditorComponent, PEListOptions, ListEditorOptions, OptionsEditorComponent } from "../../../components/editor/property-editors";
import { SceneViewModel } from "./scene-view-model";
import { TreeNode } from "./tree-node";
import { addToJSON } from "../../utility/json";
import { ShapeViewModel, CircleViewModel } from "./shapes";
import { ActionViewModel } from "./actions";
import { ChangeSceneActionViewModel } from "./actions/change-scene-action-view-model";
import { UVPoint } from "../../utility/geometry";
import inside = require("point-in-polygon");
import * as ng from "@angular/core";
import * as mat from "@angular/material";
import * as shapes from "./shapes";
import { ShellDialogComponent, ShellDialogComponentData } from "../../../components/utility/shell-dialog.component";
import { RectangleViewModel } from "./shapes/rectangle-view-model";
import { SelectOptionComponent, SOCParameters, SelectOptionComponentParameters } from "../../../components/editor/select-option.component";
import { ShapeType } from "./shapes/shape-view-model";
import { ActionType } from "./actions/action-view-model";
import { ActionUtility } from "./actions/action-utility";

export class ButtonViewModel implements TreeNode<SceneViewModel, null>
{
	static deserialize(json: ButtonViewModel, scene: SceneViewModel): ButtonViewModel
	{
		const button = new ButtonViewModel(scene);
		button.name = json.name;

		button.shapes = json.shapes.map(shape =>
		{
			switch (shape.type)
			{
				case "circle":
					return CircleViewModel.deserialize(<CircleViewModel>shape);
				case "rectangle":
					return RectangleViewModel.deserialize(<RectangleViewModel>shape);
				default:
					throw new Error(`Unknown shape type: ${shape.type}`);
			}
		});
		if (json.action)
		{
			button.action = ActionUtility.deserialize(button, json.action);
		}

		return button;
	}

	private static index = 0;

	/** ID of the button, tracks identity. */
	readonly id = ButtonViewModel.index++;

	/** Gets or sets the display name of the button. */
	@editorProperty("Name", () => StringEditorComponent)
	name: string = `Button ${this.id + 1}`;

	readonly children = [];

	/** Gets or sets the shapes for the button. */
	@editorProperty("Shapes", () => ListEditorComponent, [
		{
			provide: PEListOptions,
			useFactory: (injector: ng.Injector, dialog: mat.MatDialog, componentFactoryResolver: ng.ComponentFactoryResolver) =>
				() => <ListEditorOptions>{
					createItem: () => ButtonViewModel.createShape(injector, dialog, componentFactoryResolver)
				},
			deps: [ng.Injector, mat.MatDialog, ng.ComponentFactoryResolver]
		}
	], { fullRow: true })
	shapes: ShapeViewModel[] = [new CircleViewModel()];

	@editorProperty("Action Type", () => OptionsEditorComponent, [ ActionUtility.actionTypeOptionsProvider ])
	get actionType(): ActionType { return this.action.type; }
	set actionType(value: ActionType)
	{
		if (value == this.action.type)
			return;

		if (confirm("This will replace the current action and all its settings will be lost. Continue?") == false)
			return;

		this.action = ActionUtility.actionFromType(this, value);
	}

	@editorProperty("Action", () => RecursiveEditorComponent, undefined, { fullRow: true })
	action: ActionViewModel = new ChangeSceneActionViewModel(this);

	constructor(public parent: SceneViewModel)
	{
	}

	/**
	 * Tests whether the button is hit.
	 * @param point The point at which to check for a hit.
	 * @param time The current time.
	 */
	hits(point: UVPoint, time: number)
	{
		return this.activeShapes(time).some(shape => shape.getPlanarGeometry().some(path =>
		{
			return inside([point.u, point.v], path.map(p => [p.x, p.y]))
		}))
	}

	/**
	 * Calculates the average center of the button, based on its shapes.
	 * Returns null if the button has no shapes.
	 * @param time The current time in seconds.
	 */
	getCenter(time: number): UVPoint | null
	{
		const activeShapes = this.activeShapes(time);
		if (activeShapes.length == 0)
			return null;

		let center = activeShapes.reduce((acc, s) => ({
			u: acc.u + s.centerX,
			v: acc.v + s.centerY
		}), { u: 0, v: 0 });

		return {
			u: center.u / activeShapes.length,
			v: center.v / activeShapes.length
		}
	}

	/**
	 * Gets the currently active shapes.
	 * @param time The current time in seconds used to check activity.
	 */
	activeShapes(time: number): ShapeViewModel[]
	{
		return this.shapes.filter(s => s.isActive(time));
	}

	static async createShape(injector: ng.Injector, dialog: mat.MatDialog, componentFactoryResolver: ng.ComponentFactoryResolver)
	{
		const dialogRef = dialog.open(ShellDialogComponent, {
			data: <ShellDialogComponentData>{
				title: "Select Shape Type",
				hasCancel: true,
				component: () => ({
					factory: componentFactoryResolver.resolveComponentFactory(SelectOptionComponent),
					injector: ng.Injector.create([
						{
							provide: SOCParameters, useValue: <SelectOptionComponentParameters<ShapeType>>{
								label: "Shape Type",
								value: "circle",
								options: [
									{ label: "Circle", value: "circle" },
									{ label: "Rectangle", value: "rectangle" },
								]
							}
						}
					], injector)
				})
			}
		});
		const result = await dialogRef.afterClosed().toPromise<SelectOptionComponent<ShapeType> | null>();
		if (result == null)
			return null;

		let shape: shapes.ShapeViewModel;
		switch (result.value)
		{
			case "circle":
				shape = new shapes.CircleViewModel();
				break;
			case "rectangle":
				shape = new shapes.RectangleViewModel();
				break;
			default:
				throw new Error(`Unhandled type: ${result.value}`);
		}

		return shape;
	}
}

addToJSON(ButtonViewModel.prototype, "name", "shapes", "action");