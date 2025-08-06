import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function AdminDashboard() {
  const dashboardCards = [
    {
      title: "保安管理",
      description: "添加、编辑、删除保安信息",
      link: "/admin/guards"
    },
    {
      title: "单位管理", 
      description: "设置单位位置与分配保安",
      link: "/admin/sites"
    },
    {
      title: "签到记录查询",
      description: "查询保安每日签到详情", 
      link: "/admin/checkins"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">管理后台首页</h1>
        <p className="text-muted-foreground">欢迎使用安全巡检管理系统</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {dashboardCards.map((card, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{card.title}</CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to={card.link}>
                <Button className="w-full">
                  进入管理
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
