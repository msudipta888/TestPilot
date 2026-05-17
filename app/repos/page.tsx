import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Sidebar } from "@/components/sidebar"
import RepoSelector from "@/components/RepoSelector"
import { ChevronRight, Home, GitBranch } from "lucide-react"

export default async function ReposPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-auto">
        {/* Top Bar */}
        <header className="flex h-14 shrink-0 items-center border-b border-border bg-card/50 px-6 backdrop-blur-sm">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Home className="h-3.5 w-3.5" />
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">Repositories</span>
          </nav>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <GitBranch className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Repositories</h1>
              <p className="text-sm text-muted-foreground">
                Select a GitHub repository to ingest and generate tests
              </p>
            </div>
          </div>

          <RepoSelector />
        </div>
      </main>
    </div>
  )
}
