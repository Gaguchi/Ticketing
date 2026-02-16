import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Typography, Empty } from 'antd';

const { Text } = Typography;

// Static palette for builder preview (no performance data)
const PREVIEW_COLORS = [
  '#3498DB', '#27AE60', '#F39C12', '#E74C3C',
  '#9B59B6', '#1ABC9C', '#E67E22', '#2C3E50',
  '#16A085',
];

interface IndicatorRow {
  key: string;
  name: string;
  weight: number;
  is_active: boolean;
}

interface DonutPreviewProps {
  indicators: IndicatorRow[];
}

const PreviewTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  const data = payload[0].payload;
  return (
    <div style={{
      background: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-border)',
      borderRadius: 6,
      padding: '6px 10px',
      boxShadow: 'var(--shadow-md)',
    }}>
      <div style={{ fontWeight: 600, fontSize: 'var(--fs-caption)', color: 'var(--color-text-heading)' }}>{data.name}</div>
      <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-secondary)' }}>Weight: {data.weight}</div>
    </div>
  );
};

const DonutPreview: React.FC<DonutPreviewProps> = ({ indicators }) => {
  const activeIndicators = indicators.filter((i) => i.is_active);
  const totalWeight = activeIndicators.reduce((sum, i) => sum + i.weight, 0);

  if (activeIndicators.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Enable indicators to see preview"
        />
      </div>
    );
  }

  const chartData = activeIndicators.map((ind) => ({
    name: ind.name,
    value: ind.weight,
    key: ind.key,
  }));

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              dataKey="value"
              stroke="var(--color-bg-surface)"
              strokeWidth={2}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={index}
                  fill={PREVIEW_COLORS[index % PREVIEW_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<PreviewTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 'var(--fs-3xl)', fontWeight: 700, color: 'var(--color-text-heading)', lineHeight: 1 }}>
            {totalWeight}
          </div>
          <Text type="secondary" style={{ fontSize: 'var(--fs-xs)' }}>total pts</Text>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        {chartData.map((item, idx) => (
          <div key={item.key} style={{
            display: 'inline-flex',
            alignItems: 'center',
            marginRight: 12,
            marginBottom: 4,
            fontSize: 'var(--fs-sm)',
          }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: PREVIEW_COLORS[idx % PREVIEW_COLORS.length],
              display: 'inline-block',
              marginRight: 4,
            }} />
            <span style={{ color: 'var(--color-text-secondary)' }}>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonutPreview;
