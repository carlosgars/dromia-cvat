// Copyright (C) CVAT.ai Corporation
// SPDX-License-Identifier: MIT

export const DROMIA_API_BASE = '/dromia/api/v1' as const;

type TaskRoute<TaskID extends number, Suffix extends string> =
    `/dromia/api/v1/tasks/${TaskID}/${Suffix}`;

export const dromiaTaskAPI = <TaskID extends number>(taskID: TaskID): {
    context: TaskRoute<TaskID, 'context'>;
    poseUpdate: TaskRoute<TaskID, 'pose/update'>;
    metrics: TaskRoute<TaskID, 'metrics'>;
    metricsGenerate: TaskRoute<TaskID, 'metrics/generate'>;
    export: TaskRoute<TaskID, 'export'>;
    video: <Kind extends 'reviewed' | 'comparison' | 'gait'>(kind: Kind) =>
    TaskRoute<TaskID, `videos/${Kind}`>;
} => ({
    context: `${DROMIA_API_BASE}/tasks/${taskID}/context` as TaskRoute<TaskID, 'context'>,
    poseUpdate: `${DROMIA_API_BASE}/tasks/${taskID}/pose/update` as TaskRoute<TaskID, 'pose/update'>,
    metrics: `${DROMIA_API_BASE}/tasks/${taskID}/metrics` as TaskRoute<TaskID, 'metrics'>,
    metricsGenerate: `${DROMIA_API_BASE}/tasks/${taskID}/metrics/generate` as TaskRoute<TaskID, 'metrics/generate'>,
    export: `${DROMIA_API_BASE}/tasks/${taskID}/export` as TaskRoute<TaskID, 'export'>,
    video: <Kind extends 'reviewed' | 'comparison' | 'gait'>(kind: Kind): TaskRoute<TaskID, `videos/${Kind}`> =>
        `${DROMIA_API_BASE}/tasks/${taskID}/videos/${kind}` as TaskRoute<TaskID, `videos/${Kind}`>,
});
