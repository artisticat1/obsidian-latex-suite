
export function isContains<T extends readonly unknown[]>(
	array: T,
	value: unknown,
): value is T[number] {
	return array.includes(value);
}
