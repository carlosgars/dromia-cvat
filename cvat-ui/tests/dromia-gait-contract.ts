// Copyright (C) CVAT.ai Corporation
// SPDX-License-Identifier: MIT
import type { GaitEvent, GaitFrame, FlightInterval } from '../src/components/dromia/provider';
import { DROMIA_API_BASE, dromiaTaskAPI } from '../src/components/dromia/api';

type AssertNever<T extends never> = T;
export type RemovedEventFields = AssertNever<Extract<keyof GaitEvent,
    'landing_foot_placement_px' | 'landing_foot_placement_norm' | 'landing_knee_flexion_deg' |
    'landing_hip_leg_angle_deg' | 'flight_time_s' | 'stance_phase_quality' | 'midflight_frame'>>;
export type RemovedFrameFields = AssertNever<Extract<keyof GaitFrame,
    'left_foot_placement_norm' | 'left_knee_flexion_deg' | 'left_hip_leg_angle_deg'>>;
export type NoFlightAlignment = AssertNever<Extract<keyof FlightInterval,
    'midflight_frame' | 'time_to_midflight_s' | 'midflight_is_approximate'>>;
export const canonicalEvent: Pick<GaitEvent, 'contact_frames' | 'contact_time_ms' |
'flexion_braking_time_ms' | 'impulse_propulsion_time_ms' | 'global_flight_time_ms' |
'same_foot_flight_time_ms' | 'foot_strike' | 'knee_alignment_frame'> = {
    contact_frames: 15, contact_time_ms: 150, flexion_braking_time_ms: 70,
    impulse_propulsion_time_ms: 80, global_flight_time_ms: 150,
    same_foot_flight_time_ms: 450, foot_strike: 'MFS', knee_alignment_frame: 17,
};

const routes = dromiaTaskAPI(42);
export const apiBase: '/dromia/api/v1' = DROMIA_API_BASE;
export const contextRoute: '/dromia/api/v1/tasks/42/context' = routes.context;
export const updateRoute: '/dromia/api/v1/tasks/42/pose/update' = routes.poseUpdate;
export const metricsRoute: '/dromia/api/v1/tasks/42/metrics' = routes.metrics;
export const metricsGenerateRoute: '/dromia/api/v1/tasks/42/metrics/generate' = routes.metricsGenerate;
export const exportRoute: '/dromia/api/v1/tasks/42/export' = routes.export;
export const reviewedVideoRoute: '/dromia/api/v1/tasks/42/videos/reviewed' = routes.video('reviewed');
