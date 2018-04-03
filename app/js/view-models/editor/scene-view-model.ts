import { editorProperty } from "../../../components/editor/properties.component";
import { StringEditorComponent, OptionsEditorComponent, PESelectOptions, BooleanEditorComponent, RecursiveEditorComponent } from "../../../components/editor/property-editors";
import { VideoResourceOptionsProvider } from "../../../components/editor/property-editors/video-resource-options.provider"
import { DBService } from "../../../components/db.service";
import { VideoSource } from "./video-source";
import { VideoResourceViewModel } from "./video-resource-view-model";
import { ButtonViewModel } from "./button-view-model";
import { MenuItemViewModel } from "../utility/menu-item-view-model";
import { DelegateCommand } from "../../utility/command";
import { ProjectViewModel } from "./project-view-model";
import { TreeNode } from "./tree-node";
import { DetailsType } from "./details-type";
import { addToJSON } from "../../utility/json";
import { ActionType, ActionViewModel } from "./actions/action-view-model";
import { ActionUtility } from "./actions/action-utility";
import { DoNothingActionViewModel } from "./actions/do-nothing-action-view-model";

export class SceneViewModel implements VideoSource, TreeNode<ProjectViewModel, any>, DetailsType
{
	readonly detailsType = "scene";
	
	static deserialize(json: SceneViewModel, videos: ReadonlyArray<VideoResourceViewModel>, project: ProjectViewModel)
	{
		const scene = new SceneViewModel(project);
		scene.name = json.name;
		if (json.videoID != null)
			scene.video = videos.filter(v => v.entity.$loki == json.videoID)[0];

		scene.buttons = json.buttons.map(b => ButtonViewModel.deserialize(b, scene));
		scene.isEntryPoint = json.isEntryPoint;

		if (json.endAction)
			scene.endAction = ActionUtility.deserialize(scene, json.endAction);

		return scene;
	}

	private static index = 0;

	/** ID of the scene, tracks identity. */
	readonly id = SceneViewModel.index++;


	// TODO: enforce uniqueness of name across all scenes in the project.
	@editorProperty("Name", () => StringEditorComponent)
	name: string = `Scene ${this.id + 1}`;

	get videoID() { return this.video == null ? null : this.video.entity.$loki!; }
	
	// TODO: find way of not storing video, but only video ID here.
	@editorProperty("Video", () => OptionsEditorComponent, [
		{ provide: PESelectOptions, useClass: VideoResourceOptionsProvider, deps: [DBService] }
	], {
		tooltip: "Sets the video associated with this scene."
	})
	video: VideoResourceViewModel | null = null;

	@editorProperty("Entry Point", () => BooleanEditorComponent, undefined, {
		tooltip: "Sets scene as entry point when switching to the view mode (if no other scene is already selected)."
	})
	isEntryPoint = false;

	@editorProperty("End Action Type", () => OptionsEditorComponent, [ ActionUtility.actionTypeOptionsProvider ])
	get endActionType(): ActionType { return this.endAction.type; }
	set endActionType(value: ActionType)
	{
		if (value == this.endAction.type)
			return;

		if (confirm("This will replace the current action and all its settings will be lost. Continue?") == false)
			return;

		this.endAction = ActionUtility.actionFromType(this, value);
	}

	@editorProperty("End Action", () => RecursiveEditorComponent, undefined, { fullRow: true })
	endAction: ActionViewModel = new DoNothingActionViewModel(this);

	buttons: ButtonViewModel[] = [];

	readonly buttonsContextMenu: MenuItemViewModel<ButtonViewModel>[] = [
		{
			label: "Delete",
			icon: "delete",
			command: new DelegateCommand(item =>
			{
				if (confirm("Are you sure you want to delete this button?"))
					this.buttons.splice(this.buttons.indexOf(item), 1);
			})
		}
	];

	get videoSrc()
	{
		return this.video == null ? undefined : this.video.videoSrc;
	}

	get children() { return this.buttons }

	constructor(public parent: ProjectViewModel)
	{
	}

	buttonAdd(): ButtonViewModel
	{
		const button = new ButtonViewModel(this);
		this.buttons.push(button);

		return button;
	}
}

addToJSON(SceneViewModel.prototype, "name", "videoID", "buttons", "isEntryPoint", "endAction");