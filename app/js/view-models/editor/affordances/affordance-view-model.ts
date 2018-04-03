import { editorProperty } from "../../../../components/editor/properties.component";
import { StringEditorComponent, BooleanEditorComponent } from "../../../../components/editor/property-editors";
import { SphericalCanvasDisplay } from "../../../3d/spherical-canvas-display";
import { HUD } from "../../../3d/hud";
import { ButtonViewModel } from "../button-view-model";
import { DetailsType } from "../details-type";
import { TreeNode } from "../tree-node";
import { ProjectViewModel } from "../project-view-model";
import { PerspectiveCamera, Vector3, Camera, Frustum, Line3, Matrix4, Object3D } from "three";
import { llarToWorld, uvToLatLon, degToRad, UVPoint, latLonToUV, uvToXY, lonEdgeSplitPath, Point3, Point, xyToUV, toVector3 } from "../../../utility/geometry";
import { LatLonSpherical } from "geodesy";
import { ViewportSettingsViewModel } from "../settings/viewport-settings-view-model";

export abstract class AffordanceViewModel implements TreeNode<ProjectViewModel, null>, DetailsType
{
	private static index = 0;

	readonly detailsType = "affordance";

	readonly children = [];

	/** ID of the affordance, tracks identity. */
	readonly id = AffordanceViewModel.index++;

	/** Gets the type of the affordance, primarily used for deserialization purposes. */
	abstract readonly type: AffordanceType;

	@editorProperty("Name", () => StringEditorComponent)
	name: string = `Affordance ${this.id + 1}`;

	/** Gets or sets whether the affordance is currently enabled. */
	@editorProperty("Enabled", () => BooleanEditorComponent)
	enabled: boolean = true;

	constructor(public parent: ProjectViewModel)
	{

	}

	/**
	 * Renders the affordance to the view.
	 * @param buttons The buttons of the current scene for which an affordance should be rendered.
	 * @param layers The view layers that can be rendered to.
	 * @param metadata Various objects that might be relevant for rendering.
	 */
	abstract render(buttons: ButtonViewModel[], layers: AffordanceLayers, metadata: AffordanceMetadata): void;

	// /**
	//  * Function that should be called once to allow the affordance to execute one-time setup operations
	//  * if necessary.
	//  */
	// initialize(layers: AffordanceLayers, camera: PerspectiveCamera): void
	// {
	// 	layers; camera;
	// }

	//TODO: create and use effective frustum and apply round viewport if specified in viewport settings

	/**
	 * Calculates the frustum for a given camera.
	 * @param cam The camera whose frustum to calculate.
	 */
	protected makeFrustum(cam: Camera)
	{
		return new Frustum().setFromMatrix(
			new Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
	}

	/**
	 * Calculates the world coordinates of a UV point on the viewer sphere.
	 * @param point UV point of object on sphere.
	 * @param radius Radius of sphere.
	 */
	protected toWorldPosition(point: UVPoint, radius: number): Point3
	{
		const ll = uvToLatLon(point);
		const p = llarToWorld(degToRad(ll.lat), degToRad(ll.lon), 0, radius);

		// Transform coordinates to match sphere
		return {
			x: -p.z,
			y: -p.y,
			z: -p.x
		}
	}

	/**
	 * Calculates the screen coordinates of a given point.
	 * @param point The 3D point to project onto the screen.
	 * @param camera The camera which should be used for the projection.
	 * @param width The width of the screen.
	 * @param height The height of the screen.
	 */
	protected toScreenPosition(point: Vector3, camera: Camera, width: number, height: number): Point
	{
		var vector = point.clone();

		var widthHalf = 0.5 * width;
		var heightHalf = 0.5 * height;

		vector.project(camera);

		vector.x = (vector.x * widthHalf) + widthHalf;
		vector.y = - (vector.y * heightHalf) + heightHalf;

		return {
			x: vector.x,
			y: vector.y
		};
	}

	/**
	 * Calculates path segments between two points on a sphere.
	 * @param p1 Start point of path.
	 * @param p2 End point of path.
	 * @param segmentCount The number of segments into which to split the path (seams can add some additional segments).
	 * @param cutThreshold The distance between two points (percentage in range 0 to 1) that has to be exceeded to assume a seam transition.
	 */
	protected planarSpherePath(p1: LatLonSpherical, p2: LatLonSpherical, segmentCount: number, cutThreshold: number)
	{
		const r = 1;
		// Calculate path across sphere
		const distance = p1.distanceTo(p2, r);
		const points = [p1];
		for (let i = 0; i < segmentCount; i++)
		{
			const last = points[points.length - 1];
			const bearing = last.bearingTo(p2);
			const next = last.destinationPoint(distance / segmentCount, bearing, r);

			points.push(next);
		}

		const path = points.map(latLonToUV).map(uvToXY);

		return lonEdgeSplitPath(path, cutThreshold);
	}

	/**
	 * Intersects a path with a frustum, yielding the intersection point in space if any.
	 * @param frustum The frustum to intersect.
	 * @param path The path through the frustum.
	 * @param layers Affordance layers.
	 */
	protected intersectPathWithFrustum(frustum: Frustum, path: Point[][], layers: AffordanceLayers)
	{
		/** Frustum without the far and near planes. */
		const sidePlanes = frustum.planes.slice(0, 4);
		const intersection = path
			.map(seg => seg.map(p => this.toWorldPosition(xyToUV(p), layers.interaction.radius)))
			.map(seg =>
				sidePlanes.map(plane =>
				{
					for (var i = 0; i < seg.length - 2; i++)
					{
						const v1 = toVector3(seg[i]);
						const v2 = toVector3(seg[i + 1]);
						const sect = plane.intersectLine(new Line3(v1, v2));
						if (sect)
							return sect;
					}
					return null;
				}).filter(sect => sect != null))
			.reduce((acc, x) => acc.concat(x), [])
			// Make sure the intersection is actually on the inside of the frustum.
			// (Other intersections are possible because the planes are not bounded.)
			// Does not compare with 0 because of floating point inaccuracy.
			.filter(intersection => sidePlanes.every(p => p.distanceToPoint(intersection!) >= -0.00001))[0];

		return intersection;
	}

	/**
	 * Turns a value into a hex string [00, FF].
	 * @param value Number between 0 and 1.
	 */
	protected hexString(value: number)
	{
		// Cast to any because type defs lack padStart function.
		const rawHex = <any>Math.round(value * 255).toString(16);

		return <string>rawHex.padStart(2, "0");
	}

	/**
	 * Gets a filtered list of buttons and their currently active shapes.
	 * @param buttons The buttons to filter and map.
	 * @param time The current time in seconds.
	 */
	protected buttonsWithActiveShapes(buttons: ButtonViewModel[], time: number)
	{
		return buttons.map(b => ({
			button: b,
			shapes: b.activeShapes(time)
		})).filter(data => data.shapes.length > 0);
	}
}

export type AffordanceType = "shape" | "cursor" | "line" | "halo" | "edge-indicator";

export interface AffordanceLayers
{
	/** The spherical interaction layer.  */
	interaction: SphericalCanvasDisplay;
	/** Root object/container for overlaid 3D elements. */
	overlay: Object3D;
	/** The HUD layer on top of everything. */
	hud: HUD;
}
export interface AffordanceMetadata
{
	colors: {
		primary: string,
		secondary: string,
	};
	cursor: UVPoint;
	cameras: {
		perspective: PerspectiveCamera
	};
	/** Current field of view (vertical) in radians. */
	fov: number;
	viewportSettings: ViewportSettingsViewModel;
	/** Current time in the video in seconds. */
	currentTime: number;
}