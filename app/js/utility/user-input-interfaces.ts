export type Mapping = "360" | "180";
export type Stereoscopy = "none" | "vertical" | "horizontal";

export interface TypedSelect<T extends string> extends HTMLSelectElement
{
	value: T;
}