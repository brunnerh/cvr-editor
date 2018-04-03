import { SceneViewModel } from "./scene-view-model";
import * as afd from "./affordances";
import { MenuItemViewModel } from "../utility/menu-item-view-model";
import { DelegateCommand } from "../../utility/command";
import { TreeNode } from "./tree-node";
import { addToJSON } from "../../utility/json";
import { VideoResourceViewModel } from "./video-resource-view-model";
import { SettingsViewModel, ViewportSettingsViewModel } from "./settings";
import { HtmlSettingsViewModel } from "./settings/html-settings-view-model";
import { SettingsType } from "./settings/settings-view-model";
import { cachedGetter } from "../../utility/decorators";

export class ProjectViewModel implements TreeNode<null, any>
{
	static deserialize(json: ProjectViewModel, videos: ReadonlyArray<VideoResourceViewModel>): any
	{
		const project = new ProjectViewModel();
		project.scenes = json.scenes.map(s => SceneViewModel.deserialize(s, videos, project));
		if (json.affordances)
			project.affordances = json.affordances.map(affordance =>
			{
				switch (affordance.type)
				{
					case "shape":
						return afd.ShapeAffordanceViewModel.deserialize(<afd.ShapeAffordanceViewModel>affordance, project);
					case "cursor":
						return afd.CursorAffordanceViewModel.deserialize(<afd.CursorAffordanceViewModel>affordance, project);
					case "line":
						return afd.LineAffordanceViewModel.deserialize(<afd.LineAffordanceViewModel>affordance, project);
					case "halo":
						return afd.HaloAffordanceViewModel.deserialize(<afd.HaloAffordanceViewModel>affordance, project);
					case "edge-indicator":
						return afd.EdgeIndicatorAffordanceViewModel.deserialize(<afd.EdgeIndicatorAffordanceViewModel>affordance, project);
					default:
						throw new Error(`Unknown affordance type: ${affordance.type}`);
				}
			});
		if (json.settings)
			project.settings = json.settings.map(settings =>
			{
				switch (settings.type)
				{
					case "viewport":
						return ViewportSettingsViewModel.deserialize(<ViewportSettingsViewModel>settings, project);
					case "html":
						return HtmlSettingsViewModel.deserialize(<HtmlSettingsViewModel>settings, project);
					default:
						throw new Error(`Unknown settings type: ${settings.type}`);
				}
			});

		return project;
	}

	readonly parent = null;

	scenes: SceneViewModel[] = [];
	affordances: afd.AffordanceViewModel[] = [
		new afd.ShapeAffordanceViewModel(this),
		new afd.CursorAffordanceViewModel(this)
	];
	settings: SettingsViewModel[] = [
		new ViewportSettingsViewModel(this),
		new HtmlSettingsViewModel(this),
	];

	private findSettings<T extends SettingsViewModel>(type: SettingsType) { return <T>this.settings.filter(s => s.type == type)[0] }
	@cachedGetter<ProjectViewModel>(self => self.settings)
	get viewportSettings() { return this.findSettings<ViewportSettingsViewModel>("viewport"); }
	@cachedGetter<ProjectViewModel>(self => self.settings)
	get htmlSettings() { return this.findSettings<HtmlSettingsViewModel>("html"); }

	get children(): any[] { return (<any[]>[]).concat(this.scenes, this.affordances, this.settings); }

	/**
	 * Creates a menu item that deletes an item from a collection.
	 * @param array The array to remove the item from (deferred because array properties may be overwritten).
	 * @param itemTypeName The name to display in the confirmation dialog.
	 */
	private makeDeleteMenuItem<T>(array: () => T[], itemTypeName: string)
	{
		return {
			label: "Delete",
			icon: "delete",
			command: new DelegateCommand((item: any) =>
			{
				if (confirm(`Are you sure you want to delete this ${itemTypeName}?`))
					array().splice(array().indexOf(item), 1);
			})
		}
	}
	readonly scenesContextMenu: MenuItemViewModel<SceneViewModel>[] = [
		this.makeDeleteMenuItem(() => this.scenes, "scene")
	];
	readonly affordancesContextMenu: MenuItemViewModel<afd.AffordanceViewModel>[] = [
		this.makeDeleteMenuItem(() => this.affordances, "affordance")
	];
	readonly settingsContextMenu: MenuItemViewModel<afd.AffordanceViewModel>[] | null = null;

	sceneAdd(): SceneViewModel
	{
		const newScene = new SceneViewModel(this);
		this.scenes.push(newScene);

		return newScene;
	}
}

addToJSON(ProjectViewModel.prototype, "scenes", "affordances", "settings");