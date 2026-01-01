# Dashboard 统计接口文档

## 概述

提供管理后台首页所需的统计数据，包括员工统计、单位统计、签到统计和最近签到记录。

---

## 接口信息

**GET** `/api/statistics/dashboard`

**认证**: 需要 Bearer Token

---

## 响应示例

```json
{
  "success": true,
  "data": {
    "guards": {
      "total": 31,
      "averageAge": 36,
      "teamLeaderCount": 14,
      "teamMemberCount": 17
    },
    "sites": {
      "total": 24
    },
    "checkins": {
      "today": {
        "total": 30,
        "uniqueGuards": 20,
        "checkinRate": 65
      },
      "weekly": {
        "total": 160,
        "trend": [
          { "date": "2025-12-25", "count": 20 },
          { "date": "2025-12-26", "count": 22 },
          { "date": "2025-12-27", "count": 22 },
          { "date": "2025-12-28", "count": 22 },
          { "date": "2025-12-29", "count": 22 },
          { "date": "2025-12-30", "count": 22 },
          { "date": "2025-12-31", "count": 30 }
        ]
      },
      "overall": {
        "successCount": 150,
        "failedCount": 9,
        "successRate": 94
      }
    },
    "latestCheckins": [
      {
        "id": "checkin_160",
        "guardName": "郑丽",
        "siteName": "上海市浦东新区陆家嘴金融中心",
        "timestamp": "2025-12-31T15:00:00",
        "status": "failed",
        "reason": "位置验证失败"
      },
      {
        "id": "checkin_159",
        "guardName": "吴刚",
        "siteName": "上海市浦东新区陆家嘴金融中心",
        "timestamp": "2025-12-31T14:45:00",
        "status": "success",
        "reason": null
      }
    ]
  }
}
```

---

## 字段说明

### guards (员工统计)

| 字段 | 类型 | 说明 |
|------|------|------|
| `total` | int | 员工总数 |
| `averageAge` | int | 员工平均年龄（四舍五入取整） |
| `teamLeaderCount` | int | 队长数量（role='TEAM_LEADER'） |
| `teamMemberCount` | int | 队员数量（role='TEAM_MEMBER'） |

### sites (单位统计)

| 字段 | 类型 | 说明 |
|------|------|------|
| `total` | int | 单位总数 |

### checkins.today (今日签到)

| 字段 | 类型 | 说明 |
|------|------|------|
| `total` | int | 今日签到次数 |
| `uniqueGuards` | int | 今日签到人数（去重） |
| `checkinRate` | int | 今日签到率（百分比整数，如65表示65%） |

### checkins.weekly (周统计)

| 字段 | 类型 | 说明 |
|------|------|------|
| `total` | int | 过去7天签到总次数 |
| `trend` | array | 过去7天每天签到数，从最早到最近排序 |
| `trend[].date` | string | 日期，格式 `YYYY-MM-DD` |
| `trend[].count` | int | 当天签到次数 |

### checkins.overall (总体统计)

| 字段 | 类型 | 说明 |
|------|------|------|
| `successCount` | long | 历史成功签到总数 |
| `failedCount` | long | 历史失败签到总数 |
| `successRate` | int | 成功率百分比（整数） |

### latestCheckins (最近签到)

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 签到记录ID，格式 `checkin_{id}` |
| `guardName` | string | 员工姓名 |
| `siteName` | string | 单位名称 |
| `timestamp` | string | ISO8601时间戳 |
| `status` | string | `success` / `failed` / `pending` |
| `reason` | string? | 失败原因（成功时为null） |

---

## 前端使用示例

```javascript
async function fetchDashboard() {
  const response = await fetch('/api/statistics/dashboard', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const result = await response.json();

  if (result.success) {
    const { guards, sites, checkins, latestCheckins } = result.data;

    // 更新员工统计卡片
    updateGuardStats(guards);

    // 更新签到率
    updateCheckinRate(checkins.today.checkinRate);

    // 渲染周趋势图表
    renderWeeklyChart(checkins.weekly.trend);

    // 显示最近签到列表
    renderLatestCheckins(latestCheckins);
  }
}

// 渲染周趋势图表（ECharts示例）
function renderWeeklyChart(trend) {
  const chart = echarts.init(document.getElementById('weekly-chart'));

  chart.setOption({
    xAxis: {
      type: 'category',
      data: trend.map(item => item.date)
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      data: trend.map(item => item.count),
      type: 'line',
      smooth: true
    }]
  });
}
```

---

## 计算逻辑说明

### 签到率计算

```
checkinRate = (今日签到人数 / 员工总数) × 100
```

### 成功率计算

```
successRate = (成功签到数 / (成功签到数 + 失败签到数)) × 100
```

注：PENDING 状态的记录不计入成功率统计。

### 周趋势

- 统计过去7天（包含今天）的签到数据
- 如果某天没有签到记录，count 为 0
- 按日期从早到晚排序

---

## 错误响应

```json
{
  "success": false,
  "data": null
}
```

---

## 更新日志

- **2025-12-31**: 新增 Dashboard 统计接口
