import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Switch,
  InputNumber,
  Button,
  message,
  Space,
  Typography,
  Spin,
  Empty,
  Row,
  Col,
  Collapse,
} from 'antd';
import {
  SaveOutlined,
} from '@ant-design/icons';
import { useProject } from '../../contexts/AppContext';
import kpiService from '../../services/kpi.service';
import type { AvailableIndicator, KPIConfigSavePayload, IndicatorConfigMeta } from '../../types/kpi';
import DonutPreview from './DonutPreview';

const { Text } = Typography;

interface IndicatorRow {
  key: string;
  name: string;
  description: string;
  formula: string;
  higher_is_better: boolean;
  unit: string;
  weight: number;
  is_active: boolean;
  config: IndicatorConfigMeta;
  config_value: number | null;
}

/** Generate a human-readable scoring preview based on config type and value */
function scoringPreview(config: IndicatorConfigMeta, value: number | null): string {
  if (value === null) return 'Not configured';
  const v = value;
  const type = config.type;

  if (type === 'target') {
    const mid = Math.round(v / 2);
    return `${v} → 100%  ·  ${mid} → 50%  ·  0 → 0%`;
  }
  if (type === 'sla') {
    const worst = Math.round(v * 3);
    const mid = Math.round(v * 2);
    const midPct = Math.round(((mid - worst) / (v - worst)) * 100);
    return `≤${v}h → 100%  ·  ${mid}h → ${midPct}%  ·  ≥${worst}h → 0%`;
  }
  if (type === 'min_rating') {
    const mid = +((v + 1) / 2).toFixed(1);
    const midPct = Math.round(((mid - 1) / (v - 1)) * 100);
    return `${v}★ → 100%  ·  ${mid}★ → ${midPct}%  ·  1★ → 0%`;
  }
  if (type === 'min_percent') {
    const mid = Math.round(v / 2);
    return `${v}% → 100%  ·  ${mid}% → 50%  ·  0% → 0%`;
  }
  if (type === 'max_count') {
    if (v === 0) return '0 → 100%  ·  1+ → 0% (zero tolerance)';
    const mid = Math.floor(v / 2);
    const midPct = Math.round(((v - mid) / v) * 100);
    return `0 → 100%  ·  ${mid} → ${midPct}%  ·  ${v}+ → 0%`;
  }
  if (type === 'max_capacity') {
    const mid = Math.round(v / 2);
    const midPct = Math.round(((v - mid) / v) * 100);
    return `0 → 100%  ·  ${mid} → ${midPct}%  ·  ${v}+ → 0%`;
  }
  if (type === 'max_percent') {
    const mid = Math.round(v / 2);
    return `0% → 100%  ·  ${mid}% → 50%  ·  ${v}%+ → 0%`;
  }
  return '';
}

/** Format the collapsed summary for an indicator */
function collapsedSummary(config: IndicatorConfigMeta, value: number | null): string {
  if (value === null) return 'Not set';
  if (config.type === 'target') return `Target: ${value}`;
  if (config.type === 'sla') return `SLA: ${value}h`;
  if (config.type === 'min_rating') return `Min: ${value}★`;
  if (config.type === 'min_percent') return `Min: ${value}%`;
  if (config.type === 'max_count') return `Max: ${value}`;
  if (config.type === 'max_capacity') return `Max: ${value}`;
  if (config.type === 'max_percent') return `Max: ${value}%`;
  return `${value}`;
}

const KPIBuilder: React.FC = () => {
  const { selectedProject } = useProject();
  const [indicators, setIndicators] = useState<IndicatorRow[]>([]);
  const [configName, setConfigName] = useState('Default KPI Configuration');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!selectedProject) return;
    setLoading(true);

    try {
      const available = await kpiService.fetchAvailableIndicators();

      let existingMap: Record<string, { weight: number; is_active: boolean; threshold_green: number | null }> = {};
      try {
        const config = await kpiService.fetchKPIConfig(selectedProject.id);
        setConfigName(config.name);
        for (const ind of config.indicators) {
          existingMap[ind.metric_key] = {
            weight: ind.weight,
            is_active: ind.is_active,
            threshold_green: ind.threshold_green,
          };
        }
      } catch {
        // No config yet
      }

      const rows: IndicatorRow[] = available.map((a: AvailableIndicator) => ({
        key: a.key,
        name: a.name,
        description: a.description,
        formula: a.formula,
        higher_is_better: a.higher_is_better,
        unit: a.unit,
        weight: existingMap[a.key]?.weight ?? 10,
        is_active: existingMap[a.key]?.is_active ?? false,
        config: a.config,
        config_value: existingMap[a.key]?.threshold_green ?? a.config.default_value,
      }));

      setIndicators(rows);
    } catch (error) {
      console.error('Failed to load KPI builder data:', error);
      message.error('Failed to load KPI configuration');
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = (key: string, checked: boolean) => {
    setIndicators((prev) =>
      prev.map((row) => (row.key === key ? { ...row, is_active: checked } : row))
    );
  };

  const handleWeightChange = (key: string, value: number | null) => {
    if (value === null) return;
    setIndicators((prev) =>
      prev.map((row) => (row.key === key ? { ...row, weight: value } : row))
    );
  };

  const handleConfigValueChange = (key: string, value: number | null) => {
    setIndicators((prev) =>
      prev.map((row) => (row.key === key ? { ...row, config_value: value } : row))
    );
  };

  const handleSave = async () => {
    if (!selectedProject) return;

    const activeIndicators = indicators.filter((i) => i.is_active);
    if (activeIndicators.length === 0) {
      message.warning('Please enable at least one indicator');
      return;
    }

    for (const ind of activeIndicators) {
      if (ind.config_value === null) {
        message.warning(`Please configure "${ind.name}"`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload: KPIConfigSavePayload = {
        name: configName,
        project: selectedProject.id,
        indicators: indicators.map((i) => ({
          metric_key: i.key,
          weight: i.weight,
          is_active: i.is_active,
          threshold_green: i.config_value,
          threshold_red: null,
        })),
      };
      await kpiService.saveKPIConfig(payload);
      message.success('KPI configuration saved');
    } catch (error) {
      console.error('Failed to save KPI config:', error);
      message.error('Failed to save KPI configuration');
    } finally {
      setSaving(false);
    }
  };

  const activeCount = indicators.filter((i) => i.is_active).length;
  const totalWeight = indicators
    .filter((i) => i.is_active)
    .reduce((sum, i) => sum + i.weight, 0);

  if (!selectedProject) {
    return <Empty description="Please select a project" />;
  }

  const collapseItems = indicators.map((ind) => ({
    key: ind.key,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
        <Switch
          checked={ind.is_active}
          onChange={(checked, e) => {
            e.stopPropagation();
            handleToggle(ind.key, checked);
          }}
          size="small"
        />
        <Text strong style={{ fontSize: 13, flex: 1, opacity: ind.is_active ? 1 : 0.45 }}>
          {ind.name}
        </Text>
        {ind.is_active && (
          <Text type="secondary" style={{ fontSize: 12, minWidth: 80, textAlign: 'right' }}>
            {collapsedSummary(ind.config, ind.config_value)}
          </Text>
        )}
        {ind.is_active && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 90 }}>
            <InputNumber
              min={1}
              max={100}
              value={ind.weight}
              onChange={(val) => handleWeightChange(ind.key, val)}
              size="small"
              style={{ width: 55 }}
              onClick={(e) => e.stopPropagation()}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>pts</Text>
          </div>
        )}
      </div>
    ),
    children: (
      <div style={{ opacity: ind.is_active ? 1 : 0.5, transition: 'opacity 0.15s' }}>
        {/* Question */}
        <Text style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>
          {ind.config.question}
        </Text>

        {/* Config input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Text strong style={{ fontSize: 13, minWidth: 100 }}>{ind.config.label}:</Text>
          <InputNumber
            min={ind.config.min}
            max={ind.config.max}
            step={ind.config.step}
            value={ind.config_value}
            onChange={(val) => handleConfigValueChange(ind.key, val)}
            disabled={!ind.is_active}
            size="small"
            style={{ width: 90 }}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>{ind.config.input_label}</Text>
        </div>

        {/* Quick presets for SLA types */}
        {ind.config.presets && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 12, marginRight: 4 }}>Quick set:</Text>
            {ind.config.presets.map((p) => (
              <Button
                key={p}
                size="small"
                type={ind.config_value === p ? 'primary' : 'default'}
                onClick={() => handleConfigValueChange(ind.key, p)}
                disabled={!ind.is_active}
                style={{ fontSize: 12, padding: '0 8px', height: 24 }}
              >
                {p}h
              </Button>
            ))}
          </div>
        )}

        {/* Scoring preview */}
        <div style={{
          background: '#f5f5f5',
          borderRadius: 6,
          padding: '8px 12px',
        }}>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
            How scoring works
          </Text>
          <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>
            {scoringPreview(ind.config, ind.config_value)}
          </Text>
        </div>
      </div>
    ),
  }));

  return (
    <Spin spinning={loading}>
      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Card
            title="Configure Indicators"
            extra={
              <Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {activeCount} active &middot; {totalWeight} pts
                </Text>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSave}
                  loading={saving}
                >
                  Save
                </Button>
              </Space>
            }
          >
            <Collapse
              items={collapseItems}
              bordered={false}
              expandIconPosition="end"
              style={{ background: 'transparent' }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Preview" style={{ position: 'sticky', top: 16 }}>
            <DonutPreview indicators={indicators} />
            <div style={{
              marginTop: 16,
              padding: '10px 12px',
              background: '#f9fafb',
              borderRadius: 6,
              fontSize: 12,
              color: '#6B7280',
            }}>
              Configure each indicator with a target, SLA, minimum rating, or maximum count.
              Expand any indicator to see how scoring works.
            </div>
          </Card>
        </Col>
      </Row>
    </Spin>
  );
};

export default KPIBuilder;
