import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Sidebar } from "@/components/sidebar"
import { ConnectRepo } from "@/components/dashboard/connect-repo"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { LiveAgentActivity } from "@/components/dashboard/live-agent-activity"
import { TestSuiteTable } from "@/components/dashboard/test-suite-table"
import { ChevronRight, Home } from "lucide-react"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const userId = session.user?.id || ""

  // Fetch real counts and test cases from database
  const activeReposCount = await prisma.selectedRepo.count({
    where: { userId }
  })

  const testsGeneratedCount = await prisma.generatedTests.count({
    where: { userId }
  })

  const testCases = await prisma.generatedTests.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-auto">
        {/* Top Bar */}
        <header className="flex h-14 shrink-0 items-center border-b border-border bg-card/50 px-6 backdrop-blur-sm">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Home className="h-3.5 w-3.5" />
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">Dashboard</span>
          </nav>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 space-y-6 p-6">
          {/* Section 1: Connect Repo */}
          <ConnectRepo />

          {/* Section 2: KPIs + Live Activity */}
          <KpiCards 
            activeReposCount={activeReposCount} 
            testsGeneratedCount={testsGeneratedCount} 
          />

          <LiveAgentActivity />

          {/* Section 3: Test Suite Table */}
          <TestSuiteTable testCases={testCases} />
        </div>
      </main>
    </div>
  )
}
