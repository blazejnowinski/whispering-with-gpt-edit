import { Effect, Layer } from 'effect';
import hotkeys from 'hotkeys-js';
import { RegisterShortcutsError, RegisterShortcutsService } from './RegisterShortcutsService';

export const RegisterShortcutsWebLive = Layer.effect(
	RegisterShortcutsService,
	Effect.gen(function* () {
		return {
			isGlobalShortcutEnabled: false,
			defaultLocalShortcut: 'space',
			defaultGlobalShortcut: '',
			unregisterAllLocalShortcuts: () =>
				Effect.try({
					try: () => hotkeys.unbind(),
					catch: (error) =>
						new RegisterShortcutsError({
							title: 'Error unregistering all shortcuts',
							description: error instanceof Error ? error.message : undefined,
							error,
						}),
				}),
			unregisterAllGlobalShortcuts: () =>
				Effect.try({
					try: () => hotkeys.unbind(),
					catch: (error) =>
						new RegisterShortcutsError({
							title: 'Error unregistering all shortcuts',
							description: error instanceof Error ? error.message : undefined,
							error,
						}),
				}),
			registerLocalShortcut: ({ shortcut, callback }) =>
				Effect.try({
					try: () =>
						hotkeys(shortcut, function (event, handler) {
							// Prevent the default refresh event under WINDOWS system
							event.preventDefault();
							callback();
						}),
					catch: (error) =>
						new RegisterShortcutsError({
							title: 'Error registering shortcut',
							description: error instanceof Error ? error.message : undefined,
							error,
						}),
				}),
			registerGlobalShortcut: ({ shortcut, callback }) =>
				Effect.try({
					try: () =>
						hotkeys(shortcut, function (event, handler) {
							// Prevent the default refresh event under WINDOWS system
							event.preventDefault();
							callback();
						}),
					catch: (error) =>
						new RegisterShortcutsError({
							title: 'Error registering shortcut',
							description: error instanceof Error ? error.message : undefined,
							error,
						}),
				}),
		};
	}),
);
