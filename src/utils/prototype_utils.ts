const difference_impl =  <T>(self: Set<T>, other: Set<T>): Set<T>  => {
	const self_keys = self.keys();
	const other_keys = other.keys();
	const result = [];
	for (const key of self_keys) {
		if (!other.has(key)) {
			result.push(key);
		}
	}
	for (const key of other_keys) {
		if (!self.has(key)) {
			result.push(key);
		}
	}
	return new Set(result);
};

const intersection_impl = <T>(self: Set<T>, other: Set<T>): Set<T> => {
	const self_keys = self.keys();
	const result = [];
	for (const key of self_keys) {
		if (other.has(key)) {
			result.push(key);
		}
	}
	return new Set(result);
};

let difference_proto: undefined | (<T>(a: Set<T>, b: Set<T>) => Set<T>);
let intersection_proto: undefined | (<T>(a: Set<T>, b: Set<T>) => Set<T>);
if (Set.prototype.difference) {
	const difference = Set.prototype.difference;
	// eslint breaks with satisfies somehow so using both satisfies and as such that an error will be thrown if there is an issue.
	difference_proto = <T>(a: Set<T>, b: Set<T>) => difference.call(a, b) satisfies Set<T> as Set<T>;
}
if (Set.prototype.intersection) {
	const intersection = Set.prototype.intersection;
	intersection_proto = <T>(a: Set<T>, b: Set<T>) => intersection.call(a, b) satisfies Set<T> as Set<T>;
}

export const difference = difference_proto || difference_impl;
export const intersection = intersection_proto || intersection_impl;
