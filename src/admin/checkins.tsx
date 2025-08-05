import { useState, useEffect } from 'react'
import { request } from '../util/request';
import { BASE_URL } from '../util/config';

interface CheckinRecord {
  id: number
  guardName: string
  phoneNumber: string
  timestamp: string
  latitude: number
  longitude: number
  period: string
}

export default function CheckinRecords() {
  const [records, setRecords] = useState<CheckinRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [onlyToday, setOnlyToday] = useState(true);

  useEffect(() => {
    request(`${BASE_URL}/api/checkin`)
      .then(res => {
        if (!res.ok) throw new Error('获取签到记录失败');
        return res.json();
      })
      .then(data => setRecords(data))
      .catch(err => {
        console.error(err);
        alert('获取签到记录失败，请稍后重试');
      })
      .finally(() => setLoading(false));
  }, []);

  function isToday(timestamp: string) {
    const date = new Date(timestamp);
    return date.toDateString() === new Date().toDateString();
  }

  const filteredRecords = records
    .filter(r => r.guardName.includes(searchName))
    .filter(r => !onlyToday || isToday(r.timestamp))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (loading) return <div className="p-6 text-gray-600">加载中...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">签到记录查询</h1>

      {/* 搜索 & 筛选 */}
      <div className="mb-4 flex items-center gap-4">
        <input
          type="text"
          value={searchName}
          onChange={e => setSearchName(e.target.value)}
          placeholder="输入姓名筛选"
          className="border border-gray-300 px-3 py-1 rounded"
        />
        <label className="text-sm flex items-center gap-1">
          <input
            type="checkbox"
            checked={onlyToday}
            onChange={() => setOnlyToday(!onlyToday)}
          />
          只显示今天
        </label>
        <span className="text-gray-500 text-sm">
          共 {filteredRecords.length} 条记录
        </span>
      </div>

      {/* 表格 */}
      <table className="w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">ID</th>
            <th className="border p-2">姓名</th>
            <th className="border p-2">手机号</th>
            <th className="border p-2">时段</th>
            <th className="border p-2">时间</th>
            <th className="border p-2">纬度</th>
            <th className="border p-2">经度</th>
          </tr>
        </thead>
        <tbody>
          {filteredRecords.map((record) => (
            <tr key={record.id}>
              <td className="border p-2 text-center">{record.id}</td>
              <td className="border p-2">{record.guardName}</td>
              <td className="border p-2">{record.phoneNumber}</td>
              <td className="border p-2">{record.period}</td>
              <td className="border p-2">{new Date(record.timestamp).toLocaleString()}</td>
              <td className="border p-2">{record.latitude}</td>
              <td className="border p-2">{record.longitude}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}