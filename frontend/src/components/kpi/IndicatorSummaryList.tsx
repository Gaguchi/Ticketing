import React from 'react';
import { Typography, Tag, Space } from 'antd';
import type { PersonalIndicatorScore } from '../../types/kpi';

const { Text } = Typography;

interface IndicatorSummaryListProps {
  indicators: PersonalIndicatorScore[];
  activeSegment: string | null;
  onSelect: (indicator: PersonalIndicatorScore) => void;
}

const IndicatorSummaryList: React.FC<IndicatorSummaryListProps> = ({
  indicators,
  activeSegment,
  onSelect,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {indicators.map((ind) => {
        const isSelected = activeSegment === ind.metric_key;
        const pct = Math.round(ind.normalized * 100);

        return (
          <div
            key={ind.metric_key}
            onClick={() => onSelect(ind)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px',
              borderRadius: 8,
              cursor: 'pointer',
              border: isSelected ? `1px solid ${ind.color}` : '1px solid transparent',
              background: isSelected ? `${ind.color}08` : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            {/* Color Dot with Glow */}
            <div style={{ 
                width: 12, height: 12, borderRadius: '50%', 
                background: ind.color, marginRight: 16,
                boxShadow: `0 0 0 4px ${ind.color}15`,
                flexShrink: 0
            }}></div>
            
            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text strong style={{ color: '#2C3E50', fontSize: 14 }}>{ind.name}</Text>
                    <Text strong>{pct}%</Text>
                </div>
                
                {/* Progress Bar */}
                <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ 
                        height: '100%', 
                        width: `${pct}%`, 
                        background: ind.color,
                        borderRadius: 3
                    }}></div>
                </div>

                <Space size="small">
                    <Tag bordered={false} style={{ margin: 0, fontSize: 11, background: '#F5F7FA' }}>Weight: {ind.weight}</Tag>
                    {ind.raw_value !== null && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                          {ind.raw_value} {ind.unit}
                      </Text>
                    )}
                </Space>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default IndicatorSummaryList;
