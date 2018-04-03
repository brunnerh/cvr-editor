/** Used to identify what details view to show in the editor. */
export interface DetailsType
{
	readonly detailsType: DetailsTypes;
}

export type DetailsTypes = "resource" | "scene" | "affordance" | "settings" | undefined;