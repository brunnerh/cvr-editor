import * as ng from '@angular/core';

@ng.Component({
	selector: 'cvr-editor-timeline',
	template: require('./timeline.component.html')
})
export class TimelineComponent
{
	private updateIntervalHandle: number;

	private _video: HTMLVideoElement | null = null;
	@ng.Input()
	get video() { return this._video; }
	set video(value: HTMLVideoElement | null)
	{
		if (this._video != null)
		{
			this._video.removeEventListener("play", this)
			this._video.removeEventListener("pause", this)
		}

		this._video = value;

		if (this._video != null)
		{
			this._video.addEventListener("play", this)
			this._video.addEventListener("pause", this)
		}
	}

	constructor(
		@ng.Inject("window") private window: Window,
		private cd: ng.ChangeDetectorRef
	)
	{
	}

	handleEvent(e: Event)
	{
		(<any>this)[`on${e.type}`](e);
	}

	onplay()
	{
		// (If pause did not fire for whatever reason.)
		this.window.clearInterval(this.updateIntervalHandle);

		// During playback, check component every second.
		this.updateIntervalHandle = this.window.setInterval(() => {
			this.cd.markForCheck()
		}, 1000);
	}
	onpause()
	{
		this.window.clearInterval(this.updateIntervalHandle);
	}
}