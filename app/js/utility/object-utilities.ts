/**
 * Copies a properties from source object to target object if it is defined on the source object.
 * @param properties The properties to copy.
 * @param source The source object.
 * @param target The target object.
 * @returns The target object.
 */
export const copyOnDefined: <T>(source: T) => (target: T) => (...properties: (keyof T)[]) => T
	= source => target => (...properties) =>
	{
		for (let property of properties)
			if (source[property] != undefined)
				target[property] = source[property];

		return target;
	};