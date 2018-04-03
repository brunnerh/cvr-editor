const literalPrototype = Object.getPrototypeOf({})

/**
 * Creates properties that mirror those of a given source object.
 * Values are not copied but properties are redirected.
 * 
 * @param target The object to receive the properties of the source object.
 * @param source The object whose properties should be mirrored.
 * @param includePropotype Sets whether prototype properties are included. Object literal prototypes are excluded.
 * @param replace Sets whether a property that exists on the target will be overwritten.
 * @returns Target object.
 */
export function mirror<T1, T2>(target: T1, source: T2, includePropotype = false, replace = false)
{
	const getProps = (object: any) => {
		let props = Object.getOwnPropertyNames(object);
		if (includePropotype)
		{
			const proto = Object.getPrototypeOf(object);
			if (proto != literalPrototype)
				props = props.concat(...Object.getOwnPropertyNames(proto));
		}

		return props;
	}
	const sourceProps = getProps(source);
	const targetProps = getProps(target);
	for (const key of sourceProps)
	{
		if (targetProps.indexOf(key) == -1 || replace == true)
			Object.defineProperty(target, key, {
				get: () => (<any>source)[key],
				set: value => (<any>source)[key] = value
			});
	}

	return <T1 & T2>target;
}