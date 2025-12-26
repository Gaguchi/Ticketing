import React, { useEffect, useState } from 'react';
import { Timeline, Avatar, Typography, Spin, Empty } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { ticketService } from '../services/ticket.service';
import type { TicketActivityItem, TicketHistoryItem, TicketCommentItem } from '../types/api';

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

interface TicketHistoryProps {
    ticketId: number;
}

export const TicketHistory: React.FC<TicketHistoryProps> = ({ ticketId }) => {
    const [loading, setLoading] = useState(true);
    const [activities, setActivities] = useState<TicketActivityItem[]>([]);

    useEffect(() => {
        const loadHistory = async () => {
            if (!ticketId) return;
            setLoading(true);
            try {
                const history = await ticketService.getTicketHistory(ticketId);
                setActivities(history);
            } catch (error) {
                console.error('Failed to load history:', error);
            } finally {
                setLoading(false);
            }
        };

        loadHistory();
    }, [ticketId]);

    if (loading) {
        return (
            <div style={{ padding: 24, textAlign: 'center' }}>
                <Spin />
            </div>
        );
    }

    if (activities.length === 0) {
        return <Empty description="No history available" />;
    }



    const getColor = (type: string) => {
        if (type === 'comment') return 'blue';
        return 'gray';
    };

    const renderContent = (item: TicketActivityItem) => {
        if (item.type === 'comment') {
            const comment = item as TicketCommentItem;
            return (
                <div>
                    <Text strong>{comment.user.first_name || comment.user.username}</Text> commented
                    <br />
                    <Text type="secondary">{comment.content}</Text>
                </div>
            );
        }

        const history = item as TicketHistoryItem;
        // Format field names for display
        const fieldName = history.field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        return (
            <div>
                <Text strong>{history.user.first_name || history.user.username}</Text> changed <Text code>{fieldName}</Text>
                <br />
                <div style={{ fontSize: 12, marginTop: 4 }}>
                    <Text delete type="secondary">{history.old_value || '(empty)'}</Text>
                    <Text type="secondary" style={{ margin: '0 8px' }}>→</Text>
                    <Text strong>{history.new_value || '(empty)'}</Text>
                </div>
            </div>
        );
    };

    return (
        <div style={{ padding: 24 }}>
            <Title level={4} style={{ marginBottom: 24 }}>Activity History</Title>
            <Timeline
                mode="left"
                items={activities.map(item => ({
                    color: getColor(item.type),
                    dot: <Avatar size="small" icon={<UserOutlined />} />,
                    children: (
                        <div style={{ marginBottom: 16 }}>
                            {renderContent(item)}
                            <div style={{ marginTop: 4 }}>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    {dayjs(item.created_at).fromNow()}
                                </Text>
                            </div>
                        </div>
                    )
                }))}
            />
        </div>
    );
};
