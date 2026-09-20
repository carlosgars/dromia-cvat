// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

const DROMIA_LABEL = 'runner_lower_body';

interface LabeledResource {
    labels: { name: string }[];
}

export function isDromiaResource(resource: LabeledResource | null | undefined): boolean {
    return Boolean(resource?.labels.some((label) => label.name === DROMIA_LABEL));
}

export function fullCvatRequested(): boolean {
    return new URLSearchParams(window.location.search).has('fullCVAT');
}
