import { descriptor } from "./decorators";

/**
 * Creates a "toJSON" function on a class, selecting the passed in properties.
 * If this function is called multiple times, the new properties are added and the function is redefined.
 * @param prototype The prototype on which to define the function.
 * @param properties The names of the properties to add.
 */
export function addToJSON<T>(prototype: T, ...properties: (keyof T)[])
{
	const list = getLocalProperties(prototype);
	list.push(...properties);

	defineToJSON(prototype);
}

/**
 * Creates a "toJSON" function on a class, removing the passed in properties (assumes that {@link addToJSON} has been called prior).
 * If a property is not currently in the list, nothing happens.
 * Does not consider properties of parent prototypes.
 * @param prototype The prototype on which to define the function.
 * @param properties The names of the properties to remove.
 */
export function removeToJSON<T>(prototype: T, ...properties: (keyof T)[])
{
	const list = getLocalProperties(prototype);
	properties.forEach(p =>
	{
		const i = list.indexOf(p);
		if (i == -1)
			return;

		list.splice(i, 1);
	});

	defineToJSON(prototype);
}

/**
 * Gets the list that keeps track of the properties that should be considered in "toJSON".
 * Parent prototype lists are not taken into consideration.
 */
function getLocalProperties(prototype: any): string[]
{
	const key = "_toJSONList";
	// Check if the property is owned, to not use the same list as a parent prototype.
	if (prototype.hasOwnProperty(key) == false)
	{
		prototype[key] = [];
		descriptor({ enumerable: false })(prototype, key);
	}

	return prototype[key];
}

/**
 * Gets all properties for the given prototype, including parent prototypes.
 * @param prototype The prototype whose properties to collect.
 */
function getProperties(prototype: any): string[]
{
	const list :string[] = [];
	let current = prototype;
	while (current != null)
	{
		list.push(...getLocalProperties(current));
		current = Object.getPrototypeOf(current);
	}

	return list;
}

function defineToJSON(prototype: any)
{
	const list = getProperties(prototype);
	prototype.toJSON = function (this: any)
	{
		return list.reduce((previous: any, key) =>
		{
			previous[key] = this[key];

			return previous;
		}, {});
	}
}