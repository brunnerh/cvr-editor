import { ActionViewModel } from "./action-view-model";
import { cachedGetter } from "../../../utility/decorators";
import { DelegateCommand } from "../../../utility/command";
import { editorProperty } from "../../../../components/editor/properties.component";
import { OptionsEditorComponent, PESelectOptions, OptionsEditorOption, TextDisplayComponent } from "../../../../components/editor/property-editors";
import { addToJSON } from "../../../utility/json";
import { ButtonViewModel } from "../button-view-model";
import { ViewerComponent } from "../../../../components/editor/viewer.component";
import { SceneViewModel } from "../scene-view-model";

export class ChangeSceneActionViewModel extends ActionViewModel
{
	static deserialize(json: ChangeSceneActionViewModel, parent: ButtonViewModel | SceneViewModel): ChangeSceneActionViewModel
	{
		const action = new ChangeSceneActionViewModel(parent);
		if (json.sceneName)
		{
			// Hack: Defer scene resolution until after deserialization phase
			//       because `allScenes` will actually not return all the scenes
			//       which are still being deserialized.
			setTimeout(() =>
			{
				const scene = action.allScenes.filter(s => s.name == json.sceneName)[0];
				if (scene)
					action.scene = scene;
			});
		}

		return action;
	}
	readonly type = "change-scene";

	@editorProperty(null, () => TextDisplayComponent)
	readonly description = "Changes the current scene to the one specified.";

	/** Gets or sets the scene that should be switched to on click. */
	@editorProperty("Scene", () => OptionsEditorComponent, [
		{ provide: PESelectOptions, useValue: (self: ChangeSceneActionViewModel) => self.sceneOptions }
	])
	scene: SceneViewModel | null = null;

	get sceneName(): string | null
	{
		return this.scene == null ? null : this.scene.name;
	}

	@cachedGetter()
	get command()
	{
		return new DelegateCommand((viewer: ViewerComponent) =>
		{
			if (this.scene == null)
				throw new Error("No scene selected to change to.");

			viewer.currentScene = this.scene;
		})
	}

	private get allScenes()
	{
		// Prevent dependency cycle by using name check instead of instanceof
		if (this.parent.constructor.name == 'ButtonViewModel')
		{
			const button = <ButtonViewModel>this.parent;
			return button.parent.parent.scenes;
		}
		else
		{
			const scene = <SceneViewModel>this.parent;
			return scene.parent.scenes;
		}
	}

	private get sceneOptions()
	{
		const options = this.allScenes.map(s => (<OptionsEditorOption<SceneViewModel | null>>{
			label: s.name,
			value: s
		}));

		options.splice(0, 0, { label: "[None]", value: null });

		return options;
	}
}

addToJSON(ChangeSceneActionViewModel.prototype, "type", "sceneName");