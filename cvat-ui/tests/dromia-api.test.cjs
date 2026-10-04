// Copyright (C) CVAT.ai Corporation
// SPDX-License-Identifier: MIT

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

function loadTypeScript(path) {
    const source = readFileSync(path, 'utf8');
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const loaded = { exports: {} };
    new Function('exports', 'module', 'require', compiled)(loaded.exports, loaded, require);
    return loaded.exports;
}

const apiModule = loadTypeScript(join(__dirname, '../src/components/dromia/api.ts'));
const { DROMIA_API_BASE, dromiaTaskAPI } = apiModule;

test('DromIA constructs only the versioned paper workflow routes', () => {
    assert.equal(DROMIA_API_BASE, '/dromia/api/v1');
    const routes = dromiaTaskAPI(42);
    assert.deepEqual(Object.keys(routes).sort(), [
        'context', 'export', 'metrics', 'metricsGenerate', 'poseUpdate', 'video',
    ]);
    assert.equal(routes.context, '/dromia/api/v1/tasks/42/context');
    assert.equal(routes.poseUpdate, '/dromia/api/v1/tasks/42/pose/update');
    assert.equal(routes.metrics, '/dromia/api/v1/tasks/42/metrics');
    assert.equal(routes.metricsGenerate, '/dromia/api/v1/tasks/42/metrics/generate');
    assert.equal(routes.export, '/dromia/api/v1/tasks/42/export');
    assert.equal(routes.video('reviewed'), '/dromia/api/v1/tasks/42/videos/reviewed');
});

test('DromIA mode has an explicit full-CVAT escape path', () => {
    const { fullCvatRequested, isDromiaResource } = loadTypeScript(
        join(__dirname, '../src/components/dromia/mode.ts'),
    );
    global.window = { location: { search: '?fullCVAT=1' } };
    assert.equal(isDromiaResource({ labels: [{ name: 'runner_lower_body' }] }), true);
    assert.equal(isDromiaResource({ labels: [{ name: 'person' }] }), false);
    assert.equal(fullCvatRequested(), true);
    global.window.location.search = '';
    assert.equal(fullCvatRequested(), false);
    delete global.window;
});
