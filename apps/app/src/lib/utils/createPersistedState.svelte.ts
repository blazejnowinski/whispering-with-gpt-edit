import { toast } from '$lib/utils/toast';
import { parseJson } from '@repo/shared';
import { nanoid } from 'nanoid/non-secure';
import type { z } from 'zod';

const attemptMergeStrategy = <TSchema extends z.ZodTypeAny>({
	key,
	valueFromStorage,
	defaultValue,
	schema,
}: {
	key: string;
	valueFromStorage: unknown;
	defaultValue: z.infer<TSchema>;
	schema: TSchema;
	error: z.ZodError;
}): z.infer<TSchema> => {
	const updatingLocalStorageToastId = nanoid();
	toast.loading({
		id: updatingLocalStorageToastId,
		title: `Updating "${key}" in local storage...`,
		description: 'Please wait...',
	});

	// Attempt to merge the default value with the value from storage if possible
	const defaultValueMergedOldValues = {
		...defaultValue,
		...(valueFromStorage as Record<string, unknown>),
	};

	const parseMergedValuesResult = schema.safeParse(defaultValueMergedOldValues);
	if (!parseMergedValuesResult.success) {
		toast.error({
			id: updatingLocalStorageToastId,
			title: `Error updating "${key}" in local storage`,
			description: 'Reverting to default value.',
		});
		return defaultValue;
	}

	const updatedValue = parseMergedValuesResult.data;
	toast.success({
		id: updatingLocalStorageToastId,
		title: `Successfully updated "${key}" in local storage`,
		description: 'The value has been updated.',
	});
	return updatedValue;
};

/**
 * Creates a persisted state object tied to local storage, accessible through `.value`
 */
export function createPersistedState<TSchema extends z.ZodTypeAny>({
	key,
	schema,
	defaultValue,
	disableLocalStorage = false,
	resolveParseErrorStrategy = attemptMergeStrategy,
	onUpdateSuccess,
	onUpdateError,
	onUpdateSettled,
}: {
	/** The key used to store the value in local storage. */
	key: string;
	/**
	 * The schema is used to validate the value from local storage
	 * (`defaultValue` will be used if the value from local storage is invalid).
	 * */
	schema: TSchema;
	/**
	 * The default value to use if no value is found in local storage or the value
	 * from local storage fails to pass the schema.
	 * */
	defaultValue: z.infer<TSchema>;
	/**
	 * If true, disables the use of local storage. In SvelteKit, you set
	 * this to `!browser` because local storage doesn't exist in the server
	 * context.
	 *
	 * @example
	 *
	 * ```ts
	 * import { browser } from '$app/environment';
	 * ...
	 * const state = createPersistedState({ ..., disableLocalStorage: !browser })
	 * ...
	 * ```
	 * */
	disableLocalStorage?: boolean;
	/**
	 * Handler for when the value from storage fails schema validation.
	 * Return a valid value to use it and save to storage.
	 * @default `() => defaultValue`
	 */
	resolveParseErrorStrategy?: (params: {
		/** The key used to store the value in local storage. */
		key: string;
		/** The value from storage that failed schema validation. */
		valueFromStorage: unknown;
		/** The default value to use if the value from storage fails schema validation. */
		defaultValue: z.infer<TSchema>;
		/** The schema used to validate the value from storage. */
		schema: TSchema;
		/** The error that occurred when parsing the value from storage. */
		error: z.ZodError;
	}) => z.infer<TSchema>;
	/**
	 * Handler for when the value from storage is successfully updated.
	 * @default `() => {}`
	 */
	onUpdateSuccess?: () => void;
	/**
	 * Handler for when the value from storage fails to update.
	 * @default `() => {}`
	 */
	onUpdateError?: (error: unknown) => void;
	/**
	 * Handler for when the value from storage update is settled.
	 * @default `() => {}`
	 */
	onUpdateSettled?: () => void;
}) {
	let value = $state(defaultValue);

	const setValueInLocalStorage = (newValue: z.infer<TSchema>) => {
		if (typeof window === 'undefined' || !window.localStorage) {
			onUpdateError?.(new Error('localStorage is not available'));
			onUpdateSettled?.();
			return;
		}

		try {
			const serialized = JSON.stringify(newValue);
			localStorage.setItem(key, serialized);
			onUpdateSuccess?.();
		} catch (error) {
			console.error('Error saving to localStorage:', error);
			onUpdateError?.(error);
		} finally {
			onUpdateSettled?.();
		}
	};

	const parseValueFromStorage = (
		valueFromStorageUnparsed: string | null,
	): z.infer<TSchema> => {
		const isEmpty = valueFromStorageUnparsed === null;
		if (isEmpty) return defaultValue;

		const parseJsonResult = parseJson(valueFromStorageUnparsed);
		if (!parseJsonResult.ok) return defaultValue;
		const valueFromStorageMaybeInvalid = parseJsonResult.data;

		const valueFromStorageResult = schema.safeParse(
			valueFromStorageMaybeInvalid,
		);
		if (valueFromStorageResult.success) return valueFromStorageResult.data;

		const resolvedValue = resolveParseErrorStrategy({
			key,
			valueFromStorage: valueFromStorageMaybeInvalid,
			defaultValue,
			schema,
			error: valueFromStorageResult.error,
		});

		setValueInLocalStorage(resolvedValue);
		return resolvedValue;
	};

	if (!disableLocalStorage) {
		value = parseValueFromStorage(localStorage.getItem(key));
		window.addEventListener('storage', (event: StorageEvent) => {
			if (event.key !== key) return;
			value = parseValueFromStorage(event.newValue);
		});
		window.addEventListener('focus', () => {
			value = parseValueFromStorage(localStorage.getItem(key));
		});
	}

	const state = {
		get value() {
			return value;
		},
		set value(newValue: z.infer<TSchema>) {
			value = schema.parse(newValue);
			if (!disableLocalStorage) setValueInLocalStorage(value);
		},
	};
	
	if (!disableLocalStorage) {
		const storedValue = localStorage.getItem(key);
		if (storedValue) {
			try {
				const parsedValue = JSON.parse(storedValue);
				state.value = parsedValue;
			} catch (error) {
				console.error('Error parsing stored value:', error);
				state.value = defaultValue;
			}
		}
	}
	
	return state;
}
