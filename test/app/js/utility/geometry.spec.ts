import * as test from "tape";
import * as geo from "../../../../app/js/utility/geometry";

const effectivelyZero = (x: number) => Math.abs(x) < 0.00000000001;
const effectivelyEqual = (x: number, y: number) =>
	effectivelyZero(x - y);

test('deg to rad', t =>
{
	t.true(effectivelyEqual(geo.degToRad(0), 0));
	t.true(effectivelyEqual(geo.degToRad(90), Math.PI / 2));
	t.true(effectivelyEqual(geo.degToRad(180), Math.PI));
	t.true(effectivelyEqual(geo.degToRad(360), Math.PI * 2));

	t.end();
})
test('rad to deg', t =>
{
	t.true(effectivelyEqual(geo.radToDeg(0), 0));
	t.true(effectivelyEqual(geo.radToDeg(Math.PI / 2), 90));
	t.true(effectivelyEqual(geo.radToDeg(Math.PI), 180));
	t.true(effectivelyEqual(geo.radToDeg(Math.PI * 2), 360));

	t.end();
})

test('lon/lat to world', t =>
{
	t.deepEqual(
		geo.llarToWorld(0, 0, 0, 1),
		{ x: 0, y: 0, z: 1 }
	);

	// Due to rounding errors some values not necessarily exactly equal

	let p = geo.llarToWorld(0, Math.PI / 2, 0, 1);
	t.true(effectivelyEqual(p.y, 0));
	t.true(effectivelyEqual(p.x, 1));
	t.true(effectivelyEqual(p.z, 0));

	p = geo.llarToWorld(Math.PI / 2, 0, 0, 1);
	t.true(effectivelyEqual(p.y, 1));
	t.true(effectivelyEqual(p.x, 0));
	t.true(effectivelyEqual(p.z, 0));

	t.end()
})

test('world to lon/lat', t =>
{
	// Longitude
	let p = geo.worldToLatLon({ x: -1, y: 0, z: 0 });
	effectivelyEqual(p.lon % 180, 0);
	p = geo.worldToLatLon({ x: 0, y: 0, z: 1 });
	effectivelyEqual(p.lon % 180, -90);
	p = geo.worldToLatLon({ x: 0, y: 0, z: -1 });
	effectivelyEqual(p.lon % 180, 90);

	// Latitude
	p = geo.worldToLatLon({ x: 0, y: 0, z: 0 });
	effectivelyEqual(p.lat, 0);
	p = geo.worldToLatLon({ x: 0, y: 1, z: 0 });
	effectivelyEqual(p.lat, -90);
	p = geo.worldToLatLon({ x: 0, y: -1, z: 0 });
	effectivelyEqual(p.lat, 90);

	t.end();
})