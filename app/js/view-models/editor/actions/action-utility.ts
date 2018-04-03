import { ActionViewModel, ActionType } from "./action-view-model";
import { ChangeSceneActionViewModel } from "./change-scene-action-view-model";
import { DisplayMarkdownActionViewModel } from "./display-markdown-action-view-model";
import { DisplayHtmlActionViewModel } from "./display-html-action-view-model";
import { ButtonViewModel } from "../button-view-model";
import { SceneViewModel } from "../scene-view-model";
import { DoNothingActionViewModel } from "./do-nothing-action-view-model";
import { ReplayVideoActionViewModel } from "./replay-video-action-view-model";
import { CompositeActionViewModel } from "./composite-action-view-model";
import * as ng from "@angular/core";
import { PESelectOptions, OptionsEditorOption } from "../../../../components/editor/property-editors/index";

export class ActionUtility
{
	static actionFromType(parent: SceneViewModel | ButtonViewModel, type: ActionType)
	{
		switch (type)
		{
			case "do-nothing":
				return new DoNothingActionViewModel(parent);
			case "composite":
				return new CompositeActionViewModel(parent);
			case "change-scene":
				return new ChangeSceneActionViewModel(parent);
			case "display-markdown":
				return new DisplayMarkdownActionViewModel(parent);
			case "display-html":
				return new DisplayHtmlActionViewModel(parent);
			case "replay-video":
				return new ReplayVideoActionViewModel(parent);
			default:
				throw new Error(`Unknown action type: ${type}`);
		}
	}

	static deserialize(parent: SceneViewModel | ButtonViewModel, json: ActionViewModel)
	{
		switch (json.type)
		{
			case "do-nothing":
				return new DoNothingActionViewModel(parent);
			case "composite":
				return CompositeActionViewModel.deserialize(<CompositeActionViewModel>json, parent);
			case "change-scene":
				return ChangeSceneActionViewModel.deserialize(<ChangeSceneActionViewModel>json, parent);
			case "display-markdown":
				return DisplayMarkdownActionViewModel.deserialize(<DisplayMarkdownActionViewModel>json, parent);
			case "display-html":
				return DisplayHtmlActionViewModel.deserialize(<DisplayHtmlActionViewModel>json, parent);
			case "replay-video":
				return ReplayVideoActionViewModel.deserialize(<ReplayVideoActionViewModel>json, parent);
			default:
				throw new Error(`Unknown action type: ${json.type}`);
		}
	}

	static get actionTypeOptionsProvider(): ng.ValueProvider
	{
		return {
			provide: PESelectOptions, useValue: () => <OptionsEditorOption<ActionType>[]>[
				{ value: "do-nothing", label: "Do Nothing" },
				{ value: "composite", label: "Composite Action" },
				{ value: "change-scene", label: "Change Scene" },
				{ value: "display-markdown", label: "Display Markdown" },
				{ value: "display-html", label: "Display HTML" },
				{ value: "replay-video", label: "Replay Video" },
			]
		}
	}
}