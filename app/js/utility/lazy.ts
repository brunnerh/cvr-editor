/**
 * Class for lazy value creation.
 */
export class Lazy<T>
{
	private _isValueCreated = false;
	/**
	 * Gets a value indicating whether the value has already been created.
	 */
	get isValueCreated()
	{
		return this._isValueCreated;
	}
	
	private _value: T;
	/**
	 * Gets the value of the lazy instance. If it has not been created yet, it will be.
	 */
	get value()
	{
		if (this.isValueCreated == false)
		{
			this._value = this.valueFactory();
			this._isValueCreated = true;
		}
		
		return this._value;
	}
	
	/**
	 * Creates a new lazy value instance.
	 * 
	 * @param valueFactory The factory function for the value of the lazy instance.
	 */
	constructor(private valueFactory: () => T)
	{
		
	}
}