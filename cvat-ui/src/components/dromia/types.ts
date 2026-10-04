// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export interface GaitFrame {
    frame_idx: number;
    runner_id: number;
    torso_lean_deg: number | null;
    torso_posture: string;
    left_contact: boolean | null;
    right_contact: boolean | null;
    global_contact: boolean | null;
    left_shoe_score: number | null;
    right_shoe_score: number | null;
    left_ground_y?: number | null;
    right_ground_y?: number | null;
    left_ground_step_index?: number | null;
    right_ground_step_index?: number | null;
    left_tibia_horizontal_angle_deg: number | null;
    right_tibia_horizontal_angle_deg: number | null;
    left_foot_tibia_angle_deg: number | null;
    right_foot_tibia_angle_deg: number | null;
    left_knee_angle_deg: number | null;
    right_knee_angle_deg: number | null;
}

export interface GaitEvent {
    event_id: string;
    side: string;
    landing_frame: number | null;
    takeoff_frame: number | null;
    contact_time_ms: number | null;
    contact_frames: number;
    global_flight_time_ms: number | null;
    foot_strike: 'RFS' | 'MFS' | 'FFS' | null;
    step_length_cm: number | null;
    stride_length_cm: number | null;
    same_foot_flight_time_ms: number | null;
    confidence: number;
    strike_position: number | null;
    strike_contact_fraction: number;
    strike_shoe_score: number;
    strike_direction_source: string;
    strike_threshold_version: string;
    knee_alignment_frame: number | null;
    flexion_braking_time_ms: number | null;
    impulse_propulsion_time_ms: number | null;
    phase_quality: string;
    event_quality: string;
    global_flight_quality: string;
    same_foot_flight_quality: string;
    metric_source: 'automatic';
    landing_tibia_horizontal_angle_deg: number | null;
    landing_foot_tibia_angle_deg: number | null;
    landing_knee_angle_deg: number | null;
    landing_torso_lean_deg: number | null;
    landing_torso_posture: string | null;
    takeoff_tibia_horizontal_angle_deg: number | null;
    takeoff_foot_tibia_angle_deg: number | null;
    takeoff_knee_angle_deg: number | null;
    takeoff_torso_lean_deg: number | null;
    takeoff_torso_posture: string | null;
}

export interface FlightInterval {
    start_frame: number;
    end_frame: number;
    global_flight_time_ms: number | null;
    complete: boolean;
    censored_start: boolean;
    censored_end: boolean;
}

export interface GaitRunner {
    runner_id: number;
    direction: string;
    direction_source: string;
    ground_y_by_side?: Record<'left' | 'right', number | null>;
    ground_y?: number | null;
    summary: {
        contact_count: number;
        flight_count: number;
        mean_contact_time_ms: number | null;
        mean_global_flight_time_ms: number | null;
        mean_same_foot_flight_time_ms: number | null;
        mean_flexion_braking_time_ms: number | null;
        mean_impulse_propulsion_time_ms: number | null;
        cadence_spm: number | null;
        mean_step_length_cm: number | null;
        mean_stride_length_cm: number | null;
    };
    cadence: {
        cadence_spm: number | null;
        is_extrapolated_from_two_contacts: boolean;
        step_interval_count: number;
        step_count: number | null;
        two_step_time_ms: number | null;
        two_step_interval_count: number;
        two_step_censored_interval_count: number;
        window_start_frame: number | null;
        window_end_frame: number | null;
        two_step_intervals: {
            side: string;
            start_frame: number;
            end_frame: number | null;
            two_step_time_ms: number | null;
            complete: boolean;
            censored_end: boolean;
            quality: string;
        }[];
        quality: string;
    };
    spatial: {
        available: boolean;
        reason: string | null;
        mean_step_length_cm: number | null;
        mean_stride_length_cm: number | null;
    };
    global_contact: {
        complete_interval_count: number;
        censored_interval_count: number;
        total_complete_contact_time_ms: number;
        mean_global_contact_time_ms: number | null;
        median_global_contact_time_ms: number | null;
        contact_duty_factor: number | null;
        unknown_frame_count: number;
        quality: string;
    };
    asymmetry: {
        diagnostic: false;
        review_recommended: boolean;
        review_threshold_percent: number;
        metrics: Record<string, {
            left_value: number | null;
            right_value: number | null;
            left_n: number;
            right_n: number;
            absolute_difference: number | null;
            symmetry_index_percent: number | null;
            quality: string;
            review_recommended: boolean;
        }>;
    };
    events: GaitEvent[];
    flight_intervals: FlightInterval[];
    frames: GaitFrame[];
}

export interface GaitAnalysis {
    schema_version: 13;
    source_fps: number;
    real_world_fps: number;
    fps_is_assumed: boolean;
    source_pose: string;
    coordinate_system: string;
    angle_convention: string;
    limitations: string[];
    timebase?: {
        source_fps: number;
        source_frame_count: number;
        timing_source: string;
        unanalyzed_source_frames: number[];
    };
    runners: Record<string, GaitRunner>;
}

export interface DromiaWorkflow {
    schema_version: number;
    task_id: number;
    scope: string;
    runner_id: number | null;
    pose: {
        status: 'not_updated' | 'current' | 'failed';
        source: 'none' | 'automatic_first_pass' | 'reviewed';
        fingerprint: string | null;
        revision: number;
        updated_at: string | null;
        error: string | null;
    };
    metrics: {
        status: 'not_generated' | 'current' | 'stale' | 'failed';
        input_pose_fingerprint: string | null;
        generated_at: string | null;
        stale_reason: string | null;
        error: string | null;
    };
}
