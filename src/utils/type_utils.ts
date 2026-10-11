
export function isContains<T extends readonly unknown[]>(
	array: T,
	value: unknown,
): value is T[number] {
	return array.includes(value);
}

export function inObject<T extends Record<string, unknown>>(
	obj: T,
	key: unknown,
): key is keyof T {
	return (key as keyof T) in obj;
}
