import { Command } from "../../../utility/command";
import { ButtonViewModel } from "../button-view-model";
import { TreeNode } from "../tree-node";
import { ViewerComponent } from "../../../../components/editor/viewer.component";
import { SceneViewModel } from "../scene-view-model";

/** Class representing an action that can be invoked from a button click. */
export abstract class ActionViewModel implements TreeNode<ButtonViewModel | SceneViewModel, null>
{
	// TODO: Use metadata to reflect the type for any instance.
	/** Gets the type of the action, primarily used for deserialization purposes. */
	abstract readonly type: ActionType;

	abstract command: Command<ViewerComponent>;

	readonly children = [];

	constructor(public parent: ButtonViewModel | SceneViewModel)
	{

	}
}

export type ActionType = "do-nothing" | "composite" | "change-scene" | "display-markdown" | "display-html" | "replay-video";