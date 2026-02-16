import React, { useState } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Space,
  Tag,
  Divider,
} from 'antd';
import {
  PieChart,
  Pie,
  Cell,
  Sector,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
// Import theme colors directly or hardcode them based on the file I viewed
// Primary: #2C3E50, Success: #27AE60, Warning: #F39C12, Info: #3498DB
// Let's create a palette that fits this professional aesthetic.

const { Title, Paragraph, Text } = Typography;

// Mock Data Types
interface Indicator {
  key: string;
  name: string;
  weight: number;
  score: number; // weighted score
  normalized: number; // 0 to 1
  color: string;
  rawValue: number;
  unit: string;
}

// Professional Palette based on App Theme
const APP_COLORS = {
  primary: '#2C3E50',
  success: '#27AE60',
  warning: '#F39C12',
  info: '#3498DB',
  error: '#E74C3C',
  purple: '#8E44AD', // Adding a complementary color for variety
  teal: '#16A085',
};

const mockIndicators: Indicator[] = [
  {
    key: 'tickets',
    name: 'Tickets Resolved',
    weight: 30,
    score: 24, // 80%
    normalized: 0.8,
    color: APP_COLORS.info, 
    rawValue: 45,
    unit: 'tickets'
  },
  {
    key: 'time',
    name: 'Resolution Time',
    weight: 25,
    score: 15, // 60%
    normalized: 0.6,
    color: APP_COLORS.purple, 
    rawValue: 2.5,
    unit: 'hours'
  },
  {
    key: 'rating',
    name: 'Customer Rating',
    weight: 25,
    score: 23.75, // 95%
    normalized: 0.95,
    color: APP_COLORS.warning, 
    rawValue: 4.8,
    unit: 'stars'
  },
  {
    key: 'acceptance',
    name: 'Acceptance Rate',
    weight: 20,
    score: 12, // 60%
    normalized: 0.6,
    color: APP_COLORS.success,
    rawValue: 85,
    unit: '%'
  }
];

const totalScore = mockIndicators.reduce((sum, i) => sum + i.score, 0);
const totalWeight = 100;
const scorePercentage = (totalScore / totalWeight) * 100;

// ============================================================================
// Refined Nightingale Rose Chart
// ============================================================================

const NightingaleRoseChart = () => {
    const [activeIndex, setActiveIndex] = useState<number>(-1);

    const data = mockIndicators.map(ind => ({
        ...ind,
        value: ind.weight, // Angle = Weight
        outerRadiusScale: ind.normalized // Radius = Score
    }));

    const onPieEnter = (_: any, index: number) => {
        setActiveIndex(index);
    };

    const renderCustomShape = (props: any) => {
        const { cx, cy, innerRadius: _innerRadius, startAngle, endAngle, fill, payload, index } = props;
        const isActive = index === activeIndex;
        
        // Dimensions
        // We want a large, impressive chart.
        const maxRadius = 180; 
        const baseInner = 50; // Smaller inner circle for a "flower" look
        
        // Calculate dynamic outer radius based on score (normalized 0-1)
        const scoreRadius = baseInner + ( (maxRadius - baseInner) * payload.outerRadiusScale );
        
        // Pop out effect on hover
        const focusActiveOffset = isActive ? 10 : 0;
        
        // Colors
        // Background track should be subtle but visible to show "Potential"
        const trackColor = 'var(--color-bg-inset)';
        const strokeColor = 'var(--color-bg-surface)';

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
                    style={{ 
                        filter: isActive ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' : 'none', 
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
                    }}
                />
                
                {/* Optional: Label at the end of the slice? Maybe too cluttered. Keep it clean. */}
            </g>
        );
    };

    return (
        <div style={{ width: '100%', height: 450, position: 'relative' }}>
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        {...({ activeIndex } as any)}
                        activeShape={renderCustomShape}
                        data={data}
                        cx="50%"
                        cy="50%"
                        dataKey="value" 
                        onMouseEnter={onPieEnter}
                        onMouseLeave={() => setActiveIndex(-1)}
                        shape={renderCustomShape}
                        stroke="none"
                        paddingAngle={0} // Using stroke for separation instead of padding for a tighter look
                    >
                         {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                     <Tooltip 
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                                <div style={{
                                    background: 'var(--color-bg-elevated)',
                                    padding: '12px 16px',
                                    borderRadius: 8,
                                    boxShadow: 'var(--shadow-md)',
                                    border: '1px solid var(--color-border-light)',
                                    borderLeft: `4px solid ${d.color}`
                                }}>
                                    <div style={{fontWeight: 600, color: 'var(--color-text-heading)', marginBottom: 4}}>{d.name}</div>
                                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 160}}>
                                        <Text type="secondary">Score</Text>
                                        <Text strong style={{ fontSize: 'var(--fs-lg)' }}>{Math.round(d.normalized * 100)}%</Text>
                                    </div>
                                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4}}>
                                        <Text type="secondary">Weight</Text>
                                        <Tag style={{margin: 0}}>{d.weight} pts</Tag>
                                    </div>
                                    <div style={{marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-border-light)', fontSize: 'var(--fs-sm)', color: 'var(--color-text-muted)'}}>
                                        Raw: {d.rawValue} {d.unit}
                                    </div>
                                </div>
                            );
                            }
                            return null;
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
            
            {/* Center Summary */}
             <div style={{ 
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none'
            }}>
                <div style={{ fontSize: 42, fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1 }}>
                    {Math.round(scorePercentage)}
                </div>
                <div style={{ fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--color-text-muted)', marginTop: 4 }}>
                    Score
                </div>
            </div>
        </div>
    );
};


// ============================================================================
// Main Demo Page
// ============================================================================

const KPIDemoPage: React.FC = () => {

  return (
    <div style={{ padding: 40, maxWidth: 1000, margin: '0 auto', background: 'var(--color-bg-inset)', minHeight: '100vh' }}>
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
            <Title level={2} style={{ color: 'var(--color-primary)' }}>Your Performance</Title>
            <Paragraph type="secondary" style={{ fontSize: 'var(--fs-lg)', maxWidth: 600, margin: '0 auto' }}>
                A visual breakdown of your weighted KPI scores. The <strong>radius</strong> represents your score, while the <strong>slice width</strong> represents the metric's weight.
            </Paragraph>
        </div>

        <Row gutter={[24, 24]} justify="center">
            {/* Chart Column */}
            <Col xs={24} lg={14}>
                <Card bordered={false} style={{ height: '100%', borderRadius: 16, boxShadow: 'var(--shadow-md)' }}>
                    <NightingaleRoseChart />
                </Card>
            </Col>

            {/* Legend / Details Column */}
            <Col xs={24} lg={10}>
                <Card bordered={false} style={{ height: '100%', borderRadius: 16, boxShadow: 'var(--shadow-md)' }}>
                    <Title level={4} style={{ marginTop: 0 }}>Metrics Breakdown</Title>
                    <Divider style={{ margin: '16px 0' }} />
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {mockIndicators.map(ind => (
                            <div key={ind.key} style={{ display: 'flex', alignItems: 'center' }}>
                                {/* Color Dot */}
                                <div style={{ 
                                    width: 12, height: 12, borderRadius: '50%', 
                                    background: ind.color, marginRight: 16,
                                    boxShadow: `0 0 0 4px ${ind.color}22` 
                                }}></div>
                                
                                {/* Info */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text strong style={{ color: 'var(--color-text-heading)' }}>{ind.name}</Text>
                                        <Text strong>{Math.round(ind.normalized * 100)}%</Text>
                                    </div>
                                    <Space size="small">
                                        <Tag bordered={false} style={{ fontSize: 'var(--fs-xs)' }}>Weight: {ind.weight}</Tag>
                                        <Text type="secondary" style={{ fontSize: 'var(--fs-sm)' }}>
                                            {ind.rawValue} {ind.unit}
                                        </Text>
                                    </Space>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Divider />
                    
                    <div style={{ background: 'var(--color-bg-inset)', padding: 16, borderRadius: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text type="secondary">Total Weighted Score</Text>
                            <Text strong style={{ fontSize: 'var(--fs-xl)' }}>{scorePercentage.toFixed(1)} / 100</Text>
                        </div>
                        <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ 
                                height: '100%', 
                                width: `${scorePercentage}%`, 
                                background: `linear-gradient(90deg, ${APP_COLORS.success}, ${APP_COLORS.info})`,
                                borderRadius: 3
                            }}></div>
                        </div>
                    </div>
                </Card>
            </Col>
        </Row>
    </div>
  );
};

export default KPIDemoPage;
