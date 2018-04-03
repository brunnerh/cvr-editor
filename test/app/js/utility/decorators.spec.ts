import * as test from "tape";
import { cachedGetter, cachedFunction } from "../../../../app/js/utility/decorators";

class TestClass
{
	count = 1;

	@cachedGetter()
	get fullyLazy()
	{
		return [];
	}

	@cachedGetter<TestClass>(self => self.count)
	get partiallyLazy()
	{
		return new Array(this.count).fill(0);
	}

	@cachedFunction<TestClass>()
	funcDefault(firstName: string, lastName: string)
	{
		return [firstName, lastName];
	}

	@cachedFunction<TestClass>((self) => self.count)
	funcDependency(firstName: string, lastName: string)
	{
		return [firstName, lastName];
	}

	@cachedFunction<TestClass>(undefined, 3)
	funcSmallCache(firstName: string, lastName: string)
	{
		return [firstName, lastName];
	}
}

test('getter caching - full', t => {
	const o = new TestClass();
	let a = o.fullyLazy;
	let b = o.fullyLazy;
	t.equal(b, a);

	t.end();
});
test('getter caching - partial', t => {
	const o = new TestClass();
	let a = o.partiallyLazy;
	let b = o.partiallyLazy;
	t.equal(b, a);
	t.deepEqual(a, [0]);

	// Change dependency
	o.count++;
	let c = o.partiallyLazy;
	t.notEqual(c, a);

	// Get again
	let d = o.partiallyLazy;
	t.equal(d, c);
	t.deepEqual(c, [0, 0]);

	t.end();
});

test('function caching - args only', t => {
	const o = new TestClass();
	const a = o.funcDefault("first", "last");
	const b = o.funcDefault("first", "last");
	t.equal(b, a);
	t.deepEqual(a, ["first", "last"]);

	// Call for different values
	const x = o.funcDefault("yes", "no");
	t.notDeepEqual(x, b);
	t.deepEqual(x, ["yes", "no"]);
	// Call with previously used values to see if value was cached.
	const c = o.funcDefault("first", "last");
	t.equal(c, a);

	t.end();
});
test('function caching - dependency', t => {
	const o = new TestClass();

	const invoke = () => o.funcDependency("first", "last");
	const a = invoke();
	const b = invoke();
	t.equal(b, a);
	t.deepEqual(a, ["first", "last"]);

	// Change dependency
	o.count++;
	const c = invoke();
	t.notEqual(c, a);
	t.deepEqual(a, ["first", "last"]);

	t.end();
});
test('function caching - cache size', t => {
	const o = new TestClass();
	const invoke = (str: string) =>
	{
		const x1 = o.funcSmallCache(str, str);
		const x2 = o.funcSmallCache(str, str);
		t.equal(x2, x1);
		t.deepEqual(x1, [str, str]);

		return x1;
	}
	const a = invoke("a"); // Cache size: 1/3
	invoke("b");           // Cache size: 2/3
	invoke("c");           // Cache size: 3/3

	const a2 = invoke("a"); // Refreshes "a"
	t.equal(a2, a);

	// Go over cache size
	invoke("d");
	const a3 = invoke("a"); // Refreshes "a"
	t.equal(a3, a);

	// Push "a" out of cache
	// "a" position: 1
	invoke("e"); // "a" position: 2
	invoke("f"); // "a" position: 3
	invoke("g"); // "a" position: -

	const a4 = invoke("a");
	t.notEqual(a4, a);

	t.end();
});