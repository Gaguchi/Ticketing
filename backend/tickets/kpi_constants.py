"""
KPI Indicator Definitions

Each indicator maps to a metric computed in KPIViewSet._calculate_user_metrics().

Config types determine how the superadmin-set value maps to scoring bounds:
- target: "Achieve X" → green=value, red=0 (higher is better)
- sla: "Under X hours" → green=value, red=value×3 (lower is better, time-based)
- min_rating: "At least X stars" → green=value, red=1.0 (rating scale)
- min_percent: "At least X%" → green=value, red=0 (percentage)
- max_count: "Max X allowed" → green=0, red=value (lower is better, count-based)
- max_capacity: "Under X" → green=0, red=value (lower is better, capacity)
- max_percent: "Max X%" → green=0, red=value (lower is better, percentage)
"""

AVAILABLE_INDICATORS = {
    'tickets_resolved': {
        'name': 'Tickets Resolved',
        'description': 'Number of tickets you completed within the selected date range.',
        'formula': 'COUNT(tickets WHERE assignee=you AND (status=Done OR archived) AND completion_date IN date_range)',
        'higher_is_better': True,
        'normalization': 'team_max',
        'unit': 'tickets',
        'config': {
            'type': 'target',
            'label': 'Target',
            'input_label': 'tickets for full score',
            'question': 'How many tickets should a team member resolve?',
            'default_value': 15,
            'min': 1,
            'step': 1,
        },
    },
    'avg_resolution_hours': {
        'name': 'Avg Resolution Time',
        'description': 'Average time from ticket creation to Done status, across your resolved tickets.',
        'formula': 'AVG(done_at \u2212 created_at) in hours, for your resolved tickets where done_at is set',
        'higher_is_better': False,
        'normalization': 'team_min_max',
        'unit': 'hours',
        'config': {
            'type': 'sla',
            'label': 'SLA Target',
            'input_label': 'hours',
            'question': 'What is the target average resolution time?',
            'default_value': 24,
            'min': 1,
            'step': 1,
            'presets': [8, 24, 48, 72],
        },
    },
    'avg_customer_rating': {
        'name': 'Customer Rating',
        'description': 'Average satisfaction rating left by customers on your resolved tickets.',
        'formula': 'AVG(resolution_rating) for your resolved tickets where a rating exists, scale 1\u20135',
        'higher_is_better': True,
        'normalization': 'fixed_range',
        'unit': 'stars',
        'min_value': 1,
        'max_value': 5,
        'config': {
            'type': 'min_rating',
            'label': 'Minimum Rating',
            'input_label': 'stars average',
            'question': 'What is the minimum acceptable customer rating?',
            'default_value': 4.0,
            'min': 1,
            'max': 5,
            'step': 0.5,
        },
    },
    'avg_first_response_hours': {
        'name': 'Pickup Time',
        'description': 'Average time from ticket creation to when you were assigned to the ticket.',
        'formula': 'AVG(first_assignment.created_at − ticket.created_at) in hours, for resolved tickets where you were assigned',
        'higher_is_better': False,
        'normalization': 'team_min_max',
        'unit': 'hours',
        'config': {
            'type': 'sla',
            'label': 'SLA Target',
            'input_label': 'hours',
            'question': 'What is the target ticket pickup time?',
            'default_value': 4,
            'min': 1,
            'step': 1,
            'presets': [1, 4, 8, 24],
        },
    },
    'sla_compliance_rate': {
        'name': 'SLA Compliance',
        'description': 'Percentage of resolved tickets completed before their due date.',
        'formula': 'COUNT(resolved tickets WHERE done_at \u2264 due_date) / COUNT(resolved tickets WITH due_date) \u00d7 100',
        'higher_is_better': True,
        'normalization': 'percentage',
        'unit': '%',
        'config': {
            'type': 'min_percent',
            'label': 'Minimum Rate',
            'input_label': '% compliance rate',
            'question': 'What is the minimum acceptable SLA compliance rate?',
            'default_value': 80,
            'min': 0,
            'max': 100,
            'step': 5,
        },
    },
    'reopen_rate': {
        'name': 'Reopen Rate',
        'description': 'Percentage of resolved tickets that were reopened after being marked as done.',
        'formula': 'COUNT(resolved tickets with status change from Done to non-Done) / COUNT(resolved tickets) \u00d7 100',
        'higher_is_better': False,
        'normalization': 'percentage',
        'unit': '%',
        'config': {
            'type': 'max_percent',
            'label': 'Max Acceptable',
            'input_label': '% reopen rate',
            'question': 'What is the maximum acceptable reopen rate?',
            'default_value': 10,
            'min': 0,
            'max': 100,
            'step': 5,
        },
    },
    'tickets_created': {
        'name': 'Tickets Created',
        'description': 'Number of tickets you reported/created within the selected date range.',
        'formula': 'COUNT(tickets WHERE reporter=you AND created_at IN date_range)',
        'higher_is_better': True,
        'normalization': 'team_max',
        'unit': 'tickets',
        'config': {
            'type': 'target',
            'label': 'Target',
            'input_label': 'tickets for full score',
            'question': 'How many tickets should a team member create/report?',
            'default_value': 10,
            'min': 1,
            'step': 1,
        },
    },
}

METRIC_KEY_CHOICES = [(key, meta['name']) for key, meta in AVAILABLE_INDICATORS.items()]
