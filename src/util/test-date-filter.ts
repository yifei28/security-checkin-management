// 测试日期筛选功能
export const testDateFiltering = () => {
  console.log('=== 日期筛选功能测试 ===');
  
  // Helper function - 复制自主组件
  const formatLocalDateTime = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  const now = new Date();
  console.log('当前时间:', now.toLocaleString('zh-CN'));

  // 测试今天的参数生成
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const startDate = formatLocalDateTime(today);

  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const endDate = formatLocalDateTime(todayEnd);

  console.log('今天筛选参数:');
  console.log('  startDate:', startDate);
  console.log('  endDate:', endDate);

  // 构建API URL参数
  const params = new URLSearchParams({
    page: '1',
    pageSize: '20',
    sortBy: 'timestamp',
    sortOrder: 'desc',
    startDate: startDate,
    endDate: endDate
  });

  const fullUrl = `/api/checkin?${params.toString()}`;
  console.log('完整API URL:', fullUrl);

  // 解码后的URL（更容易阅读）
  const decodedUrl = decodeURIComponent(fullUrl);
  console.log('解码后的URL:', decodedUrl);

  // 测试时间范围逻辑
  console.log('\n=== 时间范围测试 ===');
  const testCases = [
    {
      name: '今天早上8点',
      timestamp: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T08:00:00`,
      expected: true
    },
    {
      name: '今天晚上11点',
      timestamp: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T23:00:00`,
      expected: true
    },
    {
      name: '昨天同一时间',
      timestamp: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate() - 1).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`,
      expected: false
    },
    {
      name: '明天同一时间',
      timestamp: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate() + 1).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`,
      expected: false
    }
  ];

  const startTime = new Date(startDate);
  const endTime = new Date(endDate);

  testCases.forEach(testCase => {
    const recordTime = new Date(testCase.timestamp);
    const isIncluded = recordTime >= startTime && recordTime <= endTime;
    const status = isIncluded === testCase.expected ? '✅ 通过' : '❌ 失败';
    
    console.log(`${testCase.name}: ${testCase.timestamp}`);
    console.log(`  期望: ${testCase.expected ? '包含' : '排除'}, 实际: ${isIncluded ? '包含' : '排除'} ${status}`);
  });

  // 返回调试信息，供组件使用
  return {
    currentTime: now.toLocaleString('zh-CN'),
    startDate,
    endDate,
    fullUrl: decodedUrl,
    testCases: testCases.map(testCase => {
      const recordTime = new Date(testCase.timestamp);
      const isIncluded = recordTime >= startTime && recordTime <= endTime;
      return {
        ...testCase,
        actual: isIncluded,
        passed: isIncluded === testCase.expected
      };
    })
  };
};

// 在开发环境下自动运行测试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // 延迟执行，确保在控制台中可见
  setTimeout(() => {
    try {
      testDateFiltering();
    } catch (error) {
      console.error('日期筛选测试失败:', error);
    }
  }, 1000);
}