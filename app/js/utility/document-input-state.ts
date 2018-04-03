import { IDisposable } from "./idisposable";
import { SubscriptionCancellationToken, EventUtility } from "./events-utility";

/** Class that tracks input device states. */
export class DocumentInputState implements IDisposable
{
	private _isDisposed = false;
	public get isDisposed() { return this._isDisposed; };

	keyboard = <{ [key: string]: boolean }>{};
	mouse = <{ [key: number]: boolean }>{};

	private unsub: () => void;

	constructor(document: HTMLDocument)
	{
		let tokens: SubscriptionCancellationToken[] = [];

		tokens.push(
			EventUtility.cancelable<KeyboardEvent>(document, "keydown", e => this.keyboard[e.key] = true),
			EventUtility.cancelable<KeyboardEvent>(document, "keyup", e => this.keyboard[e.key] = false),
			EventUtility.cancelable<MouseEvent>(document, "mousedown", e => this.mouse[e.button] = true),
			EventUtility.cancelable<MouseEvent>(document, "mouseup", e => this.mouse[e.button] = false),
			EventUtility.cancelable<TouchEvent>(document, "touchstart", () => this.mouse[0] = true),
			EventUtility.cancelable<TouchEvent>(document, "touchend", () => this.mouse[0] = false),
		);

		this.unsub = () => tokens.forEach(t => t.cancel());
	}

	dispose()
	{
		if (this.isDisposed)
			return;

		this.unsub();
		this._isDisposed = true;
	}
}