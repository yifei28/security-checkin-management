// 测试API参数生成逻辑
console.log('=== 日期筛选API参数测试 ===');

// 复制前端的时间格式化逻辑
const formatLocalDateTime = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

// 模拟当前时间
const now = new Date();
console.log('当前时间:', now.toString());
console.log('当前时间 (本地):', now.toLocaleString('zh-CN'));

// 测试今天的时间范围
console.log('\n=== 今天筛选测试 ===');
const today = new Date(now);
today.setHours(0, 0, 0, 0);
const startDate = formatLocalDateTime(today);

const todayEnd = new Date(now);
todayEnd.setHours(23, 59, 59, 999);
const endDate = formatLocalDateTime(todayEnd);

console.log('开始时间:', startDate);
console.log('结束时间:', endDate);

// 生成API参数
const params = new URLSearchParams({
  page: '1',
  pageSize: '20',
  sortBy: 'timestamp',
  sortOrder: 'desc',
  startDate: startDate,
  endDate: endDate
});

console.log('\n=== API参数 ===');
console.log('完整URL参数:', params.toString());
console.log('API URL:', `http://localhost:8080/api/checkin?${params}`);

// 测试记录是否应该被包含
console.log('\n=== 记录筛选测试 ===');
const testRecords = [
  { timestamp: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T10:30:00`, description: '今天上午10:30' },
  { timestamp: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T00:00:00`, description: '今天00:00' },
  { timestamp: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T23:59:59`, description: '今天23:59' },
];

// 添加昨天和明天的记录测试
const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);

testRecords.push(
  { timestamp: `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}T10:30:00`, description: '昨天10:30 (应排除)' },
  { timestamp: `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}T10:30:00`, description: '明天10:30 (应排除)' }
);

const startTime = new Date(startDate);
const endTime = new Date(endDate);

testRecords.forEach(record => {
  const recordTime = new Date(record.timestamp);
  const shouldInclude = recordTime >= startTime && recordTime <= endTime;
  console.log(`${record.description}: ${record.timestamp} -> ${shouldInclude ? '✅ 包含' : '❌ 排除'}`);
});

console.log('\n=== 总结 ===');
console.log('如果后端正确处理这些参数，应该只返回今天的记录。');
console.log('如果仍然返回其他日期的记录，问题可能在于:');
console.log('1. 后端时区解析不正确');
console.log('2. 后端筛选逻辑有问题');
console.log('3. 数据库中的时间格式与前端预期不符');