import * as ng from "@angular/core";
import { EventUtility, SubscriptionCancellationToken } from "../../js/utility/events-utility";

/**
 * Renders another video to a canvas.
 */
@ng.Component({
	selector: 'cvr-utility-video-proxy',
	template: `
		<canvas #canvas class="relative center"
				[width]="video.videoWidth"
				[height]="video.videoHeight"
				[style.width]="canvasSize.width"
				[style.height]="canvasSize.height">
		</canvas>
	`,
	styles: [`
		:host
		{
			position: relative;
		}
	`]
})
export class VideoProxyComponent implements ng.OnInit, ng.OnDestroy
{
	@ng.Input() video: HTMLVideoElement;

	@ng.ViewChild("canvas", { read: ng.ElementRef }) canvasRef: ng.ElementRef;
	get canvas(): HTMLCanvasElement { return this.canvasRef.nativeElement }

	animationFrameToken: SubscriptionCancellationToken;

	get canvasSize(): { width: string, height: string }
	{
		const container = this.canvas.parentElement!;
		const aspect = this.video.videoWidth / this.video.videoHeight;
		const cAspect = container.clientWidth / container.clientHeight;

		return {
			width: aspect > cAspect ? "100%" : "auto",
			height: aspect >= cAspect ? "auto" : "100%",
		}
	}

	ngOnInit()
	{
		const context = this.canvas.getContext('2d')!;

		this.animationFrameToken = EventUtility.onAnimationFrame(() =>
		{
			// Only draw on data.
			if (this.video.readyState < 2)
				return;

			context.clearRect(0, 0, this.video.videoWidth, this.video.videoHeight)

			context.drawImage(this.video, 0, 0);
		});
	}
	ngOnDestroy()
	{
		this.animationFrameToken.cancel();
	}
}