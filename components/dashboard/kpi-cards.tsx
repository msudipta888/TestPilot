"use client"

import { Card, CardContent } from "@/components/ui/card"
import { GitBranch, TestTube, TrendingUp } from "lucide-react"

interface KpiCardsProps {
  activeReposCount: number
  testsGeneratedCount: number
}

export function KpiCards({ activeReposCount, testsGeneratedCount }: KpiCardsProps) {
  const kpis = [
    {
      icon: GitBranch,
      label: "Active Repos",
      value: String(activeReposCount),
      change: "Connected to project",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-400",
    },
    {
      icon: TestTube,
      label: "Tests Generated",
      value: String(testsGeneratedCount),
      change: "Total test cases",
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-400",
    },
    {
      icon: TrendingUp,
      label: "Pass Rate",
      value: "100%",
      change: "All tests ready",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
    },
  ]

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
