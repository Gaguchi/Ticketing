import React, { useCallback } from 'react';
import { PieChart, Pie, Cell, Sector, ResponsiveContainer, Tooltip } from 'recharts';
import { Typography } from 'antd';
import type { PersonalIndicatorScore } from '../../types/kpi';

const { Text } = Typography;

interface ScoreDonutChartProps {
  indicators: PersonalIndicatorScore[];
  totalScore: number;
  totalWeight: number;
  scorePercentage: number;
  activeSegment: string | null;
  onSegmentClick: (indicator: PersonalIndicatorScore) => void;
  size?: number;
}

const renderActiveShape = (props: any) => {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill,
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 3}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))' }}
      />
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  const data = payload[0].payload as PersonalIndicatorScore & { value: number };
  const formatValue = (val: number | null, unit: string) => {
    if (val === null || val === undefined) return 'N/A';
    if (unit === 'hours') {
      if (val < 1) return `${Math.round(val * 60)}m`;
      if (val < 24) return `${val.toFixed(1)}h`;
      return `${(val / 24).toFixed(1)}d`;
    }
    if (unit === 'stars') return `${val.toFixed(1)}★`;
    if (unit === '%') return `${val.toFixed(1)}%`;
    return String(Math.round(val));
  };

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e0e0e0',
      borderRadius: 6,
      padding: '8px 12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      maxWidth: 220,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4, color: '#1A1A1A' }}>{data.name}</div>
      <div style={{ fontSize: 12, color: '#4A4A4A' }}>
        Value: <strong>{formatValue(data.raw_value, data.unit)}</strong>
      </div>
      <div style={{ fontSize: 12, color: '#4A4A4A' }}>
        Score: <strong>{data.weighted_score.toFixed(1)}</strong> / {data.weight}
      </div>
    </div>
  );
};

const ScoreDonutChart: React.FC<ScoreDonutChartProps> = ({
  indicators,
  totalScore: _totalScore,
  totalWeight: _totalWeight,
  scorePercentage,
  activeSegment,
  onSegmentClick,
  size = 280,
}) => {
  const chartData = indicators.map((ind) => ({
    ...ind,
    value: ind.weight, // segment size = weight
  }));

  const activeIndex = activeSegment
    ? chartData.findIndex((d) => d.metric_key === activeSegment)
    : -1;

  const handleClick = useCallback((_: any, index: number) => {
    if (chartData[index]) {
      onSegmentClick(chartData[index]);
    }
  }, [chartData, onSegmentClick]);

  // Score color
  const scoreColor =
    scorePercentage >= 70 ? '#27AE60' :
    scorePercentage >= 40 ? '#F39C12' : '#E74C3C';

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={size * 0.3}
            outerRadius={size * 0.43}
            dataKey="value"
            {...(activeIndex >= 0 ? { activeIndex } : {})}
            activeShape={renderActiveShape}
            onClick={handleClick}
            style={{ cursor: 'pointer', outline: 'none' }}
            stroke="#fff"
            strokeWidth={2}
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.metric_key}
                fill={entry.color}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          fontSize: 36,
          fontWeight: 700,
          color: scoreColor,
          lineHeight: 1,
        }}>
          {Math.round(scorePercentage)}
        </div>
        <Text type="secondary" style={{ fontSize: 13 }}>/ 100</Text>
      </div>
    </div>
  );
};

export default ScoreDonutChart;
