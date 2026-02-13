import i18n from '../i18n';

export const formatDate = (dateString: string): string => {
  const t = i18n.getFixedT(null, 'common');
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return t('time.justNow');
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return t('time.minuteAgo', { count: diffInMinutes });
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return t('time.hourAgo', { count: diffInHours });
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return t('time.dayAgo', { count: diffInDays });
  }

  return date.toLocaleDateString();
};

export const getPriorityColor = (priorityId: number | string): string => {
  // Handle both priority_id (number) and priority (string) formats
  let priority: string;
  
  if (typeof priorityId === 'number') {
    const priorityMap: Record<number, string> = {
      1: 'Low',
      2: 'Medium',
      3: 'High',
      4: 'Critical',
    };
    priority = priorityMap[priorityId] || 'Medium';
  } else {
    priority = priorityId;
  }
  
  const colors: Record<string, string> = {
    'Critical': '#f5222d',
    'High': '#fa8c16',
    'Medium': '#1890ff',
    'Low': '#52c41a',
  };
  return colors[priority] || '#d9d9d9';
};

export const getPriorityLabel = (priorityId: number): string => {
  const t = i18n.getFixedT(null, 'common');
  const priorityMap: Record<number, string> = {
    1: t('priority.low'),
    2: t('priority.medium'),
    3: t('priority.high'),
    4: t('priority.critical'),
  };
  return priorityMap[priorityId] || t('priority.medium');
};

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'Open': '#1890ff',
    'In Progress': '#faad14',
    'Resolved': '#52c41a',
    'Closed': '#8c8c8c',
  };
  return colors[status] || '#d9d9d9';
};

export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
