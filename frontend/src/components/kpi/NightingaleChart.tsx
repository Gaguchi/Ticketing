import React, { useCallback } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Sector,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Typography, Tag } from 'antd';
import type { PersonalIndicatorScore } from '../../types/kpi';

const { Text } = Typography;

interface NightingaleChartProps {
  indicators: PersonalIndicatorScore[];
  totalScore: number;
  totalWeight: number;
  scorePercentage: number;
  activeSegment: string | null;
  onSegmentClick: (indicator: PersonalIndicatorScore) => void;
  size?: number;
}

const NightingaleChart: React.FC<NightingaleChartProps> = ({
  indicators,
  totalScore: _totalScore,
  scorePercentage,
  activeSegment,
  onSegmentClick,
  size = 400,
}) => {
  const chartData = indicators.map(ind => ({
    ...ind,
    value: ind.weight, // Angle = Weight
    outerRadiusScale: ind.normalized // Radius = Score
  }));

  const activeIndex = activeSegment
    ? chartData.findIndex((d) => d.metric_key === activeSegment)
    : -1;
  
  const handleClick = useCallback((_: any, index: number) => {
    if (chartData[index]) {
      onSegmentClick(chartData[index]);
    }
  }, [chartData, onSegmentClick]);

  const renderCustomShape = (props: any) => {
    const { cx, cy, startAngle, endAngle, fill, payload, index } = props;
    const isActive = index === activeIndex;
    
    // Dimensions
    // Calculate max radius based on container size
    const maxRadius = size * 0.45; 
    const baseInner = size * 0.12; 
    
    // Calculate dynamic outer radius based on score (normalized 0-1)
    const scoreRadius = baseInner + ( (maxRadius - baseInner) * payload.outerRadiusScale );
    
    // Pop out effect on hover/active
    const focusActiveOffset = isActive ? 10 : 0;
    
    // Colors
    const trackColor = '#F5F7FA'; // Very light gray from theme
    const strokeColor = '#FFFFFF'; // Separator lines

    return (
      <g>
        {/* Background Track (Full Potential) */}
        <Sector 
          cx={cx} cy={cy} 
          innerRadius={baseInner} 
          outerRadius={maxRadius} 
          startAngle={startAngle} endAngle={endAngle} 
          fill={trackColor}
          stroke={strokeColor}
          strokeWidth={2}
          cornerRadius={6}
          style={{ cursor: 'pointer' }}
          onClick={() => handleClick(null, index)}
        />
        
        {/* Score Slice (Actual Performance) */}
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={baseInner}
          outerRadius={scoreRadius + focusActiveOffset}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          stroke={strokeColor}
          strokeWidth={2}
          cornerRadius={6}
          onClick={() => handleClick(null, index)}
          style={{ 
            filter: isActive ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' : 'none', 
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
          }}
        />
      </g>
    );
  };

  const scoreColor = '#2C3E50'; // Primary theme color

  return (
    <div style={{ position: 'relative', width: '100%', height: size }}>
      {/* Center Summary - Rendered FIRST to stay behind chart interactions/tooltip */}
       <div style={{ 
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        pointerEvents: 'none',
        zIndex: 0,
      }}>
        <div style={{ fontSize: size * 0.1, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
          {Math.round(scorePercentage)}
        </div>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#999', marginTop: 4 }}>
          Score
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%" style={{ zIndex: 1 }}>
        <PieChart>
          <Pie
            {...({ activeIndex } as any)}
            activeShape={renderCustomShape}
            data={chartData}
            cx="50%"
            cy="50%"
            dataKey="value" 
            onClick={handleClick}
            shape={renderCustomShape}
            stroke="none"
            paddingAngle={0}
          >
             {chartData.map((entry) => (
              <Cell key={entry.metric_key} fill={entry.color} />
            ))}
          </Pie>
           <Tooltip 
            wrapperStyle={{ zIndex: 1000 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload as PersonalIndicatorScore & { value: number, rawValue: number };
                const pct = Math.round(d.normalized * 100);
                return (
                  <div style={{ 
                    background: '#fff', 
                    padding: '12px 16px', 
                    borderRadius: 8, 
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)', 
                    border: '1px solid #f0f0f0',
                    borderLeft: `4px solid ${d.color}`
                  }}>
                    <div style={{fontWeight: 600, color: '#2C3E50', marginBottom: 4}}>{d.name}</div>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 160}}>
                      <Text type="secondary">Score</Text>
                      <Text strong style={{ fontSize: 16 }}>{pct}%</Text>
                    </div>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4}}>
                      <Text type="secondary">Weight</Text>
                      <Tag style={{margin: 0}}>{d.weight} pts</Tag>
                    </div>
                    {d.raw_value !== null && (
                      <div style={{marginTop: 8, paddingTop: 8, borderTop: '1px solid #f5f5f5', fontSize: 12, color: '#888'}}>
                        Raw: {d.raw_value} {d.unit}
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default NightingaleChart;
