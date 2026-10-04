// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useMemo, useReducer } from 'react';
import { useDispatch } from 'react-redux';
import Tag from 'antd/lib/tag';

import { changeFrameAsync } from 'actions/annotation-actions';
import { Canvas } from 'cvat-canvas-wrapper';
import { ObjectState, ShapeType } from 'cvat-core-wrapper';
import {
    GaitFrame, GaitRunner, useDromiaGait,
} from './provider';

const DROMIA_LABEL = 'runner_lower_body';
const LEFT_COLOR = '#ffc53d';
const RIGHT_COLOR = '#36cfc9';

interface Props {
    canvasInstance: Canvas;
    annotations: ObjectState[];
    frame: number;
    startFrame: number;
    stopFrame: number;
}

interface Point {
    x: number;
    y: number;
}

type JointMap = Record<string, Point>;

function skeletonRunnerID(skeleton: ObjectState): number | null {
    const runnerAttribute = skeleton.label.attributes.find((attribute) => attribute.name === 'runner_id');
    if (typeof runnerAttribute?.id !== 'number') return null;
    const value = Number(skeleton.attributes[runnerAttribute.id]);
    return Number.isFinite(value) ? value : null;
}

function displayAngle(value: number | null): string {
    return typeof value === 'number' ? `${value.toFixed(1)}°` : '—';
}

function contactLabel(value: boolean | null | undefined): string {
    if (value === true) return 'CONTACT';
    if (value === false) return 'FLIGHT';
    return 'NO SHOE DATA';
}

function postureColor(posture: string | undefined): string {
    if (posture === 'straight') return 'green';
    if (posture === 'back') return 'orange';
    return posture === 'front' ? 'blue' : 'default';
}

function jointMapForSkeleton(skeleton: ObjectState | undefined): JointMap {
    if (!skeleton) return {};
    const joints: JointMap = {};
    skeleton.elements.forEach((element: ObjectState) => {
        if (!element.outside && element.points?.length === 2) {
            joints[element.label.name] = { x: element.points[0], y: element.points[1] };
        }
    });
    return joints;
}

function Limb({ from, to, color }: { from?: Point; to?: Point; color: string }): JSX.Element | null {
    if (!from || !to) return null;
    return (
        <line
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={color}
            strokeWidth={4}
            strokeLinecap='round'
            vectorEffect='non-scaling-stroke'
        />
    );
}

function GroundLine({
    groundY, width, color, label, canvasAngle, labelX,
}: {
    groundY: number | null;
    width: number;
    color: string;
    label: string;
    canvasAngle: number;
    labelX: number;
}): JSX.Element | null {
    if (groundY === null) return null;
    return (
        <g>
            <line
                x1={0}
                y1={groundY}
                x2={width}
                y2={groundY}
                stroke={color}
                strokeWidth={2}
                strokeDasharray='10 7'
                vectorEffect='non-scaling-stroke'
            />
            <text
                x={labelX}
                y={groundY - 9}
                fill={color}
                fontSize={14}
                fontWeight={600}
                transform={`rotate(${-canvasAngle} ${labelX} ${groundY - 9})`}
            >
                {label}
            </text>
        </g>
    );
}

function AngleArc({
    start, vertex, end, color,
}: {
    start?: Point;
    vertex?: Point;
    end?: Point;
    color: string;
}): JSX.Element | null {
    if (!start || !vertex || !end) return null;
    const first = Math.atan2(start.y - vertex.y, start.x - vertex.x);
    const second = Math.atan2(end.y - vertex.y, end.x - vertex.x);
    let delta = second - first;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    const radius = 24;
    const x1 = vertex.x + Math.cos(first) * radius;
    const y1 = vertex.y + Math.sin(first) * radius;
    const x2 = vertex.x + Math.cos(first + delta) * radius;
    const y2 = vertex.y + Math.sin(first + delta) * radius;
    return (
        <path
            d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 ${delta > 0 ? 1 : 0} ${x2} ${y2}`}
            fill='none'
            stroke={color}
            strokeWidth={2}
            vectorEffect='non-scaling-stroke'
        />
    );
}

function JointLabel({
    point, text, color, canvasAngle,
}: {
    point?: Point;
    text: string;
    color: string;
    canvasAngle: number;
}): JSX.Element | null {
    if (!point) return null;
    return (
        <g transform={`translate(${point.x + 8} ${point.y - 8}) rotate(${-canvasAngle})`}>
            <rect x={0} y={-18} width={text.length * 7.2 + 12} height={22} rx={5} fill='rgba(0, 0, 0, .78)' />
            <text x={6} y={-3} fill={color} fontSize={13} fontWeight={600}>{text}</text>
        </g>
    );
}

function metricPath(
    frames: GaitFrame[],
    key: 'left_knee_angle_deg' | 'right_knee_angle_deg',
    firstFrame: number,
    frameSpan: number,
): string {
    let drawing = false;
    return frames.map((item) => {
        const value = item[key];
        if (value === null) {
            drawing = false;
            return '';
        }
        const x = ((item.frame_idx - firstFrame) / frameSpan) * 330;
        const y = 52 - (Math.max(0, Math.min(180, value)) / 180) * 46;
        const command = drawing ? 'L' : 'M';
        drawing = true;
        return `${command} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).filter(Boolean).join(' ');
}

function GaitMetricPlot({
    runner, frame, firstFrame, lastFrame,
}: {
    runner: GaitRunner;
    frame: number;
    firstFrame: number;
    lastFrame: number;
}): JSX.Element {
    const frameSpan = Math.max(lastFrame - firstFrame, 1);
    const cursorX = ((frame - firstFrame) / frameSpan) * 330;
    const leftPath = useMemo(
        () => metricPath(runner.frames, 'left_knee_angle_deg', firstFrame, frameSpan),
        [runner.frames, firstFrame, frameSpan],
    );
    const rightPath = useMemo(
        () => metricPath(runner.frames, 'right_knee_angle_deg', firstFrame, frameSpan),
        [runner.frames, firstFrame, frameSpan],
    );
    return (
        <div className='cvat-dromia-gait-plot'>
            <div className='cvat-dromia-gait-plot-title'>
                <span>KNEE ANGLE</span>
                <span><i className='left' />LEFT <i className='right' />RIGHT</span>
            </div>
            <svg viewBox='0 0 330 62' role='img' aria-label='Knee angle through the clip'>
                <line x1={0} y1={29} x2={330} y2={29} className='grid' />
                <path d={leftPath} className='left' />
                <path d={rightPath} className='right' />
                {runner.frames.map((item) => {
                    const x = ((item.frame_idx - firstFrame) / frameSpan) * 330;
                    return (
                        <g key={item.frame_idx}>
                            {item.left_contact === true ? (
                                <rect x={x} y={56} width={5.5} height={3} className='left-contact' />
                            ) : null}
                            {item.right_contact === true ? (
                                <rect x={x} y={59} width={5.5} height={3} className='right-contact' />
                            ) : null}
                        </g>
                    );
                })}
                <line x1={cursorX} y1={0} x2={cursorX} y2={62} className='cursor' />
            </svg>
        </div>
    );
}

export default function DromiaGaitOverlay(props: Props): JSX.Element | null {
    const {
        canvasInstance, annotations, frame, startFrame, stopFrame,
    } = props;
    const dispatch = useDispatch();
    const {
        analysis, error, loading, overlayEnabled, selectedRunnerID, frameIndex,
    } = useDromiaGait();
    const [, updateGeometry] = useReducer((version: number) => version + 1, 0);

    useEffect(() => {
        const canvas = canvasInstance.html();
        const redraw = (): void => updateGeometry();
        const events = ['canvas.setup', 'canvas.zoom', 'canvas.fit', 'canvas.moved'];
        events.forEach((event) => canvas.addEventListener(event, redraw));
        window.addEventListener('resize', redraw);
        return () => {
            events.forEach((event) => canvas.removeEventListener(event, redraw));
            window.removeEventListener('resize', redraw);
        };
    }, [canvasInstance]);

    const runner = selectedRunnerID === null ? null : analysis?.runners[String(selectedRunnerID)] ?? null;
    const metrics = selectedRunnerID === null ? undefined : frameIndex.get(selectedRunnerID)?.get(frame);
    const { geometry } = canvasInstance;

    const skeleton = useMemo(() => {
        const candidates = annotations.filter((state) => (
            state.label.name === DROMIA_LABEL &&
            state.shapeType === ShapeType.SKELETON &&
            state.parentID === null &&
            !state.outside
        ));
        const matching = candidates.find((candidate) => skeletonRunnerID(candidate) === selectedRunnerID);
        return matching || (candidates.length === 1 ? candidates[0] : undefined);
    }, [annotations, selectedRunnerID]);
    const joints = useMemo(() => jointMapForSkeleton(skeleton), [skeleton]);

    if (!overlayEnabled) return null;
    if (!analysis || !runner) {
        return (
            <div className='cvat-dromia-gait-overlay'>
                <div className='cvat-dromia-gait-hud cvat-dromia-gait-status'>
                    <strong>GAIT ANALYSIS</strong>
                    <span>{loading ? 'Loading metrics…' : error || 'No runner metrics available'}</span>
                </div>
            </div>
        );
    }

    const currentEvents = runner.events.flatMap((event) => {
        const labels: string[] = [];
        if (event.landing_frame === frame) labels.push(`${event.side} landing · ${event.foot_strike || 'not observed'}`);
        if (event.knee_alignment_frame === frame) labels.push(`${event.side} knee alignment`);
        if (event.takeoff_frame === frame) labels.push(`${event.side} takeoff`);
        return labels;
    });
    const frameSpan = Math.max(stopFrame - startFrame, 1);
    const leftState = contactLabel(metrics?.left_contact);
    const rightState = contactLabel(metrics?.right_contact);

    return (
        <div className='cvat-dromia-gait-overlay'>
            <svg
                className='cvat-dromia-gait-geometry'
                width={geometry.image.width}
                height={geometry.image.height}
                viewBox={`0 0 ${geometry.image.width} ${geometry.image.height}`}
                style={{
                    top: geometry.top,
                    left: geometry.left,
                    transform: `scale(${geometry.scale}) rotate(${geometry.angle}deg)`,
                }}
            >
                <GroundLine
                    groundY={metrics?.left_ground_y ?? runner.ground_y_by_side?.left ?? runner.ground_y ?? null}
                    width={geometry.image.width}
                    color={LEFT_COLOR}
                    label='GROUND L'
                    canvasAngle={geometry.angle}
                    labelX={12}
                />
                <GroundLine
                    groundY={metrics?.right_ground_y ?? runner.ground_y_by_side?.right ?? runner.ground_y ?? null}
                    width={geometry.image.width}
                    color={RIGHT_COLOR}
                    label='GROUND R'
                    canvasAngle={geometry.angle}
                    labelX={105}
                />
                <Limb from={joints.left_hip} to={joints.left_knee} color={LEFT_COLOR} />
                <Limb from={joints.left_knee} to={joints.left_ankle} color={LEFT_COLOR} />
                <Limb from={joints.right_hip} to={joints.right_knee} color={RIGHT_COLOR} />
                <Limb from={joints.right_knee} to={joints.right_ankle} color={RIGHT_COLOR} />
                {metrics ? (
                    <>
                        <AngleArc
                            start={joints.left_hip}
                            vertex={joints.left_knee}
                            end={joints.left_ankle}
                            color={LEFT_COLOR}
                        />
                        <AngleArc
                            start={joints.right_hip}
                            vertex={joints.right_knee}
                            end={joints.right_ankle}
                            color={RIGHT_COLOR}
                        />
                        <JointLabel
                            point={joints.left_knee}
                            text={`K ${displayAngle(metrics.left_knee_angle_deg)}`}
                            color={LEFT_COLOR}
                            canvasAngle={geometry.angle}
                        />
                        <JointLabel
                            point={joints.right_knee}
                            text={`K ${displayAngle(metrics.right_knee_angle_deg)}`}
                            color={RIGHT_COLOR}
                            canvasAngle={geometry.angle}
                        />
                        <JointLabel
                            point={joints.left_ankle}
                            text={`T ${displayAngle(metrics.left_tibia_horizontal_angle_deg)}`}
                            color={LEFT_COLOR}
                            canvasAngle={geometry.angle}
                        />
                        <JointLabel
                            point={joints.right_ankle}
                            text={`T ${displayAngle(metrics.right_tibia_horizontal_angle_deg)}`}
                            color={RIGHT_COLOR}
                            canvasAngle={geometry.angle}
                        />
                    </>
                ) : null}
            </svg>

            <div className='cvat-dromia-gait-hud'>
                <div className='cvat-dromia-gait-hud-title'>
                    <span>{`GAIT · RUNNER ${runner.runner_id}`}</span>
                    <Tag color={postureColor(metrics?.torso_posture)}>
                        {metrics ? (
                            `TORSO ${metrics.torso_posture.toUpperCase()} ${displayAngle(metrics.torso_lean_deg)}`
                        ) : 'NO DATA'}
                    </Tag>
                </div>
                <div className='cvat-dromia-gait-foot-row cvat-dromia-gait-foot-row-left'>
                    <strong>LEFT</strong>
                    <span className={metrics?.left_contact ? 'contact' : ''}>{leftState}</span>
                    <span>{`knee ${displayAngle(metrics?.left_knee_angle_deg ?? null)}`}</span>
                </div>
                <div className='cvat-dromia-gait-foot-row cvat-dromia-gait-foot-row-right'>
                    <strong>RIGHT</strong>
                    <span className={metrics?.right_contact ? 'contact' : ''}>{rightState}</span>
                    <span>{`knee ${displayAngle(metrics?.right_knee_angle_deg ?? null)}`}</span>
                </div>
                <GaitMetricPlot runner={runner} frame={frame} firstFrame={startFrame} lastFrame={stopFrame} />
                {currentEvents.length ? (
                    <div className='cvat-dromia-gait-current-event'>
                        {currentEvents.join(' · ').toUpperCase()}
                    </div>
                ) : null}
            </div>

            <div className='cvat-dromia-gait-event-rail' aria-label='Gait event navigation'>
                <div className='cvat-dromia-gait-event-legend'>
                    <span className='landing'>LAND</span>
                    <span className='takeoff'>OFF</span>
                    <span className='alignment'>ALIGN</span>
                </div>
                {runner.events.flatMap((event) => {
                    const markers: { frame: number; label: string; kind: string }[] = [];
                    if (event.landing_frame !== null) {
                        markers.push({
                            frame: event.landing_frame,
                            label: `${event.side[0].toUpperCase()} landing`,
                            kind: 'landing',
                        });
                    }
                    if (event.takeoff_frame !== null) {
                        markers.push({
                            frame: event.takeoff_frame,
                            label: `${event.side[0].toUpperCase()} takeoff`,
                            kind: 'takeoff',
                        });
                    }
                    if (event.knee_alignment_frame !== null) {
                        markers.push({
                            frame: event.knee_alignment_frame,
                            label: `${event.side[0].toUpperCase()} knee alignment`,
                            kind: 'alignment',
                        });
                    }
                    return markers;
                }).map((marker) => (
                    <button
                        type='button'
                        key={`${marker.kind}-${marker.label}-${marker.frame}`}
                        className={`cvat-dromia-gait-event-marker ${marker.kind}`}
                        style={{ left: `${((marker.frame - startFrame) / frameSpan) * 100}%` }}
                        title={`${marker.label} · frame ${marker.frame}`}
                        aria-label={`${marker.label} frame ${marker.frame}`}
                        onClick={(): void => {
                            dispatch(changeFrameAsync(marker.frame));
                        }}
                    />
                ))}
                <div
                    className='cvat-dromia-gait-frame-cursor'
                    style={{ left: `${((frame - startFrame) / frameSpan) * 100}%` }}
                />
            </div>
        </div>
    );
}
