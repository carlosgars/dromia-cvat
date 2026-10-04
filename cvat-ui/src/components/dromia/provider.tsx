// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { dromiaJSON, dromiaTaskAPI } from './api';
import type { DromiaWorkflow, GaitAnalysis, GaitFrame } from './types';

export type {
    DromiaWorkflow, FlightInterval, GaitAnalysis, GaitEvent, GaitFrame, GaitRunner,
} from './types';

interface GaitContextValue {
    workflow: DromiaWorkflow | null;
    workflowLoading: boolean;
    analysis: GaitAnalysis | null;
    loading: boolean;
    error: string | null;
    overlayEnabled: boolean;
    selectedRunnerID: number | null;
    frameIndex: ReadonlyMap<number, ReadonlyMap<number, GaitFrame>>;
    setOverlayEnabled(enabled: boolean): void;
    setSelectedRunnerID(runnerID: number): void;
    refreshWorkflow(): Promise<DromiaWorkflow | null>;
    refresh(): Promise<void>;
}

const defaultValue: GaitContextValue = {
    workflow: null,
    workflowLoading: false,
    analysis: null,
    loading: false,
    error: null,
    overlayEnabled: false,
    selectedRunnerID: null,
    frameIndex: new Map(),
    setOverlayEnabled: () => undefined,
    setSelectedRunnerID: () => undefined,
    refreshWorkflow: async () => null,
    refresh: async () => undefined,
};

const DromiaGaitContext = createContext<GaitContextValue>(defaultValue);

interface ProviderProps {
    taskID: number;
    enabled: boolean;
    children: React.ReactNode;
}

export function DromiaGaitProvider({
    taskID, enabled, children,
}: ProviderProps): JSX.Element {
    const [workflow, setWorkflow] = useState<DromiaWorkflow | null>(null);
    const [workflowLoading, setWorkflowLoading] = useState(false);
    const [analysis, setAnalysis] = useState<GaitAnalysis | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedRunnerID, setSelectedRunnerID] = useState<number | null>(null);
    const requestID = useRef(0);
    const workflowRequestID = useRef(0);
    const [overlayEnabled, setOverlayEnabledState] = useState(false);

    useEffect(() => () => {
        requestID.current += 1;
        workflowRequestID.current += 1;
    }, [enabled, taskID]);

    const refreshWorkflow = useCallback(async (): Promise<DromiaWorkflow | null> => {
        if (!enabled) return null;
        const currentRequestID = workflowRequestID.current + 1;
        workflowRequestID.current = currentRequestID;
        setWorkflowLoading(true);
        try {
            const payload = await dromiaJSON<DromiaWorkflow>(
                dromiaTaskAPI(taskID).context,
                { cache: 'no-store' },
            );
            if (workflowRequestID.current !== currentRequestID) return null;
            setWorkflow(payload);
            setError(null);
            return payload;
        } catch (caught) {
            if (workflowRequestID.current !== currentRequestID) return null;
            setWorkflow(null);
            setError(caught instanceof Error ? caught.message : 'Could not load DromIA workflow');
            return null;
        } finally {
            if (workflowRequestID.current === currentRequestID) setWorkflowLoading(false);
        }
    }, [enabled, taskID]);

    const refresh = useCallback(async (): Promise<void> => {
        if (!enabled) return;
        const currentRequestID = requestID.current + 1;
        requestID.current = currentRequestID;
        setLoading(true);
        setError(null);
        try {
            const payload = await dromiaJSON<GaitAnalysis>(
                dromiaTaskAPI(taskID).metrics,
                { cache: 'no-store' },
            );
            if (requestID.current !== currentRequestID) return;
            const runnerIDs = Object.keys(payload.runners).map(Number).sort((a, b) => a - b);
            setAnalysis(payload);
            setSelectedRunnerID((current) => (
                current !== null && runnerIDs.includes(current) ? current : runnerIDs[0] ?? null
            ));
        } catch (caught) {
            if (requestID.current !== currentRequestID) return;
            setAnalysis(null);
            setError(caught instanceof Error ? caught.message : 'Could not load gait analysis');
        } finally {
            if (requestID.current === currentRequestID) setLoading(false);
        }
    }, [enabled, taskID]);

    useEffect(() => {
        refreshWorkflow();
    }, [refreshWorkflow]);

    const metricsCurrent = workflow?.metrics.status === 'current' &&
        workflow.metrics.input_pose_fingerprint === workflow.pose.fingerprint;

    useEffect(() => {
        if (metricsCurrent) {
            refresh();
        } else {
            setAnalysis(null);
            setSelectedRunnerID(null);
            setOverlayEnabledState(false);
        }
    }, [metricsCurrent, refresh]);

    const setOverlayEnabled = useCallback((value: boolean): void => {
        setOverlayEnabledState(value);
    }, []);

    const frameIndex = useMemo(() => new Map(
        Object.entries(analysis?.runners || {}).map(([runnerID, runner]) => [
            Number(runnerID),
            new Map(runner.frames.map((frame) => [frame.frame_idx, frame])),
        ]),
    ), [analysis]);

    const value = useMemo((): GaitContextValue => ({
        workflow,
        workflowLoading,
        analysis,
        loading,
        error,
        overlayEnabled,
        selectedRunnerID,
        frameIndex,
        setOverlayEnabled,
        setSelectedRunnerID,
        refreshWorkflow,
        refresh,
    }), [
        workflow,
        workflowLoading,
        analysis,
        loading,
        error,
        overlayEnabled,
        selectedRunnerID,
        frameIndex,
        setOverlayEnabled,
        refreshWorkflow,
        refresh,
    ]);

    return <DromiaGaitContext.Provider value={value}>{children}</DromiaGaitContext.Provider>;
}

export function useDromiaGait(): GaitContextValue {
    return useContext(DromiaGaitContext);
}
