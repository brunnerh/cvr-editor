import * as ng from "@angular/core";
import { SceneViewModel } from "../../js/view-models/editor/scene-view-model";
import { notify } from "../../js/utility/ng-notify";
import { ShapeViewModel } from "../../js/view-models/editor/shapes";
import { EventUtility, SubscriptionCancellationToken } from "../../js/utility/events-utility";
import { cachedGetter, cachedFunction } from "../../js/utility/decorators";
import { DocumentInputState } from "../../js/utility/document-input-state";
import { EditorComponent } from "../editor.component";
import { Point } from "../../js/utility/geometry";

@ng.Component({
	selector: 'cvr-editor-scene-editor',
	template: require("./scene-editor.component.html"),
	styles: [require("./scene-editor.component.less")]
})
export class SceneEditorComponent implements ng.OnInit, ng.OnDestroy
{
	@ng.Input() parent: EditorComponent;

	@ng.Input() scene: SceneViewModel;

	@notify()
	@ng.Input() currentItem: any;
	@ng.Output() currentItemChange = new ng.EventEmitter<any>();

	@ng.Input() video: HTMLVideoElement;


	@ng.ViewChild('scrollContainer', { read: ng.ElementRef }) scrollContainerRef: ng.ElementRef;
	@ng.ViewChild('canvas', { read: ng.ElementRef }) canvasRef: ng.ElementRef;
	@ng.ViewChild('sceneContainer', { read: ng.ElementRef }) sceneContainerRef: ng.ElementRef;
	@ng.ViewChild('videoLayer', { read: ng.ElementRef }) videoLayerRef: ng.ElementRef;

	get scrollContainer(): HTMLDivElement { return this.scrollContainerRef.nativeElement; }
	get canvas(): HTMLDivElement { return this.canvasRef.nativeElement; }
	get sceneContainer(): HTMLDivElement { return this.sceneContainerRef.nativeElement; }
	get videoLayer(): HTMLCanvasElement { return this.videoLayerRef.nativeElement; }

	//TODO: Debug ExpressionChangedAfterItHasBeenCheckedError
	get sceneAspectRatio()
	{
		const canvas = this.videoLayer;

		if (canvas.width == 0)
			return 100;

		return canvas.height / canvas.width * 100;
	}

	/** Gets the canvas size, taking stereoscopy into account. */
	@cachedGetter<SceneEditorComponent>(self => [
		self.video.videoWidth, self.video.videoHeight,
		self.scene,
		self.scene.video
	])
	get canvasSize(): { width: number, height: number }
	{
		const video = this.video;

		const scene = this.scene;
		if (scene.video == null)
		{
			if (video.videoWidth != 0 && video.videoHeight != 0)
			{
				return {
					width: video.videoWidth,
					height: video.videoHeight
				};
			}

			return { width: 0, height: 0 };
		}
		else
		{
			const stereoscopy = scene.video.stereoscopy;
			const heightFactor = stereoscopy == "vertical" ? 0.5 : 1;
			const widthFactor = stereoscopy == "horizontal" ? 0.5 : 1;

			return {
				width: widthFactor * video.videoWidth,
				height: heightFactor * video.videoHeight
			};
		}
	}

	@cachedGetter<SceneEditorComponent>(self => self.canvasSize)
	get svgViewBox()
	{
		const { width, height } = this.canvasSize;

		return `0 0 ${width} ${height}`;
	}

	private renderToken: SubscriptionCancellationToken;

	inputState: DocumentInputState;

	constructor(
		private zone: ng.NgZone,
		@ng.Inject('document') document: Document
	)
	{
		this.inputState = new DocumentInputState(document);
	}

	ngOnInit()
	{
		const el = <HTMLElement>this.scrollContainerRef.nativeElement;
		// Content should be offset exactly by one viewport size
		el.scrollTop = el.clientHeight;
		el.scrollLeft = el.clientWidth;

		// Overlay rendering
		const context = this.videoLayer.getContext("2d")!;
		this.renderToken = this.zone.runOutsideAngular(() => EventUtility.onAnimationFrame(() =>
		{
			// Only draw on data.
			if (this.video.readyState < 2)
				return;

			context.clearRect(0, 0, this.videoLayer.width, this.videoLayer.height);

			context.drawImage(this.video, 0, 0);
		}));
	}

	ngOnDestroy()
	{
		this.renderToken.cancel();
	}

	@cachedFunction<SceneEditorComponent>((self, shape: ShapeViewModel) => [
		self.videoLayer.width,
		self.videoLayer.height,
		shape.getPlanarGeometry()
	])
	calculateShapePoints(shape: ShapeViewModel): Point[][]
	{
		const { width, height } = this.videoLayer;
		return shape.getPlanarGeometry().map(shape => shape.map(p => ({ x: p.x * width, y: p.y * height })));
	}

	@cachedFunction<SceneEditorComponent>()
	createPathData(points: Point[]): string
	{
		return `M ${points.map(p => `${p.x} ${p.y}`).join("L")} Z`;
	}

	private dragging = false;
	private canvasZoom = 1;
	canvasPointerDown(e: PointerEvent)
	{
		this.canvas.setPointerCapture(e.pointerId);
		this.dragging = true;
	}
	canvasPointerUp(e: PointerEvent)
	{
		if (this.dragging)
		{
			this.canvas.releasePointerCapture(e.pointerId)
			this.dragging = false;
		}
	}
	canvasPointerMove(e: PointerEvent)
	{
		if (this.dragging)
		{
			const scroller = this.scrollContainer;
			scroller.scrollLeft -= e.movementX;
			scroller.scrollTop -= e.movementY;
		}
	}

	canvasMouseWheel(e: WheelEvent)
	{
		this.canvasZoom += e.wheelDelta * 0.001;
		this.canvasZoom = Math.max(0.5, this.canvasZoom);
		this.canvasZoom = Math.min(10, this.canvasZoom);

		this.canvas.style.transform = `scale(${this.canvasZoom})`;

		e.preventDefault();
	}

	draggingShape: ShapeViewModel | null = null;
	shapePointerDown(shape: ShapeViewModel, e: PointerEvent)
	{
		const element = <SVGElement>e.target;
		element.setPointerCapture(e.pointerId);
		this.draggingShape = shape;

		e.stopPropagation();
	}
	shapePointerUp(shape: ShapeViewModel, e: PointerEvent)
	{
		if (this.draggingShape == shape)
		{
			const element = <SVGElement>e.target;
			element.releasePointerCapture(e.pointerId)
			this.draggingShape = null;

			e.stopPropagation();
		}
	}
	shapePointerMove(shape: ShapeViewModel, e: PointerEvent)
	{
		if (this.draggingShape == shape)
		{
			// Drag
			if (e.shiftKey == false)
			{
				const scaling = 0.001;
				shape.centerX += e.movementX * scaling;
				shape.centerY += e.movementY * (scaling * 1.5);
			}
			// Shift + Drag
			else
			{
				const factor = 0.005;
				shape.scaleRelative(e.movementX * factor, e.movementY * factor);
			}
			e.preventDefault();
			e.stopPropagation();
		}
	}

	shapeTouchMove(shape: ShapeViewModel, e: TouchEvent)
	{
		// Prevent scrolling
		if (this.draggingShape == shape)
			e.preventDefault();
	}

	trackByIndex(index: number) { return index; }
}