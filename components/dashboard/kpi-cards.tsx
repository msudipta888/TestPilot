"use client"

import { Card, CardContent } from "@/components/ui/card"
import { GitBranch, TestTube, TrendingUp } from "lucide-react"

const kpis = [
  {
    icon: GitBranch,
    label: "Active Repos",
    value: "12",
    change: "+3 this week",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
  },
  {
    icon: TestTube,
    label: "Tests Generated",
    value: "1,847",
    change: "+124 today",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-400",
  },
  {
    icon: TrendingUp,
    label: "Pass Rate",
    value: "92%",
    change: "+2.4% vs last week",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
  },
]

export function KpiCards() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.change}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${kpi.iconBg}`}>
                <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
