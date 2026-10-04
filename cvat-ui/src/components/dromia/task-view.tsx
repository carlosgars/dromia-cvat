// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useHistory } from 'react-router';
import Button from 'antd/lib/button';
import {
    AppstoreAddOutlined, ArrowLeftOutlined, PlayCircleOutlined, ToolOutlined,
} from '@ant-design/icons';

import { Task } from 'cvat-core-wrapper';

interface Props {
    task: Task;
}

export default function DromiaTaskView({ task }: Props): JSX.Element {
    const history = useHistory();
    const backPath = task.projectId ? `/projects/${task.projectId}` : '/tasks';

    return (
        <main className='cvat-dromia-task-view'>
            <header className='cvat-dromia-task-header'>
                <Button type='text' icon={<ArrowLeftOutlined />} onClick={() => history.push(backPath)}>
                    All runners
                </Button>
                <div className='cvat-dromia-task-title'>
                    <span>DromIA pose review</span>
                    <h1>{task.name}</h1>
                </div>
                <div className='cvat-dromia-task-actions'>
                    <Button
                        type='text'
                        icon={<AppstoreAddOutlined />}
                        onClick={() => { window.location.href = '/dromia/app'; }}
                    >
                        Analyses
                    </Button>
                    <Button
                        type='text'
                        icon={<ToolOutlined />}
                        onClick={() => history.replace(`/tasks/${task.id}?fullCVAT=1`)}
                    >
                        Full CVAT
                    </Button>
                </div>
            </header>
            <section className='cvat-dromia-job-list' aria-label='Annotation jobs'>
                <h2>Annotation job</h2>
                {task.jobs.map((job) => (
                    <div className='cvat-dromia-job-row' key={job.id}>
                        <div>
                            <strong>Job #{job.id}</strong>
                            <span>{`${job.startFrame}-${job.stopFrame} | ${job.state}`}</span>
                        </div>
                        <Button
                            type='primary'
                            icon={<PlayCircleOutlined />}
                            onClick={() => history.push(`/tasks/${task.id}/jobs/${job.id}`)}
                        >
                            Open review
                        </Button>
                    </div>
                ))}
            </section>
        </main>
    );
}
