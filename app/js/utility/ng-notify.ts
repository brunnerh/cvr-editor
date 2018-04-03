import * as ng from "@angular/core";
import { descriptor } from "./decorators";

/**
 * Decorator that automatically emits change events using the property's output event. The event has to adhere to the convention of adding the "Change" suffix to the name of the property.
 */
export function notify()
{
    return (target: any, name: string): any =>
	{
		// Backing property
		const originalProperty = Object.getOwnPropertyDescriptor(target, name);

		const privateKey = "_emit_change_" + name;
		descriptor({
			instance: true,
			writable: originalProperty == null ? true : originalProperty.writable,
			enumerable: false,
			get: originalProperty == null ? undefined : originalProperty.get,
			set: originalProperty == null ? undefined : originalProperty.set,
		})(target, privateKey);
		
		var getter = function (this: any)
		{
			return this[privateKey];
		};
		var setter = function (this: any, value: any)
		{
			if (value == this[name])
				return;

			this[privateKey] = value;
			const emitter = <ng.EventEmitter<any>>this[name + "Change"];
			emitter.emit(value);
		};
		
		return <PropertyDescriptor>{
			get: getter,
			set: setter,
			enumerable: true,
			configurable: true
		};
	};
}