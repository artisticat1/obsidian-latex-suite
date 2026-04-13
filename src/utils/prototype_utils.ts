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

// @ts-ignore
const difference_proto: typeof difference_impl = Set.prototype?.difference && ((a,b) => a.difference(b))
// @ts-ignore
const intersection_proto: typeof intersection_impl = Set.prototype?.intersection && ((a,b) => a.intersection(b))

export const difference = difference_proto || difference_impl;
export const intersection = intersection_proto || intersection_impl;
