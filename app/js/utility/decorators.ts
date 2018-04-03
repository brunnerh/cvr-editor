import deepEqual = require("deep-equal");

export interface IDescriptorOptions
{
	/** Special flag to change to an instance descriptor upon first assignment. Default is false.  */
	instance?: boolean;

	configurable?: boolean;
	enumerable?: boolean;
	value?: any;
	writable?: boolean;
	get?: (this: any) => any;
	set?: (this: any, value: any) => void;
}

/**
 * Decorator that sets the descriptor properties of a class field.
 */
export function descriptor(options: IDescriptorOptions)
{
	return (target: any, propertyKey: string, descriptor?: PropertyDescriptor): any =>
	{
		var modifyDescriptor = (d: PropertyDescriptor | undefined) =>
		{
			d = d || {};

			// Defaults
			if (d.configurable == null) d.configurable = true;
			if (d.enumerable == null) d.enumerable = true;

			// Update
			if (options.configurable != null) d.configurable = options.configurable;
			if (options.enumerable != null) d.enumerable = options.enumerable;
			if (options.writable != null) d.writable = options.writable;
			if (options.value != null) d.value = options.value;
			if (options.get != null) d.get = options.get;
			if (options.set != null) d.set = options.set;

			return d;
		}


		if (options.instance == true)
		{
			Object.defineProperty(target, propertyKey, {
				configurable: true,
				set: function (this: any, value)
				{
					// When instance is specified the descriptor can only be set on the first write.
					var descriptor = Object.getOwnPropertyDescriptor(this, propertyKey);
					descriptor = modifyDescriptor(descriptor);
					Object.defineProperty(this, propertyKey, descriptor);

					this[propertyKey] = value;
				}
			});
		}
		else
		{
			Object.defineProperty(target, propertyKey, modifyDescriptor(descriptor));
		}
	};
}


const serialized = new WeakMap();

/** Set on a class to automatically generate a "toJSON" function from all the fields/properties annotated with "serialize". */
export function serializable()
{
	return (target: any) =>
	{
		target.prototype.toJSON = function (this: any)
		{
			const map = serialized.get(target.prototype);
			const props = Object.keys(map);
			return props.reduce((previous: any, key) =>
			{
				previous[map[key]] = this[key];
				return previous;
			}, {});
		}
	}
}

/** Indicates that a property or field should be serialized. */
export function serialize(name?: string)
{
	return (target: any, propertyKey: string) =>
	{
		let map = serialized.get(target);
		if (!map)
		{
			map = {};
			serialized.set(target, map);
		}

		map[propertyKey] = name || propertyKey;
	}
}


/**
 * Caches the result of a getter call and only updates the value of the dependency function changes.
 * The dependency function can return dictionaries or arrays of dependencies. The results are compared using a deep equals comparison.
 * If no dependency is provided the value is calculated only once.
 * 
 * @param dependency A function that points to the dependency of the property.
 *                   The instance passed to the function is the object owning the property, as this value cannot be provided to
 *                   decorators, as they are static to the class.
 */
export function cachedGetter<T>(dependency?: (instance: T) => any)
{
	return (target: any, propertyKey: string, propertyDescriptor: PropertyDescriptor) =>
	{
		var cacheKey = "_cached_" + propertyKey;
		var dependencyCacheKey = "_cached_dp_" + propertyKey;

		var cfgProp = descriptor({
			instance: true,
			writable: true,
			enumerable: false
		});
		cfgProp(target, cacheKey);
		cfgProp(target, dependencyCacheKey);

		var originalGet = propertyDescriptor.get;

		return <PropertyDescriptor>{
			get: function (this: any)
			{
				if (originalGet == null)
					throw new Error("Cached getter cannot be used on property without getter.");

				if (dependency == null)
					dependency = (_instance: T) => true;

				var dp = dependency(this);
				if (this[cacheKey] == null || deepEqual(this[dependencyCacheKey], dp) == false)
				{
					this[cacheKey] = originalGet.bind(this)();
					this[dependencyCacheKey] = dp;
				}

				return this[cacheKey];
			},
			set: propertyDescriptor.set,
			enumerable: false,
			configurable: true
		}
	}
}

/**
 * Caches the result of a function call and only calculates a new value if the value of the dependency function changes.
 * The dependency function can return dictionaries or arrays of dependencies. The results are compared using a deep equals comparison.
 * If no dependency is provided the value is calculated only once for a given combination of arguments.
 * 
 * Besides anything that is accessed on the current scope, the dependencies should include mutable properties or function results of the argument objects
 * if they are used within the function body.
 * 
 * @param dependency A function that points to the dependency of the function.
 *                   The instance passed to the function is the object owning the function, as this value cannot be provided to
 *                   decorators, as they are static to the class.
 * @param cacheSize Sets how many cached values are stored for the function. Each combination of arguments has its own cache
 *                  to ensure that a function called with identical arguments yields the same value if none of the dependencies have changed.
 */
export function cachedFunction<T>(dependency?: (instance: T, ...args: any[]) => any, cacheSize = 100)
{
	return (target: any, functionKey: string, propertyDescriptor: PropertyDescriptor) =>
	{
		const cacheKey = "_cached_" + functionKey;
		const dependencyCacheKey = "_cached_dp_" + functionKey;

		const cfgProp = descriptor({
			instance: true,
			writable: true,
			enumerable: false
		});
		cfgProp(target, cacheKey);
		cfgProp(target, dependencyCacheKey);

		const originalFunction = propertyDescriptor.value;

		return <PropertyDescriptor>{
			value: function (this: any, ...args: any[])
			{
				if (originalFunction == null)
					throw new Error("Cached function cannot be used without accessor.");

				if (dependency == null)
					dependency = (_instance: T) => true;

				if (this[cacheKey] == null)
					this[cacheKey] = new Map();
				if (this[dependencyCacheKey] == null)
					this[dependencyCacheKey] = new Map();

				// The cache for functions consists of maps that map from a function argument list to the calculated value.
				// As WeakMap does not support compound keys (looking up an array cannot work because it will always be a new instance) a normal map is used. To prevent indefinite leaking, only the set number of values is stored.
				const cacheMap = <Map<any[], any>>this[cacheKey];
				const dependencyCacheMap = <Map<any[], any>>this[dependencyCacheKey];

				const getCacheEntry = (map: Map<any[], any>) =>
				{
					for (let entry of map.entries())
						if (deepEqual(entry[0], args))
						{
							// Re-add value to move it to the end of the map (deleted last).
							map.delete(entry[0]);
							map.set(args, entry[1]);

							return entry[1];
						}

					return undefined;
				}
				const getFirstEntry = (map: Map<any, any>) =>
				{
					for (let entry of map.entries())
						return entry;

					throw new Error("No entries in map.");
				}

				const dp = dependency(this, ...args);
				const entry = getCacheEntry(cacheMap);
				const dpEntry = getCacheEntry(dependencyCacheMap);
				if (entry == undefined || dpEntry == undefined || deepEqual(dpEntry, dp) == false)
				{
					const newEntry = originalFunction.bind(this)(...args);
					cacheMap.set(args, newEntry)
					dependencyCacheMap.set(args, dp);

					if (cacheMap.size > cacheSize)
					{
						cacheMap.delete(getFirstEntry(cacheMap)[0]);
						dependencyCacheMap.delete(getFirstEntry(dependencyCacheMap)[0]);
					}

					// Prevent additional lookup
					return newEntry;
				}

				return entry;
			},
			enumerable: false,
			configurable: true
		}
	}
}