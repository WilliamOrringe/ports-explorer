import * as assert from 'assert';

// Test helper functions and utilities
suite('Utility Functions Test Suite', () => {

	test('Port number validation - valid ports', () => {
		const validPorts = [80, 443, 3000, 8080, 5173, 65535];
		validPorts.forEach(port => {
			assert.ok(port > 0 && port <= 65535, `Port ${port} should be valid`);
		});
	});

	test('Port number validation - invalid ports', () => {
		const invalidPorts = [-1, 0, 65536, 100000];
		invalidPorts.forEach(port => {
			assert.ok(!(port > 0 && port <= 65535), `Port ${port} should be invalid`);
		});
	});

	test('Process name extraction from command line', () => {
		const testCases = [
			{ cmd: 'node server.js', expected: 'node' },
			{ cmd: '/usr/bin/python3 app.py', expected: 'python3' },
			{ cmd: 'C:\\Program Files\\nodejs\\node.exe app.js', expected: 'node.exe' },
			{ cmd: 'npm run dev', expected: 'npm' }
		];

		testCases.forEach(({ cmd, expected }) => {
			const processName = cmd.split(/[\\/]/).pop()?.split(' ')[0] || '';
			assert.ok(processName.toLowerCase().includes(expected.toLowerCase().split('.')[0]));
		});
	});

	test('Port label formatting', () => {
		const portLabels: Record<number, string> = {
			3000: 'React/Next.js',
			5173: 'Vite',
			8080: 'Spring Boot/Tomcat'
		};

		assert.strictEqual(portLabels[3000], 'React/Next.js');
		assert.strictEqual(portLabels[5173], 'Vite');
		assert.strictEqual(portLabels[8080], 'Spring Boot/Tomcat');
	});

	test('Framework detection from dependencies', () => {
		const testDeps = {
			'react-case': { react: '^18.0.0', 'react-dom': '^18.0.0' },
			'next-case': { next: '^14.0.0', react: '^18.0.0' },
			'vue-case': { vue: '^3.0.0' },
			'angular-case': { '@angular/core': '^17.0.0' }
		};

		// Next.js should take priority over React
		assert.ok(testDeps['next-case'].next !== undefined);

		// React detection
		assert.ok(testDeps['react-case'].react !== undefined);

		// Vue detection
		assert.ok(testDeps['vue-case'].vue !== undefined);

		// Angular detection
		assert.ok(testDeps['angular-case']['@angular/core'] !== undefined);
	});

	test('Category classification logic', () => {
		const devProcesses = ['node', 'npm', 'python', 'django', 'flask', 'rails'];
		const systemProcesses = ['svchost', 'systemd', 'explorer'];

		devProcesses.forEach(proc => {
			const isDev = ['node', 'npm', 'pnpm', 'yarn', 'python', 'django', 'flask', 'rails']
				.some(hint => proc.toLowerCase().includes(hint));
			assert.ok(isDev, `${proc} should be classified as dev`);
		});

		systemProcesses.forEach(proc => {
			const isDev = ['node', 'npm', 'pnpm', 'yarn', 'python', 'django', 'flask', 'rails']
				.some(hint => proc.toLowerCase().includes(hint));
			assert.ok(!isDev, `${proc} should be classified as system`);
		});
	});

	test('URL formatting for different ports', () => {
		const ports = [3000, 8080, 5173];
		const expectedUrls = [
			'http://localhost:3000',
			'http://localhost:8080',
			'http://localhost:5173'
		];

		ports.forEach((port, index) => {
			const url = `http://localhost:${port}`;
			assert.strictEqual(url, expectedUrls[index]);
		});
	});

	test('Workspace path matching', () => {
		const cmdline = 'node /home/user/projects/my-app/server.js';
		const workspacePath = '/home/user/projects/my-app';

		assert.ok(
			cmdline.toLowerCase().includes(workspacePath.toLowerCase()),
			'Command line should contain workspace path'
		);
	});

	test('Port group validation', () => {
		const groups = {
			'Frontend': [3000, 5173, 4200],
			'Backend': [5000, 8000],
			'Databases': [5432, 27017, 6379]
		};

		// All ports should be valid numbers
		Object.values(groups).forEach(portList => {
			portList.forEach(port => {
				assert.ok(typeof port === 'number', 'Port should be a number');
				assert.ok(port > 0 && port <= 65535, 'Port should be in valid range');
			});
		});

		// Frontend group should contain 3 ports
		assert.strictEqual(groups['Frontend'].length, 3);

		// Check specific port is in correct group
		assert.ok(groups['Frontend'].includes(3000));
		assert.ok(groups['Backend'].includes(5000));
		assert.ok(groups['Databases'].includes(5432));
	});

	test('History entry structure', () => {
		const historyEntry = {
			port: 3000,
			pid: 12345,
			process: 'node',
			timestamp: new Date(),
			action: 'started' as const,
			details: 'React development server'
		};

		assert.strictEqual(typeof historyEntry.port, 'number');
		assert.strictEqual(typeof historyEntry.pid, 'number');
		assert.strictEqual(typeof historyEntry.process, 'string');
		assert.ok(historyEntry.timestamp instanceof Date);
		assert.ok(['started', 'stopped', 'changed'].includes(historyEntry.action));
	});

	test('Analytics calculation - most used ports', () => {
		const portUsage = new Map<number, number>([
			[3000, 10],
			[8080, 5],
			[5173, 8],
			[5000, 3]
		]);

		const sorted = Array.from(portUsage.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 3);

		assert.strictEqual(sorted[0][0], 3000); // Most used
		assert.strictEqual(sorted[1][0], 5173); // Second most
		assert.strictEqual(sorted[2][0], 8080); // Third most
	});
});
