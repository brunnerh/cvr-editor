import { TreeNode } from "../tree-node";
import { ProjectViewModel } from "../project-view-model";
import { DetailsType } from "../details-type";

export abstract class SettingsViewModel implements TreeNode<ProjectViewModel, null>, DetailsType
{
	private static index = 0;
	
	readonly detailsType = "settings";

	readonly children = [];

	/** ID of the settings, tracks identity. */
	readonly id = SettingsViewModel.index++;

	/** Gets the type of the settings, primarily used for deserialization purposes. */
	abstract readonly type: SettingsType;

	name: string;

	constructor(public parent: ProjectViewModel)
	{

	}
}

export type SettingsType = "viewport" | "html";