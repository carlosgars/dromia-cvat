// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    ReloadOutlined,
    VideoCameraOutlined,
} from '@ant-design/icons';
import Alert from 'antd/lib/alert';
import Button from 'antd/lib/button';
import Descriptions from 'antd/lib/descriptions';
import Divider from 'antd/lib/divider';
import Drawer from 'antd/lib/drawer';
import Select from 'antd/lib/select';
import Space from 'antd/lib/space';
import Spin from 'antd/lib/spin';
import Table from 'antd/lib/table';
import Tag from 'antd/lib/tag';
import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';

import { changeFrameAsync } from 'actions/annotation-actions';
import { CombinedState } from 'reducers';
import { dromiaTaskAPI } from 'utils/dromia-api';
import {
    FlightInterval,
    GaitEvent,
    GaitFrame,
    useDromiaGait,
} from '../dromia-gait-context';


interface Props {
    taskID: number;
    open: boolean;
    onClose(): void;
}

function angle(value: number | null | undefined): string {
    return typeof value === 'number' ? `${value.toFixed(1)}°` : '—';
}

function milliseconds(value: number | null | undefined): string {
    return typeof value === 'number' ? `${value.toFixed(1)} ms` : '—';
}

function centimeters(value: number | null | undefined): string {
    return typeof value === 'number' ? `${value.toFixed(1)} cm` : '—';
}

function percent(value: number | null | undefined): string {
    return typeof value === 'number' ? `${value.toFixed(1)}%` : '—';
}

function postureColor(posture: string | null | undefined): string {
    if (posture === 'front') return 'blue';
    if (posture === 'back') return 'orange';
    if (posture === 'straight') return 'green';
    return 'default';
}

function sideColor(side: string): string {
    return side === 'left' ? 'gold' : 'cyan';
}

function ContactTag({ contact }: { contact: boolean | null }): JSX.Element {
    if (contact === null) return <Tag>NO SHOE DATA</Tag>;
    return <Tag color={contact ? 'green' : 'default'}>{contact ? 'CONTACT' : 'FLIGHT'}</Tag>;
}

function FrameButton({ frame, onSelect }: { frame: number; onSelect(frame: number): void }): JSX.Element {
    return (
        <Button type='link' size='small' onClick={(): void => onSelect(frame)}>
            {frame}
        </Button>
    );
}

function EventFrame({
    frame,
    outsideClip,
    onSelect,
}: {
    frame: number | null;
    outsideClip: string;
    onSelect(frame: number): void;
}): JSX.Element {
    return frame === null ? <Text type='secondary'>{outsideClip}</Text> : (
        <FrameButton frame={frame} onSelect={onSelect} />
    );
}

function EventGeometry({ event }: { event: GaitEvent }): JSX.Element {
    return (
        <Descriptions bordered size='small' column={2}>
            <Descriptions.Item label='Landing tibia–horizontal'>
                {angle(event.landing_tibia_horizontal_angle_deg)}
            </Descriptions.Item>
            <Descriptions.Item label='Landing foot–tibia'>
                {angle(event.landing_foot_tibia_angle_deg)}
            </Descriptions.Item>
            <Descriptions.Item label='Takeoff foot–tibia'>
                {angle(event.takeoff_foot_tibia_angle_deg)}
            </Descriptions.Item>
            <Descriptions.Item label='Takeoff tibia–horizontal'>
                {angle(event.takeoff_tibia_horizontal_angle_deg)}
            </Descriptions.Item>
            <Descriptions.Item label='Strike position'>{percent(
                event.strike_position === null ? null : event.strike_position * 100,
            )}</Descriptions.Item>
            <Descriptions.Item label='Strike evidence'>
                {`${percent(event.strike_contact_fraction * 100)} outsole · ${
                    percent(event.strike_shoe_score * 100)
                } mask`}
            </Descriptions.Item>
            <Descriptions.Item label='Source'>{event.metric_source}</Descriptions.Item>
            <Descriptions.Item label='Relative support'>{percent(event.confidence * 100)}</Descriptions.Item>
            <Descriptions.Item label='Event quality'>{event.event_quality}</Descriptions.Item>
            <Descriptions.Item label='Global-flight quality'>{event.global_flight_quality}</Descriptions.Item>
            <Descriptions.Item label='Same-foot-flight quality'>{event.same_foot_flight_quality}</Descriptions.Item>
            <Descriptions.Item label='Direction source'>{event.strike_direction_source}</Descriptions.Item>
            <Descriptions.Item label='Threshold'>{event.strike_threshold_version}</Descriptions.Item>
            <Descriptions.Item label='Stance phase quality'>
                <Tag color={event.phase_quality === 'valid' ? 'green' : 'orange'}>
                    {event.phase_quality}
                </Tag>
            </Descriptions.Item>
            <Descriptions.Item label='Landing knee'>{angle(event.landing_knee_angle_deg)}</Descriptions.Item>
            <Descriptions.Item label='Takeoff knee'>{angle(event.takeoff_knee_angle_deg)}</Descriptions.Item>
            <Descriptions.Item label='Landing torso'>
                <Tag color={postureColor(event.landing_torso_posture)}>
                    {event.landing_torso_posture || 'not observed'}
                </Tag>
                {angle(event.landing_torso_lean_deg)}
            </Descriptions.Item>
            <Descriptions.Item label='Takeoff torso'>
                <Tag color={postureColor(event.takeoff_torso_posture)}>
                    {event.takeoff_torso_posture || 'not observed'}
                </Tag>
                {angle(event.takeoff_torso_lean_deg)}
            </Descriptions.Item>
        </Descriptions>
    );
}

function CurrentFrameMetrics({ frame }: { frame: GaitFrame | undefined }): JSX.Element {
    if (!frame) {
        return <Alert type='info' showIcon message='No gait metrics are available for this frame' />;
    }

    return (
        <>
            <Space style={{ marginBottom: 12 }}>
                <Text strong>{`Frame ${frame.frame_idx}`}</Text>
                <Tag color={postureColor(frame.torso_posture)}>{frame.torso_posture.toUpperCase()}</Tag>
                <Text type='secondary'>{`Torso ${angle(frame.torso_lean_deg)}`}</Text>
            </Space>
            <Table
                size='small'
                pagination={false}
                rowKey='side'
                dataSource={[
                    {
                        side: 'left',
                        contact: frame.left_contact,
                        knee: frame.left_knee_angle_deg,
                        tibiaHorizontal: frame.left_tibia_horizontal_angle_deg,
                        footTibia: frame.left_foot_tibia_angle_deg,
                    },
                    {
                        side: 'right',
                        contact: frame.right_contact,
                        knee: frame.right_knee_angle_deg,
                        tibiaHorizontal: frame.right_tibia_horizontal_angle_deg,
                        footTibia: frame.right_foot_tibia_angle_deg,
                    },
                ]}
                columns={[
                    {
                        title: 'Foot',
                        dataIndex: 'side',
                        render: (side: string): JSX.Element => <Tag color={sideColor(side)}>{side.toUpperCase()}</Tag>,
                    },
                    {
                        title: 'State',
                        dataIndex: 'contact',
                        render: (contact: boolean): JSX.Element => <ContactTag contact={contact} />,
                    },
                    { title: 'Knee', dataIndex: 'knee', render: angle },
                    { title: 'Tibia–horizontal', dataIndex: 'tibiaHorizontal', render: angle },
                    { title: 'Foot–tibia', dataIndex: 'footTibia', render: angle },
                ]}
                scroll={{ x: 700 }}
            />
        </>
    );
}

export default function DromiaGaitDrawer(props: Props): JSX.Element {
    const {
        taskID,
        open,
        onClose,
    } = props;
    const dispatch = useDispatch();
    const frameNumber = useSelector((state: CombinedState) => state.annotation.player.frame.number);
    const {
        analysis,
        selectedRunnerID,
        setSelectedRunnerID,
        loading,
        error,
        refresh,
    } = useDromiaGait();

    const runnerIDs = useMemo(
        () => Object.keys(analysis?.runners || {}).map(Number).sort((a, b) => a - b),
        [analysis],
    );
    const runner = selectedRunnerID === null ? undefined : analysis?.runners[String(selectedRunnerID)];
    const currentFrame = runner?.frames.find((frame) => frame.frame_idx === frameNumber);

    const selectFrame = useCallback((frame: number): void => {
        dispatch(changeFrameAsync(frame));
    }, []);

    const openDebugVideo = useCallback((): void => {
        window.open(dromiaTaskAPI(taskID).video('gait'), '_blank', 'noopener,noreferrer');
    }, [taskID]);

    return (
        <Drawer
            title='DromIA gait analysis'
            placement='right'
            width={860}
            open={open}
            onClose={onClose}
            destroyOnClose={false}
            extra={(
                <Space>
                    <Button
                        icon={<ReloadOutlined />}
                        loading={loading}
                        onClick={refresh}
                    >
                        Refresh
                    </Button>
                    <Button icon={<VideoCameraOutlined />} onClick={openDebugVideo}>
                        Debug video
                    </Button>
                </Space>
            )}
        >
            {loading && !analysis ? <Spin style={{ display: 'block', margin: '48px auto' }} /> : null}
            {error ? (
                <Alert
                    type='warning'
                    showIcon
                    message='Gait analysis unavailable'
                    description={`${error}. Run Generate Metrics to compute it from the current DromIA pose.`}
                    action={<Button size='small' onClick={refresh}>Retry</Button>}
                />
            ) : null}
            {analysis && runner ? (
                <>
                    <Space wrap style={{ marginBottom: 16 }}>
                        <Text strong>Runner</Text>
                        <Select<number>
                            value={selectedRunnerID as number}
                            style={{ width: 110 }}
                            options={runnerIDs.map((runnerID) => ({ value: runnerID, label: `#${runnerID}` }))}
                            onChange={setSelectedRunnerID}
                        />
                        <Tag>{runner.direction.toUpperCase()}</Tag>
                        <Text strong>{`${analysis.real_world_fps.toFixed(2)} capture FPS`}</Text>
                        <Text type='secondary'>
                            {`${analysis.source_fps.toFixed(2)} playback FPS · ${analysis.source_pose}`}
                        </Text>
                    </Space>

                    <Descriptions bordered size='small' column={2}>
                        <Descriptions.Item label='Contacts'>{runner.summary.contact_count}</Descriptions.Item>
                        <Descriptions.Item label='Flights'>{runner.summary.flight_count}</Descriptions.Item>
                        <Descriptions.Item label='Mean contact'>
                            {milliseconds(runner.summary.mean_contact_time_ms)}
                        </Descriptions.Item>
                        <Descriptions.Item label='Global flight'>
                            {milliseconds(runner.summary.mean_global_flight_time_ms)}
                        </Descriptions.Item>
                        <Descriptions.Item label='Flexion / braking'>
                            {milliseconds(runner.summary.mean_flexion_braking_time_ms)}
                        </Descriptions.Item>
                        <Descriptions.Item label='Impulse / propulsion'>
                            {milliseconds(runner.summary.mean_impulse_propulsion_time_ms)}
                        </Descriptions.Item>
                        <Descriptions.Item label='Same-foot flight'>
                            {milliseconds(runner.summary.mean_same_foot_flight_time_ms)}
                        </Descriptions.Item>
                        <Descriptions.Item label='Steps'>{runner.cadence.step_count ?? '—'}</Descriptions.Item>
                        <Descriptions.Item label='Two-step time'>
                            {milliseconds(runner.cadence.two_step_time_ms)}
                        </Descriptions.Item>
                        <Descriptions.Item label='Cadence'>
                            {runner.cadence.cadence_spm === null ? '—' : `${runner.cadence.cadence_spm.toFixed(1)} spm`}
                            {runner.cadence.is_extrapolated_from_two_contacts ? <Tag color='orange'>2 contacts</Tag> : null}
                        </Descriptions.Item>
                        <Descriptions.Item label='Step / stride'>
                            {`${centimeters(runner.spatial.mean_step_length_cm)} / ${
                                centimeters(runner.spatial.mean_stride_length_cm)
                            }`}
                        </Descriptions.Item>
                        <Descriptions.Item label='Global contact'>
                            {milliseconds(runner.global_contact.mean_global_contact_time_ms)}
                        </Descriptions.Item>
                        <Descriptions.Item label='Contact duty factor'>
                            {percent(runner.global_contact.contact_duty_factor === null ? null :
                                runner.global_contact.contact_duty_factor * 100)}
                            <Tag>unvalidated</Tag>
                        </Descriptions.Item>
                    </Descriptions>

                    <details style={{ marginTop: 12 }}>
                        <summary>Quality and provenance</summary>
                        <Descriptions bordered size='small' column={1}>
                            <Descriptions.Item label='Direction source'>{runner.direction_source}</Descriptions.Item>
                            <Descriptions.Item label='Cadence quality'>{runner.cadence.quality}</Descriptions.Item>
                            <Descriptions.Item label='Global-contact quality'>{runner.global_contact.quality}</Descriptions.Item>
                            <Descriptions.Item label='Duty factor definition'>
                                Observed global-contact frames / observed active frames; expert formula unconfirmed
                            </Descriptions.Item>
                        </Descriptions>
                    </details>

                    <Divider />
                    <Title level={5}>Left/right asymmetry</Title>
                    {runner.asymmetry.review_recommended ? (
                        <Alert
                            type='warning'
                            showIcon
                            message='Descriptive difference: expert review recommended'
                            description='This flag is not a diagnosis and does not estimate injury risk.'
                            style={{ marginBottom: 12 }}
                        />
                    ) : null}
                    <Table
                        size='small'
                        pagination={false}
                        rowKey='metric'
                        dataSource={Object.entries(runner.asymmetry.metrics).map(
                            ([metric, values]) => ({ metric, ...values }),
                        )}
                        columns={[
                            { title: 'Metric', dataIndex: 'metric' },
                            {
                                title: 'Left',
                                dataIndex: 'left_value',
                                render: (value: number | null): string => (
                                    value === null ? '—' : value.toFixed(3)
                                ),
                            },
                            {
                                title: 'Right',
                                dataIndex: 'right_value',
                                render: (value: number | null): string => (
                                    value === null ? '—' : value.toFixed(3)
                                ),
                            },
                            {
                                title: 'Evidence',
                                render: (_: unknown, row: { left_n: number; right_n: number }): string => (
                                    `${row.left_n} / ${row.right_n}`
                                ),
                            },
                            { title: 'Symmetry index', dataIndex: 'symmetry_index_percent', render: percent },
                            { title: 'Quality', dataIndex: 'quality' },
                            {
                                title: 'Review',
                                dataIndex: 'review_recommended',
                                render: (value: boolean): JSX.Element => (
                                    value ? <Tag color='orange'>REVIEW</Tag> : <Tag>OK</Tag>
                                ),
                            },
                        ]}
                        scroll={{ x: 760 }}
                    />

                    <Divider />
                    <Title level={5}>Current frame</Title>
                    <CurrentFrameMetrics frame={currentFrame} />

                    <Divider />
                    <Title level={5}>Contact events</Title>
                    <Table<GaitEvent>
                        size='small'
                        rowKey='event_id'
                        dataSource={runner.events}
                        pagination={false}
                        locale={{ emptyText: 'No contact events detected' }}
                        expandable={{
                            expandedRowRender: (event): JSX.Element => <EventGeometry event={event} />,
                        }}
                        columns={[
                            {
                                title: 'Foot',
                                dataIndex: 'side',
                                render: (side: string): JSX.Element => <Tag color={sideColor(side)}>{side}</Tag>,
                            },
                            {
                                title: 'Landing',
                                dataIndex: 'landing_frame',
                                render: (frame: number | null): JSX.Element => (
                                    <EventFrame frame={frame} outsideClip='before clip' onSelect={selectFrame} />
                                ),
                            },
                            {
                                title: 'Takeoff',
                                dataIndex: 'takeoff_frame',
                                render: (frame: number | null): JSX.Element => (
                                    <EventFrame frame={frame} outsideClip='after clip' onSelect={selectFrame} />
                                ),
                            },
                            {
                                title: 'Contact',
                                dataIndex: 'contact_time_ms',
                                render: (value: number | null): string => (
                                    value === null ? 'not fully observed' : milliseconds(value)
                                ),
                            },
                            {
                                title: 'Same-foot flight',
                                dataIndex: 'same_foot_flight_time_ms',
                                render: (value: number | null): string => (
                                    value === null ? 'not fully observed' : milliseconds(value)
                                ),
                            },
                            {
                                title: 'Knee alignment',
                                dataIndex: 'knee_alignment_frame',
                                render: (frame: number | null): JSX.Element | string => (
                                    frame === null ? '—' : <FrameButton frame={frame} onSelect={selectFrame} />
                                ),
                            },
                            { title: 'Contact frames', dataIndex: 'contact_frames' },
                            { title: 'Global flight', dataIndex: 'global_flight_time_ms', render: milliseconds },
                            { title: 'Step (cm)', dataIndex: 'step_length_cm', render: centimeters },
                            { title: 'Stride (cm)', dataIndex: 'stride_length_cm', render: centimeters },
                            { title: 'Flexion / braking', dataIndex: 'flexion_braking_time_ms', render: milliseconds },
                            { title: 'Impulse / propulsion', dataIndex: 'impulse_propulsion_time_ms', render: milliseconds },
                            {
                                title: 'FSA',
                                dataIndex: 'foot_strike',
                                render: (strike: string): JSX.Element => (
                                    <Tag>{strike || 'not observed'}</Tag>
                                ),
                            },
                        ]}
                        scroll={{ x: 1600 }}
                    />

                    <Divider />
                    <Title level={5}>Global flight intervals</Title>
                    <Table<FlightInterval>
                        size='small'
                        rowKey={(flight): string => `${flight.start_frame}-${flight.end_frame}`}
                        dataSource={runner.flight_intervals}
                        pagination={false}
                        locale={{ emptyText: 'No visible-shoe flight intervals detected' }}
                        columns={[
                            {
                                title: 'Start',
                                dataIndex: 'start_frame',
                                render: (frame: number): JSX.Element => (
                                    <FrameButton frame={frame} onSelect={selectFrame} />
                                ),
                            },
                            {
                                title: 'End',
                                dataIndex: 'end_frame',
                                render: (frame: number): JSX.Element => (
                                    <FrameButton frame={frame} onSelect={selectFrame} />
                                ),
                            },
                            { title: 'Global flight', dataIndex: 'global_flight_time_ms', render: milliseconds },
                            {
                                title: 'Complete',
                                dataIndex: 'complete',
                                render: (value: boolean): string => (
                                    value ? 'yes' : 'censored'
                                ),
                            },
                        ]}
                    />

                    <Alert
                        style={{ marginTop: 20 }}
                        type='info'
                        showIcon
                        message='2D image-plane estimates'
                        description={analysis.limitations.join(' ')}
                    />
                    {analysis.timebase?.unanalyzed_source_frames?.length ? (
                        <Alert
                            style={{ marginTop: 12 }}
                            type='warning'
                            showIcon
                            message={
                                `${analysis.timebase.unanalyzed_source_frames.length} source frames were not analyzed`
                            }
                            description='This is recorded in the timebase and must be reviewed before final export.'
                        />
                    ) : null}
                </>
            ) : null}
        </Drawer>
    );
}
