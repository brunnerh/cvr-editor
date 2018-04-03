import * as ng from "@angular/core";

/** Service for event and head direction data tracking. */
@ng.Injectable()
export class DataTrackingService
{
	private readonly _headDirections: VRHeadDirectionEntry[] = []
	get headDirections(): ReadonlyArray<VRHeadDirectionEntry> { return this._headDirections; }

	private readonly _events: VRInteractionEvent[] = []
	get events(): ReadonlyArray<VRInteractionEvent> { return this._events; }

	logHeadDirection(scene: { name: string }, seekPosition: number, x: number, y: number)
	{
		this._headDirections.push({
			timestamp: new Date(),
			scene: scene,
			seekPosition: seekPosition,
			x: x,
			y: y
		});
	}

	logEvent(scene: { name: string }, type: TrackingEventType, target?: { name: string })
	{
		this._events.push({
			timestamp: new Date(),
			scene: scene,
			type: type,
			target: target
		});
	}

	/** Resets all tracked data. */
	reset()
	{
		this._headDirections.length = 0;
		this._events.length = 0;
	}
}

export interface VRInteractionEvent
{
	timestamp: Date;
	/** The current scene. */
	scene: { name: string };
	/** The type of the event. */
	type: TrackingEventType;
	/** The target object of the event. */
	target?: { name: string };
}

export interface VRHeadDirectionEntry
{
	timestamp: Date;
	/** The current scene. */
	scene: { name: string };
	/** Current time in the video. */
	seekPosition: number;
	/** Longitude in degrees. */
	x: number;
	/** Latitude in degrees. */
	y: number;
}

export type TrackingEventType =
	"enter-vr" | // Entering VR presentation mode
	"exit-vr" | // Exiting VR presentation mode
	"hover-in" | // Start hover on a button
	"hover-out" | // End hover on a button
	"overlay-click" | // An overlay was clicked
	"button-click"   // Button was clicked