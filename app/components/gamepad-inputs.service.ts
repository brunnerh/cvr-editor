import * as ng from "@angular/core";
import { EventUtility, SubscriptionCancellationToken } from "../js/utility/events-utility";
import globalConfig from "../../config";

export type ButtonPressEvent = { gamepad: string, button: number };

@ng.Injectable()
export class GamepadInputsService implements ng.OnDestroy
{
	public get configs(): ReadonlyArray<GamepadInputConfig> { return this._configs; }
	private _configs: GamepadInputConfig[] = [];
	/** Event that is emitted if an action is detected. */
	public readonly onAction = new ng.EventEmitter<string>();
	/** Event that is emitted if any button is pressed (as in pressed and released). */
	public readonly onButtonPressed = new ng.EventEmitter<ButtonPressEvent>();

	private readonly storagePrefix = "cvr.input.config";
	private readonly disposeToken: SubscriptionCancellationToken;

	constructor(
		zone: ng.NgZone,
		@ng.Inject('storage') storage: Storage,
		@ng.Inject('navigator') navigator: Navigator
	)
	{
		this._configs.push({
			action: "click",
			label: "Click",
			gamepad: null,
			button: null
		});

		// Storage handling
		const saved = storage.getItem(this.storagePrefix);
		if (saved != null)
		{
			const configs = <GamepadInputConfig[]>JSON.parse(saved);
			for (const config of configs)
			{
				const existing = this.configs.filter(c => c.action == config.action)[0];
				if (existing != null)
				{
					existing.gamepad = config.gamepad;
					existing.button = config.button;
				}
				else
				{
					this._configs.push(config);
				}
			}
		}
		const self = this;
		const storageHandler = {
			set(target: any, key: string, value: any, _receiver: any)
			{
				target[key] = value;

				storage.setItem(self.storagePrefix, JSON.stringify(self._configs))

				return true;
			}
		}
		this._configs = this._configs.map(cfg => new Proxy(cfg, storageHandler));

		// Note: Gamepads are not read correctly when using an Android phone during presentation.
		//       Gamepads are replaced by the single Cardboard gamepad, which has one button.
		const getGamepadState = () =>
			Array.from(navigator.getGamepads())
				.filter(gp => gp != null)
				.map(gp => ({
					id: gp.id,
					index: gp.index, // ID alone is not guaranteed to be unique, so the index is included. Indices are transient though and should not be persisted.
					buttons: gp.buttons.map(b => b.pressed)
				}));

		const createOnAnimationFrame = () =>
		{
			let state = getGamepadState();
			return () =>
			{
				const newState = getGamepadState();
				for (const newEntry of newState)
				{
					const oldEntry = state.filter(e => e.id == newEntry.id && e.index == newEntry.index)[0];
					if (oldEntry == null)
						continue;

					for (let i = 0; i < newEntry.buttons.length; i++)
						// Check for button previously pressed.
						if (oldEntry.buttons[i] == true && newEntry.buttons[i] == false)
							zone.runTask(() =>
							{
								const data = { gamepad: newEntry.id, index: newEntry.index, button: i };
								if (globalConfig.debug)
									console.log(`Gamepad button pressed.`, data);

								this.onButtonPressed.emit(data);
							});
				}

				state = newState;
			}
		};

		this.disposeToken = zone.runOutsideAngular(() => EventUtility.onAnimationFrame(createOnAnimationFrame()));

		this.onButtonPressed.subscribe({
			next: (e: ButtonPressEvent) =>
			{
				const matches = this.configs.filter(cfg => cfg.gamepad == e.gamepad && cfg.button == e.button);
				if (matches.length > 0)
				{
					if (globalConfig.debug)
						console.log("Gamepad action executed.", { action: matches[0].action });

					this.onAction.emit(matches[0].action);
				}
			}
		})
	}

	ngOnDestroy(): void
	{
		this.disposeToken.cancel();
	}
}

export interface GamepadInputConfig
{
	/**
	 * Gets or sets the action associated with the configuration.
	 * Has to be unique.
	 */
	action: string;

	/**
	 * Gets or sets the display label.
	 */
	label: string;

	/**
	 * Gets or sets the gamepad ID associated with the action.
	 */
	gamepad: string | null;
	/**
	 * Gets or sets the button index that invokes the action. Only allowed to be null if gamepad is also null.
	 */
	button: number | null;
}