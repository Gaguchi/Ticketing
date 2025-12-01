export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
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
  const priorityMap: Record<number, string> = {
    1: 'Low',
    2: 'Medium',
    3: 'High',
    4: 'Critical',
  };
  return priorityMap[priorityId] || 'Medium';
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
