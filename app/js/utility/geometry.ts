import { LatLonSpherical } from "geodesy";
import { Vector3 } from "three";

/** Interface for a point in XY coordinates. */
export interface Point
{
	/** Gets the X-Axis component. */
	readonly x: number;
	/** Gets the Y-Axis component. */
	readonly y: number;
};
export interface Point3
{
	/** Gets the X-Axis component. */
	readonly x: number;
	/** Gets the Y-Axis component. */
	readonly y: number;
	/** Gets the Z-Axis component. */
	readonly z: number;
}

/** Interface for a point in UV coordinates. */
export interface UVPoint
{
	/** Gets the U-Axis component. */
	readonly u: number;
	/** Gets the V-Axis component. */
	readonly v: number;
}

/** Interface for a cartesian circle with unspecified units. */
export interface Circle
{
	/** The X coordinate of the center. */
	cx: number;
	/** The Y coordinate of the center. */
	cy: number;
	/** The radius of the circle. */
	r: number;
}

/** For equivalent coordinates, maps X to U and Y to V. */
export function xyToUV(p: Point): UVPoint
{
	return { u: p.x, v: p.y }
}
/** For equivalent coordinates, maps U to X and V to Y. */
export function uvToXY(p: UVPoint): Point
{
	return { x: p.u, y: p.v }
}

/** Converts degrees to radians. */
export function degToRad(deg: number)
{
	return deg / 180 * Math.PI;
}
export function radToDeg(rad: number)
{
	return rad / Math.PI * 180;
}

/** Converts a UV point to a LatLonSpherical object. */
export function uvToLatLon(p: UVPoint): LatLonSpherical
{
	return new LatLonSpherical(p.v * 180 - 90, p.u * 360 - 180);
}
/**
 * Converts a LatLonSpherical object to a UV point.
 * This is equivalent to an equirectangular Projection.
 */
export function latLonToUV(ll: LatLonSpherical): UVPoint
{
	// Re-center
	const long = degToRad(ll.lon) + Math.PI;
	const lat = degToRad(ll.lat) + (Math.PI / 2);

	// Map to [0; 1] range
	const u = long / (Math.PI * 2);
	const v = lat / Math.PI;

	return { u, v };
}

/**
 * Calculates the virtual intersection (y coordinate) of the line between two points with the longitudinal edge on the left side (x = 0).
 * The point order is irrelevant.
 */
export function lonEdgeIntersection(p1: Point, p2: Point): number
{
	if (p1.x == 0)
		return p1.y;
	if (p2.x == 0)
		return p2.y;

	const l = p1.x > p2.x ? p2 : p1;
	const r = p1.x > p2.x ? p1 : p2;
	// Shift right point
	const sr = { x: r.x - 1, y: r.y };

	// Quick maths:

	// f(x) = m * x + t
	// f(p1.x) = p1.y => p1.y = m * p1.x + t
	// f(p2.x) = p2.y => p2.y = m * p2.x + t
	// p1.y - p2.y = m * p1.x - m * p2.x
	// p1.y - p2.y = m * (p1.x - p2.x)
	// m = (p1.y - p2.y) / (p1.x - p2.x)

	// p1.y = m * p1.x + t
	// t = p1.y - (m * p1.x)

	const m = (l.y - sr.y) / (l.x - sr.x);
	const t = l.y - m * l.x;

	return t;
};

/**
 * Finds cut positions for a path that might cross the longitudinal edge.
 * The indices refer to the first point of a segment across the edge.
 * @param points The path specified by a list of points.
 * @param threshold The minimal distance between points at which an edge transition will be assumed.
 */
export function lonEdgeCutIndices(points: Point[], threshold: number = 0.95): number[]
{
	const cuts: number[] = [];
	for (let i = 0; i < points.length; i++)
	{
		const p1 = points[i];
		const p2 = points[(i + 1) % points.length];
		// If the horizontal distance between the points is close to the full width, assume a seam transition.
		if (Math.abs(p1.x - p2.x) > threshold)
			cuts.push(i + 1);
	}

	return cuts;
}

/**
 * Performs edge splitting and pole capping.
 * @param points The original shape.
 * @param threshold The minimal distance between points at which an edge transition/pole envelopment will be assumed.
 */
export function splitAndCap(points: Point[], threshold = 0.95): Point[][]
{
	const split = lonEdgeSplitShape(points, threshold);
	const capped = capPoles(split, threshold);

	return capped;
}

/**
 * Splits a shape that appears to be crossing the horizontal seam into multiple parts.
 * @param points The points making up the shape.
 * @param threshold The minimal distance between points at which an edge transition will be assumed.
 */
export function lonEdgeSplitShape(points: Point[], threshold = 0.95): Point[][]
{
	const cuts: number[] = lonEdgeCutIndices(points, threshold);
	if (cuts.length == 0)
		return [points];

	/**
	 * Creates a segment with caps at the seams from a raw segment.
	 * @param segment The raw segment to process.
	 * @param iStart The index of the first point in the segment within the points array.
	 * @param iEnd The index of the last point in the segment within the points array.
	 */
	const makeCleanSegment = (segment: Point[], iStart: number, iEnd: number): Point[] =>
	{
		const pointStart = segment[0];
		const pointEnd = segment[segment.length - 1];
		const pointBefore = points[(iStart - 1) % points.length];
		const pointAfter = points[(iEnd + 1) % points.length];

		// Spans full width
		if (iStart == iEnd)
		{
			const ascending = pointStart.x < pointEnd.x;
			const y = lonEdgeIntersection(pointBefore, pointStart);
			return (<Point[]>[]).concat(
				[{ x: ascending ? 0 : 1, y: y }],
				segment,
				[{ x: ascending ? 1 : 0, y: y }]
			);
		}

		const isLeftOfSeam = pointStart.x > pointBefore.x;
		return (<Point[]>[]).concat(
			[{ x: isLeftOfSeam ? 1 : 0, y: lonEdgeIntersection(pointBefore, pointStart) }],
			segment,
			[{ x: isLeftOfSeam ? 1 : 0, y: lonEdgeIntersection(pointEnd, pointAfter) }]
		);
	};

	const shapes: Point[][] = [];

	for (let i = 0; i < cuts.length - 1; i++)
	{
		const iStart = cuts[i];
		const iEnd = cuts[i + 1];
		const segment = points.slice(iStart, iEnd);

		shapes.push(makeCleanSegment(segment, iStart, iEnd));
	}
	//Special handling for last segment that goes across array seam.
	const lastIStart = cuts[cuts.length - 1];
	const lastIEnd = cuts[0];
	const lastSegment = points.slice(lastIStart).concat(points.slice(0, lastIEnd))
	shapes.push(makeCleanSegment(lastSegment, lastIStart, lastIEnd));

	return shapes;
}


/**
 * Splits a path that appears to be crossing the horizontal seam into multiple parts.
 * @param points The points making up the path.
 * @param threshold The minimal distance between points at which an edge transition will be assumed.
 */
export function lonEdgeSplitPath(points: Point[], threshold = 0.95): Point[][]
{
	const cuts: number[] = lonEdgeCutIndices(points, threshold);
	if (cuts.length == 0)
		return [points];

	cuts.unshift(0)
	cuts.push(points.length);

	const rawSegments: Point[][] = [];
	for (let i = 0; i < cuts.length - 1; i++)
	{
		const iStart = cuts[i];
		const iEnd = cuts[i + 1];
		const segment = points.slice(iStart, iEnd);

		if (segment.length > 0)
			rawSegments.push(segment);
	}
	// Calculate and add edge intersection points
	for (let i = 0; i < rawSegments.length - 1; i++)
	{
		const seg1 = rawSegments[i];
		const seg2 = rawSegments[i + 1];
		const p1 = seg1[seg1.length - 1];
		const p2 = seg2[0];
		const y = lonEdgeIntersection(p1, p2);

		const direction = p1.x < p2.x;
		const x1 = direction ? 0 : 1;
		const x2 = direction ? 1 : 0;

		seg1.push({ x: x1, y: y });
		seg2.unshift({ x: x2, y: y });
	}

	return rawSegments;
}

/**
 * Checks segments for pole envelopments and adds points to cover the entire pole.
 * @param pathSegments The segments to process (the arrays are modified).
 * @param threshold The horizontal threshold at which a pole envelopment is assumed.
 */
export function capPoles(pathSegments: Point[][], threshold = 0.95): Point[][]
{
	// Account for poles
	for (let segment of pathSegments)
	{
		if (segment.length < 2)
			continue;

		const sorted = segment.slice().sort((a, b) => a.x - b.x);
		const p1 = sorted[0];
		const p2 = sorted[sorted.length - 1];
		if (p2.x - p1.x < threshold)
			continue;

		
		const y = sorted[0].y < 0.5 ? 0 : 1;
		const i1 = segment.indexOf(p1);
		const i2 = segment.indexOf(p2);
		const order = i1 < i2;
		segment.unshift({ x: order ? 0 : 1, y: y });
		segment.push({ x: order ? 1 : 0, y: y });
	}

	return pathSegments;
}

/**
 * Calculates the 3D world coordinates of a point on a sphere specified by longitude, latitude, altitude and radius.
 * { lon: 0, lat: 0 } => { x: 0, y: 0, z: 1 }
 * { lon: Math.PI / 2, lat: 0 } => { x: 1, y: 0, z: 0 }
 * @param radLat The latitude in radians.
 * @param radLon The longitude in radians.
 * @param altitude The altitude in any unit.
 * @param radius The radius in any unit.
 */
export function llarToWorld(radLat: number, radLon: number, altitude: number, radius: number): Point3
{
	// http://www.mathworks.de/help/toolbox/aeroblks/llatoecefposition.html
	const f = 0 // flattening
	const ls = Math.atan((1 - f) ** 2 * Math.tan(radLat)) // lambda

	const x = radius * Math.cos(ls) * Math.cos(radLon) + altitude * Math.cos(radLat) * Math.cos(radLon)
	const y = radius * Math.cos(ls) * Math.sin(radLon) + altitude * Math.cos(radLat) * Math.sin(radLon)
	const z = radius * Math.sin(ls) + altitude * Math.sin(radLat)

	// Transform coordinate system to three.js.
	return { x: y, y: z, z: x }
}

/**
 * Converts world coordinates to longitude and latitude. Values are always positive.
 * @param point Point in world coordinates, sphere center is assumed to be at (0, 0, 0).
 *              Negative X axis => lon = 0.
 *              Positive Z axis => lon = 270.
 */
export function worldToLatLon(point: Point3): LatLonSpherical
{
	const lon = Math.atan2(point.z, point.x) - Math.PI;
	const zx = Math.sqrt(point.x * point.x + point.z * point.z);
	const lat = -Math.atan2(point.y, zx);

	const lonDeg = (radToDeg(lon) + 360) % 360;
	const latDeg = (radToDeg(lat) + 180) % 180;

	return new LatLonSpherical(latDeg, lonDeg);
}

/**
 * Converts any plain point object to three.js vector.
 * @param point Point to convert.
 */
export function toVector3(point: Point3)
{
	return new Vector3(point.x, point.y, point.z);
}

/**
 * Calculates planar shapes for a circle.
 * @param circle The circle definition.
 * @param samples The number of samples for the shape approximation.
 * @param threshold The minimal distance between points at which an edge transition will be assumed.
 */
export function planePointsCircle(circle: Circle, samples: number, threshold = 0.95): Point[][]
{
	const { cx, cy, r } = circle;

	const sphere = new LatLonSpherical(cy * 180 - 90, cx * 360 - 180);
	const step = 360 / samples;
	const points: Point[] = [];
	for (var i = 0; i < 360; i += step)
	{
		const point = sphere.destinationPoint(r, i, 1);
		points.push(uvToXY(latLonToUV(point)));
	}

	return splitAndCap(points, threshold);
}