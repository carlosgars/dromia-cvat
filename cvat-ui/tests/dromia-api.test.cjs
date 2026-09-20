// Copyright (C) CVAT.ai Corporation
// SPDX-License-Identifier: MIT

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

const apiSource = readFileSync(join(__dirname, '../src/utils/dromia-api.ts'), 'utf8');

test('DromIA exposes only the versioned paper workflow routes', () => {
    for (const route of [
        '/dromia/api/v1',
        '/context',
        '/pose/update',
        '/metrics',
        '/metrics/generate',
        '/export',
        '/videos/${kind}',
    ]) {
        assert.match(apiSource, new RegExp(route.replace(/[/$\{\}]/g, '\\$&')));
    }
    for (const removed of ['metric-overrides', 'review-effort', 'complete-review', 'save-pose']) {
        assert.doesNotMatch(apiSource, new RegExp(removed));
    }
});
