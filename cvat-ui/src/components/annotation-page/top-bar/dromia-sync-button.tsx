// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    BarChartOutlined,
    DownloadOutlined,
    EyeInvisibleOutlined,
    EyeOutlined,
    LineChartOutlined,
    SyncOutlined,
    VideoCameraOutlined,
} from '@ant-design/icons';
import Button from 'antd/lib/button';
import Checkbox from 'antd/lib/checkbox';
import message from 'antd/lib/message';
import Tag from 'antd/lib/tag';

import { CombinedState } from 'reducers';
import { Job, ObjectState, ShapeType } from 'cvat-core-wrapper';
import {
    fetchAnnotationsAsync,
    saveAnnotationsAsync,
    updateAnnotationsAsync,
} from 'actions/annotation-actions';
import CVATTooltip from 'components/common/cvat-tooltip';
import { dromiaTaskAPI } from 'utils/dromia-api';
import DromiaGaitDrawer from './dromia-gait-drawer';
import { useDromiaGait } from '../dromia-gait-context';

const DROMIA_LABEL = 'runner_lower_body';
const FRAME_GROUND_TRUTH_ATTRIBUTE = 'frame_ground_truth';

interface GroundTruthState {
    attributeID: number;
    state: ObjectState;
}

function DromiaSyncButton(): JSX.Element {
    const dispatch = useDispatch();
    const job = useSelector((state: CombinedState) => state.annotation.job.instance as Job);
    const objectStates = useSelector((state: CombinedState) => state.annotation.annotations.states);
    const jobAttributes = useSelector((state: CombinedState) => state.annotation.job.attributes);
    const [syncing, setSyncing] = useState(false);
    const [generatingMetrics, setGeneratingMetrics] = useState(false);
    const [updatingGroundTruth, setUpdatingGroundTruth] = useState(false);
    const [gaitOpen, setGaitOpen] = useState(false);
    const {
        workflow,
        workflowLoading,
        overlayEnabled,
        setOverlayEnabled,
        refresh: refreshGait,
        refreshWorkflow,
    } = useDromiaGait();
    const poseCurrent = workflow?.pose.status === 'current';
    const metricsCurrent = workflow?.metrics.status === 'current' &&
        workflow.metrics.input_pose_fingerprint === workflow.pose.fingerprint;
    const metricsStale = workflow?.metrics.status === 'stale';
    let metricsButtonLabel = 'Generate Metrics';
    if (generatingMetrics) {
        metricsButtonLabel = 'Generating...';
    } else if (metricsCurrent) {
        metricsButtonLabel = 'Regenerate';
    }

    const groundTruthStates = useMemo((): GroundTruthState[] => objectStates.reduce(
        (accumulator: GroundTruthState[], state: ObjectState): GroundTruthState[] => {
            if (state.label.name !== DROMIA_LABEL || state.shapeType !== ShapeType.SKELETON || state.parentID !== null) {
                return accumulator;
            }
            const attribute = (jobAttributes[state.label.id as number] || [])
                .find((candidate) => candidate.name === FRAME_GROUND_TRUTH_ATTRIBUTE);
            if (attribute) {
                accumulator.push({ attributeID: attribute.id as number, state });
            }
            return accumulator;
        }, [],
    ), [objectStates, jobAttributes]);
    const groundTruthCount = groundTruthStates.filter(
        ({ attributeID, state }) => state.attributes[attributeID] === 'true',
    ).length;
    const frameGroundTruth = groundTruthStates.length > 0 && groundTruthCount === groundTruthStates.length;
    const frameGroundTruthPartial = groundTruthCount > 0 && !frameGroundTruth;

    const onGroundTruthChange = async (checked: boolean): Promise<void> => {
        setUpdatingGroundTruth(true);
        try {
            const statesToUpdate = groundTruthStates.map(({ attributeID, state }) => {
                // CVAT ObjectState exposes attributes through its mutable update API.
                // eslint-disable-next-line no-param-reassign
                state.attributes = { [attributeID]: checked ? 'true' : 'false' };
                return state;
            });
            await dispatch(updateAnnotationsAsync(statesToUpdate));
            message.success(
                checked ? 'Current frame promoted to ground truth' : 'Ground-truth mark removed',
                2,
            );
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not update ground-truth state');
        } finally {
            setUpdatingGroundTruth(false);
        }
    };

    const onUpdatePose = async (): Promise<void> => {
        setSyncing(true);
        try {
            await dispatch(saveAnnotationsAsync());
            const response = await fetch(dromiaTaskAPI(job.taskId).poseUpdate, { method: 'POST' });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.error || 'DromIA pose update failed');
            }
            await dispatch(fetchAnnotationsAsync());
            await refreshWorkflow();
            message.success('Reviewed pose updated');
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'DromIA pose update failed');
        } finally {
            setSyncing(false);
        }
    };

    const onGenerateMetrics = async (): Promise<void> => {
        setGeneratingMetrics(true);
        try {
            const response = await fetch(dromiaTaskAPI(job.taskId).metricsGenerate, { method: 'POST' });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || 'Metric generation failed');
            await refreshWorkflow();
            await refreshGait();
            message.success('Biomechanical metrics generated');
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Metric generation failed');
        } finally {
            setGeneratingMetrics(false);
        }
    };

    const openComparison = (): void => {
        window.open(dromiaTaskAPI(job.taskId).video('comparison'), '_blank', 'noopener,noreferrer');
    };

    const downloadExport = (): void => {
        window.location.href = dromiaTaskAPI(job.taskId).export;
    };

    return (
        <div className='cvat-dromia-workflow-controls'>
            <CVATTooltip overlay='Promote every visible lower-body keypoint in the current frame to ground truth'>
                <Checkbox
                    aria-label='Ground truth for current frame'
                    checked={frameGroundTruth}
                    indeterminate={frameGroundTruthPartial}
                    disabled={!groundTruthStates.length || updatingGroundTruth || syncing}
                    onChange={(event): void => {
                        onGroundTruthChange(event.target.checked);
                    }}
                    className='cvat-dromia-ground-truth-checkbox'
                >
                    <span className='cvat-dromia-ground-truth-label'>Ground truth</span>
                </Checkbox>
            </CVATTooltip>
            <CVATTooltip overlay='Save corrections, update the reviewed pose, and regenerate pose videos'>
                <Button
                    aria-label='Update Pose'
                    type='link'
                    loading={syncing}
                    disabled={syncing || generatingMetrics}
                    icon={<SyncOutlined />}
                    onClick={onUpdatePose}
                    className='cvat-annotation-header-button cvat-dromia-sync-button'
                >
                    {syncing ? 'Updating...' : 'Update Pose'}
                </Button>
            </CVATTooltip>
            <CVATTooltip overlay='Open the latest posterior versus reviewed video'>
                <Button
                    type='link'
                    icon={<VideoCameraOutlined />}
                    onClick={openComparison}
                    disabled={!poseCurrent || syncing}
                    className='cvat-annotation-header-button cvat-dromia-video-button'
                    aria-label='DromIA comparison video'
                />
            </CVATTooltip>
            <CVATTooltip overlay='Generate gait metrics for this task'>
                <Button
                    aria-label='Generate Metrics'
                    type='link'
                    loading={generatingMetrics}
                    disabled={syncing || generatingMetrics || workflowLoading}
                    icon={<BarChartOutlined />}
                    onClick={onGenerateMetrics}
                    className='cvat-annotation-header-button cvat-dromia-generate-metrics-button'
                >
                    {metricsButtonLabel}
                </Button>
            </CVATTooltip>
            {metricsStale ? <Tag color='orange' className='cvat-dromia-stale-tag'>METRICS STALE</Tag> : null}
            {metricsCurrent ? (
                <>
                    <CVATTooltip overlay='Open gait events, contacts, angles, and posture'>
                        <Button
                            type='link'
                            icon={<LineChartOutlined />}
                            onClick={(): void => setGaitOpen(true)}
                            className='cvat-annotation-header-button cvat-dromia-gait-button'
                            aria-label='DromIA gait analysis'
                        >
                            Analysis
                        </Button>
                    </CVATTooltip>
                    <CVATTooltip
                        overlay={overlayEnabled ? 'Hide metrics on the video' : 'Show metrics on the video'}
                    >
                        <Button
                            type={overlayEnabled ? 'primary' : 'link'}
                            icon={overlayEnabled ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                            onClick={(): void => setOverlayEnabled(!overlayEnabled)}
                            className='cvat-annotation-header-button cvat-dromia-gait-overlay-button'
                            aria-pressed={overlayEnabled}
                        >
                            Overlay
                        </Button>
                    </CVATTooltip>
                    <CVATTooltip overlay='Download the portable all-runner CSV, JSON, calibration, and manifest'>
                        <Button
                            type='link'
                            icon={<DownloadOutlined />}
                            onClick={downloadExport}
                            className='cvat-annotation-header-button cvat-dromia-export-button'
                            aria-label='Export DromIA results'
                        >
                            Export
                        </Button>
                    </CVATTooltip>
                </>
            ) : null}
            <DromiaGaitDrawer
                taskID={job.taskId}
                open={gaitOpen}
                onClose={(): void => setGaitOpen(false)}
            />
        </div>
    );
}

export default React.memo(DromiaSyncButton);
