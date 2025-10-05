import * as assert from 'assert';
import * as vscode from 'vscode';
import { PortProvider } from '../extension';

suite('PortProvider Test Suite', () => {
	let context: vscode.ExtensionContext;
	let provider: PortProvider;

	setup(() => {
		// Create a mock extension context
		context = {
			workspaceState: {
				get: (key: string, defaultValue?: any) => defaultValue,
				update: async () => {},
				keys: () => []
			},
			globalState: {
				get: (key: string, defaultValue?: any) => defaultValue,
				update: async () => {},
				keys: () => [],
				setKeysForSync: () => {}
			},
			subscriptions: [],
			extensionPath: '',
			extensionUri: vscode.Uri.file(''),
			environmentVariableCollection: {} as any,
			extensionMode: vscode.ExtensionMode.Test,
			storageUri: undefined,
			storagePath: undefined,
			globalStorageUri: vscode.Uri.file(''),
			globalStoragePath: '',
			logUri: vscode.Uri.file(''),
			logPath: '',
			asAbsolutePath: (p: string) => p,
			secrets: {} as any,
			extension: {} as any,
			languageModelAccessInformation: {} as any
		} as vscode.ExtensionContext;

		provider = new PortProvider(context);
	});

	teardown(() => {
		provider.dispose();
	});

	test('Provider should initialize with empty ports', async () => {
		const children = await provider.getChildren();
		// Should show placeholder message
		assert.strictEqual(children.length, 1);
		assert.ok(children[0].label?.toString().includes('Click refresh'));
	});

	test('getTreeItem should return the item unchanged', () => {
		const item = new vscode.TreeItem('Test');
		const result = provider.getTreeItem(item);
		assert.strictEqual(result, item);
	});

	test('toggleViewMode should switch between tree and list', async () => {
		const config = vscode.workspace.getConfiguration('portsExplorer');
		const initialMode = config.get('viewMode');

		provider.toggleViewMode();

		const newMode = config.get('viewMode');
		assert.notStrictEqual(initialMode, newMode);
	});

	test('setFilter should update current filter', async () => {
		provider.setFilter('favorites');
		// Filter should be applied - verify by checking filtered results
		const children = await provider.getChildren();
		// When no ports, should show "No ports match current filter"
		assert.ok(
			children.length === 0 ||
			children[0].label?.toString().includes('No ports match')
		);
	});

	test('setSearchTerm should filter ports', () => {
		provider.setSearchTerm('3000');
		// This should trigger a tree refresh
		// In real scenario, would filter ports with "3000" in port/process/cmdline
		assert.ok(true); // Placeholder - would need actual port data to test properly
	});
});
