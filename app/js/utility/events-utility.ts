import { Lazy } from "./lazy";
import { descriptor } from "./decorators";

export type BasicEventHandler<T, E> = (sender?: T, args?: E) => void;

/** Token that can be used to cancel a subscription. */
export class SubscriptionCancellationToken
{
	private _isCancelled = false;
	public get isCancelled() { return this._isCancelled; }

	cancelFunction: (() => void) | null;

	constructor(cancelFunction: () => void)
	{
		this.cancelFunction = cancelFunction;
	}

	/** Cancels the subscription, if it has not been cancelled already. */
	cancel()
	{
		if (this.isCancelled == true)
			return;

		if (this.cancelFunction)
			this.cancelFunction();

		this.cancelFunction = null;
		this._isCancelled = true;
	}

	/** Creates an aggregated token that cancels all given tokens. */
	static aggregate(...tokens: SubscriptionCancellationToken[])
	{
		return new SubscriptionCancellationToken(() =>
			tokens.forEach(t => t.cancel())
		);
	}
}

/**
 * Object representing an event.
 */
export class BasicEvent<T, E>
{
	@descriptor({ instance: true, enumerable: false, writable: true })
	private handlers: BasicEventHandler<T, E>[] = [];

	/** Adds handler to the event. Returns cancellation token. */
	on(handler: BasicEventHandler<T, E>): SubscriptionCancellationToken
	{
		this.handlers.push(handler);

		return new SubscriptionCancellationToken(() => this.off(handler));
	}
	/** Removes handler from the event. */
	off(handler: BasicEventHandler<T, E>): void
	{
		var index = this.handlers.indexOf(handler);
		if (index != -1)
			this.handlers.splice(index, 1);
	}
	/** Subscribes only once. Return cancellation token, which is the only way to unsubscribe, as the handler is wrapped. */
	once(handler: BasicEventHandler<T, E>): SubscriptionCancellationToken
	{
		var wrap = (s: T, e: E) =>
		{
			handler(s, e);

			this.off(wrap);
		}
		this.on(wrap);

		return new SubscriptionCancellationToken(() => this.off(wrap));
	}
	/** Trigger the event. */
	trigger(args?: E)
	{
		this.handlers.forEach(h => h(this.sender, args));
	}

	@descriptor({ instance: true, enumerable: false, writable: true })
	private sender: T | undefined;

	constructor(
		sender?: T
	)
	{
		this.sender = sender;
	}
}

export type EventHandlerObject<T extends Event> = { handleEvent: (e: T) => void };
export type EventHandler<T extends Event> = ((e: T) => void);
export type GenericEventHandler<T extends Event> = EventHandler<T> | EventHandlerObject<T>;

export class EventUtility
{
	static _supportsOnce = new Lazy(() =>
	{
		var element = document.createElement("div");
		var counter = 0;
		element.addEventListener("test", () => counter++, <any>{ once: true });
		var makeEvent = () =>
		{
			var event = document.createEvent("CustomEvent");
			event.initCustomEvent("test", false, false, null);
			return event;
		};
		element.dispatchEvent(makeEvent());
		element.dispatchEvent(makeEvent());
		return counter == 1;
	});
	static get supportsOnce()
	{
		return this._supportsOnce.value;
	}

	private static getRemoveOptions(options: { capture?: boolean })
	{
		return typeof options === 'boolean' ? options : ('capture' in options ? options.capture : void 0);
	}

	static handle<T extends Event>(listenerArg: GenericEventHandler<T>, event: T)
	{
		if (typeof (<any>listenerArg)['handleEvent'] === 'function')
			(<EventHandlerObject<T>>listenerArg).handleEvent(event);
		else
			(<EventHandler<T>>listenerArg)(event);
	};
	/**
	 * Subscribes to an event in a cancelable manner by returning a subscription token.
	 * 
	 * @param target The event target.
	 * @param type The event to listen to.
	 * @param listener The event listener/handler.
	 * @param options The event options.
	 */
	static cancelable<T extends Event>(target: EventTarget, type: string, listener: GenericEventHandler<T>, options: any = false)
	{
		target.addEventListener(type, listener, options);
		return new SubscriptionCancellationToken(() => target.removeEventListener(type, listener, EventUtility.getRemoveOptions(options)));
	};
	/**
	 * Subscribes to an event but only fires the handler once per frame.
	 * 
	 * @param target The event target.
	 * @param type The event to listen to.
	 * @param listener The event listener/handler.
	 * @param options The event options.
	 */
	static throttled<T extends Event>(target: EventTarget, type: string, listener: GenericEventHandler<T>, options: any = false)
	{
		var customType = type + "Throttled";
		var running = false;
		var func = (e: Event) =>
		{
			if (running)
				return;

			running = true;
			window.requestAnimationFrame(() =>
			{
				var event = document.createEvent("CustomEvent");
				event.initCustomEvent(customType, false, false, e);
				target.dispatchEvent(event);
				running = false;
			});
		};
		var internalCancel = this.cancelable(target, type, func, options);
		var mainCancel = this.cancelable(target, customType, (e: CustomEvent) => this.handle(listener, e.detail));

		return SubscriptionCancellationToken.aggregate(internalCancel, mainCancel);
	};
	/**
	 * Subscribes to an event and handles once at most.
	 * 
	 * @param target The event target.
	 * @param type The event to listen to.
	 * @param listener The event listener/handler.
	 * @param options The event options.
	 */
	static once<T extends Event>(target: EventTarget, type: string, listener: EventHandler<T>, options: any = false)
	{
		if (this.supportsOnce)
		{
			if (typeof options == "boolean")
				options = { capture: options, once: true, passive: false };
			else
				options.once = true;

			return this.cancelable(target, type, listener, options);
		}
		else
		{
			var handler: EventHandler<T> = (e: Event) =>
			{
				listener(<T>e);
				target.removeEventListener(type, handler, this.getRemoveOptions(options));
			};

			return this.cancelable(target, type, handler, options);
		}
	};

	/**
	 * Subscribes to the animation frame loop in an event-like manner.
	 * @param listener The function to be executed every frame.
	 *                 If a boolean is returned, a value of true cancels the subscription.
	 * @param target When set, a different target than the global object is used (e.g. a VR display).
	 */
	static onAnimationFrame(listener: (time: number) => (boolean | void), target?: { requestAnimationFrame(callback: FrameRequestCallback): void; })
	{
		if (target == null)
			target = self;

		let cancel = false;
		const onFrame = (time: number) =>
		{
			if (cancel)
				return;

			let localCancel = listener(time);
			if (localCancel !== true)
				target!.requestAnimationFrame(onFrame);
		};
		target.requestAnimationFrame(onFrame);

		return new SubscriptionCancellationToken(() => cancel = true);
	}

	private static onTimedEvent(setFn: TimerSet, clearFn: TimerClear, callback: () => (boolean | void), timeout?: any)
	{
		let handle: number;
		const cancel = () => clearFn(handle);
		const token = new SubscriptionCancellationToken(cancel);
		const onInterval = () =>
		{
			let c = callback();

			if (c == true)
				token.cancel();
		}
		handle = setFn(onInterval, timeout);

		return token;
	}

	/**
	 * Sets up an interval in an easily cancelable manner.
	 * @param callback The function to be executed after every timeout.
	 *                 If a boolean is returned, a value of true cancels the interval.
	 * @param timeout The time to wait between callback executions.
	 */
	static onInterval(callback: () => (boolean | void), timeout?: any)
	{
		return this.onTimedEvent(
			self.setInterval.bind(self),
			self.clearInterval.bind(self),
			callback,
			timeout
		)
	}
	/**
	 * Sets up an interval in an easily cancelable manner.
	 * @param callback The function to be executed after the timeout.
	 *                 If a boolean is returned, a value of true cancels the timeout.
	 * @param timeout The time to before callback execution.
	 */
	static onTimeout(callback: () => (boolean | void), timeout?: any)
	{
		return this.onTimedEvent(
			self.setTimeout.bind(self),
			self.clearTimeout.bind(self),
			callback,
			timeout
		)
	}
}
type TimerSet = (handler: (...args: any[]) => void, timeout: number) => number;
type TimerClear = (handle: number) => void;