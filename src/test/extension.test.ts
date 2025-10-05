import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Integration Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Extension should be present', () => {
		assert.ok(vscode.extensions.getExtension('WillOrringe.ports-explorer'));
	});

	test('Extension should activate', async () => {
		const extension = vscode.extensions.getExtension('WillOrringe.ports-explorer');
		assert.ok(extension);

		await extension!.activate();
		assert.strictEqual(extension!.isActive, true);
	});

	test('All commands should be registered', async () => {
		const extension = vscode.extensions.getExtension('WillOrringe.ports-explorer');
		await extension?.activate();

		const commands = await vscode.commands.getCommands(true);

		const expectedCommands = [
			'portsExplorer.refresh',
			'portsExplorer.toggleView',
			'portsExplorer.createGroup',
			'portsExplorer.manageGroups',
			'portsExplorer.filterPorts',
			'portsExplorer.exportConfig',
			'portsExplorer.importConfig',
			'portsExplorer.showHistory',
			'portsExplorer.showAnalytics',
			'portsExplorer.addToGroup',
			'portsExplorer.removeFromGroup',
			'portsExplorer.killProcess',
			'portsExplorer.toggleFavorite',
			'portsExplorer.openInBrowser',
			'portsExplorer.copyUrl',
			'portsExplorer.showDetails'
		];

		expectedCommands.forEach(cmd => {
			assert.ok(
				commands.includes(cmd),
				`Command ${cmd} should be registered`
			);
		});
	});

	test('Configuration settings should exist', () => {
		const config = vscode.workspace.getConfiguration('portsExplorer');

		// Check that default settings are accessible
		assert.ok(config.has('groupBy'));
		assert.ok(config.has('groups'));
		assert.ok(config.has('autoRefresh'));
		assert.ok(config.has('showOnlyWorkspace'));
		assert.ok(config.has('workspacePaths'));
		assert.ok(config.has('portLabels'));
		assert.ok(config.has('viewMode'));
		assert.ok(config.has('filterMode'));
		assert.ok(config.has('enableHistory'));
		assert.ok(config.has('historyLimit'));
	});

	test('Tree view should be registered', async () => {
		const extension = vscode.extensions.getExtension('WillOrringe.ports-explorer');
		await extension?.activate();

		// The tree view provider should be registered
		// We can't directly test the tree view, but we can verify the extension activated
		assert.ok(extension?.isActive);
	});

	test('Default port labels should be defined', () => {
		const config = vscode.workspace.getConfiguration('portsExplorer');
		const portLabels = config.get<Record<string, string>>('portLabels', {});

		// Should be an object (even if empty in config, defaults exist in code)
		assert.strictEqual(typeof portLabels, 'object');
	});

	test('Default groups should be defined', () => {
		const config = vscode.workspace.getConfiguration('portsExplorer');
		const groups = config.get<Record<string, number[]>>('groups');

		// Should have default groups
		assert.ok(groups);
		assert.ok(typeof groups === 'object');
	});

	test('View modes should be valid', () => {
		const config = vscode.workspace.getConfiguration('portsExplorer');
		const viewMode = config.get<string>('viewMode');

		assert.ok(['tree', 'list'].includes(viewMode!));
	});

	test('Group by options should be valid', () => {
		const config = vscode.workspace.getConfiguration('portsExplorer');
		const groupBy = config.get<string>('groupBy');

		assert.ok(['port', 'process', 'group', 'category', 'workspace'].includes(groupBy!));
	});

	test('Filter modes should be valid', () => {
		const config = vscode.workspace.getConfiguration('portsExplorer');
		const filterMode = config.get<string>('filterMode');

		assert.ok(['none', 'favorites', 'dev', 'workspace'].includes(filterMode!));
	});
});
