"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Sidebar } from "@/components/sidebar"
import { ChevronRight, Home, GitBranch, FileText, Beaker, Loader2, CheckCircle2, AlertCircle, Play, Terminal } from "lucide-react"

interface TestCase {
  testCaseId: string
  title: string
  description: string
  type: string
  priority: string
  targetRoute: string
  targetFiles: string[]
  expectedResult: string
  repoName?: string
  repoOwner?: string
  branch?: string
}

export default function RepoInfoPage() {
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [generating, setGenerating] = useState(false)
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [selectedTestCaseIds, setSelectedTestCaseIds] = useState<Set<string>>(new Set())
  const [savingSelected, setSavingSelected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [targetUrlOverride, setTargetUrlOverride] = useState("")
  const [deploymentUrl, setDeploymentUrl] = useState("")
  const [savingDeployment, setSavingDeployment] = useState(false)
  const [executionResults, setExecutionResults] = useState<Record<string, {
    status: string
    logs: string
    sessionId: string
    script: string
  }>>({})
  const [expandedScripts, setExpandedScripts] = useState<Set<string>>(new Set())

  const toggleScriptExpand = (id: string) => {
    setExpandedScripts((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const id = searchParams.get("id") ?? ""
  const fullName = searchParams.get("fullName") ?? ""
  const branch = searchParams.get("branch") ?? "main"
  const url = searchParams.get("url") ?? ""
  const [owner, name] = fullName.split("/")

  useEffect(() => {
    setError(null)
    setSuccess(null)
    setTestCases([])
    setSelectedTestCaseIds(new Set())
    setDeploymentUrl("")
    setTargetUrlOverride("")
  }, [fullName])

  // Fetch deployment URL when repo changes
  useEffect(() => {
    (async () => {
      if (!id) return
      try {
        const res = await fetch(`/api/selectedRepo?githubRepoId=${encodeURIComponent(id)}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.deploymentUrl) {
          setDeploymentUrl(data.deploymentUrl)
          setTargetUrlOverride(data.deploymentUrl)
        }
      } catch { /* ignore */ }
    })()
  }, [id])

  const toggleSelectTestCase = (id: string) => {
    setSelectedTestCaseIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedTestCaseIds.size === testCases.length) {
      setSelectedTestCaseIds(new Set())
    } else {
      setSelectedTestCaseIds(new Set(testCases.map((tc) => tc.testCaseId)))
    }
  }

  const runSelectedTestCases = async () => {
    if (selectedTestCaseIds.size === 0) return
    setSavingSelected(true)
    setError(null)
    setSuccess(null)

    const selectedCases = testCases.filter((tc) => selectedTestCaseIds.has(tc.testCaseId))
    const casesToSend = selectedCases.map((tc) => {
      if (targetUrlOverride) {
        try {
          const overrideUrl = targetUrlOverride.endsWith("/")
            ? targetUrlOverride
            : targetUrlOverride + "/";
          let path = tc.targetRoute;
          if (path.startsWith("http://") || path.startsWith("https://")) {
            const urlObj = new URL(path);
            path = urlObj.pathname + urlObj.search;
          } else {
            const firstSlash = path.indexOf("/");
            if (firstSlash !== -1 && path.includes(":")) {
              path = path.substring(firstSlash);
            }
          }
          if (path.startsWith("/")) {
            path = path.substring(1);
          }
          return {
            ...tc,
            targetRoute: overrideUrl + path,
          };
        } catch (e) {
          return {
            ...tc,
            targetRoute: targetUrlOverride,
          };
        }
      }
      return tc;
    });

    try {
      console.log('selected cases:', casesToSend)
      const res = await fetch("/api/testcase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testCases: casesToSend }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to run selected test cases")
        return
      }

      if (data.results) {
        const newResults = { ...executionResults }
        data.results.forEach((r: any) => {
          newResults[r.testCaseId] = {
            status: r.status,
            logs: r.logs,
            sessionId: r.sessionId,
            script: r.script,
          }
        })
        setExecutionResults(newResults)
      }

      setSuccess(data.message || `Executed ${selectedCases.length} test case(s) successfully`)
    } catch (err: any) {
      setError(err.message || "Request failed")
    } finally {
      setSavingSelected(false)
    }
  }

  const generateTests = async () => {
    setGenerating(true)
    setError(null)
    setSuccess(null)
    setTestCases([])
    setSelectedTestCaseIds(new Set())
    console.log('repo id:', id)
    try {
      const res = await fetch("/api/selectedRepo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session?.user?.email ?? "unknown",
          repoId: id,
          owner,
          repo: name,
          branch,
          githubToken: (session as any)?.accessToken ?? "",
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to generate test cases")
        return
      }

      setTestCases(data.testCases || [])
      setSuccess(`Generated ${data.count} test case(s) successfully`)
    } catch (err: any) {
      setError(err.message || "Request failed")
    } finally {
      setGenerating(false)
    }
  }

  const saveDeploymentUrl = async () => {
    setSavingDeployment(true)
    setError(null)
    setSuccess(null)
    try {
      // Find the internal repoId from the first test case or fetch it
      let repoId = ""
      if (testCases.length > 0) {
        const res = await fetch("/api/selectedRepo?githubRepoId=" + encodeURIComponent(id))
        if (res.ok) {
          const data = await res.json()
          repoId = data.repo?.id ?? ""
        }
      }
      if (!repoId) {
        setError("Generate test cases first to save deployment URL")
        return
      }
      const res = await fetch("/api/selectedRepo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoId, deploymentUrl }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || "Failed to save deployment URL")
        return
      }
      setTargetUrlOverride(deploymentUrl)
      setSuccess("Deployment URL saved successfully")
    } catch (err: any) {
      setError(err.message || "Failed to save deployment URL")
    } finally {
      setSavingDeployment(false)
    }
  }

  const priorityBadge = (p: string) => {
    const map: Record<string, string> = {
      high: "bg-red-500/10 text-red-400 border-red-500/20",
      medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      low: "bg-green-500/10 text-green-400 border-green-500/20",
    }
    return map[p] || "bg-gray-500/10 text-gray-400"
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-auto">
        <header className="flex h-14 shrink-0 items-center border-b border-border bg-card/50 px-6 backdrop-blur-sm">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Home className="h-3.5 w-3.5" />
            <ChevronRight className="h-3 w-3" />
            <a href="/repos" className="hover:text-foreground transition-colors">Repositories</a>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">{fullName || "Repository Info"}</span>
          </nav>
        </header>

        <div className="flex-1 space-y-6 p-6">
          {!fullName ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-12 text-center">
              <GitBranch className="h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">No repository selected</p>
              <a href="/repos" className="text-sm text-primary hover:underline">Choose a repository</a>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <GitBranch className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">{fullName}</h1>
                  <p className="text-sm text-muted-foreground">
                    Generate AI-powered test cases from this repository
                  </p>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {success}
                </div>
              )}

              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-medium text-foreground">{fullName}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <GitBranch className="h-3.5 w-3.5" />
                        {branch}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {owner}/{name}
                      </span>
                    </div>
                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-primary hover:underline"
                      >
                        {url}
                      </a>
                    )}
                  </div>

                  <button
                    onClick={generateTests}
                    disabled={generating}
                    className="flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Beaker className="h-4 w-4" />
                        Generate Tests
                      </>
                    )}
                  </button>
                </div>
              </div>

              {testCases.length > 0 && !generating && (
                <div className="space-y-4">
                  {/* Deployment URL Section */}
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                      <div className="flex-1 w-full max-w-md space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Deployment URL <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. https://your-app.vercel.app"
                          value={deploymentUrl}
                          onChange={(e) => setDeploymentUrl(e.target.value)}
                          className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Set the deployed URL for this repository. Tests will only execute against deployed projects.
                        </p>
                      </div>
                      <button
                        onClick={saveDeploymentUrl}
                        disabled={savingDeployment || !deploymentUrl}
                        className="flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
                      >
                        {savingDeployment ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Deployment URL"
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Test cases shown only when deployment URL is set */}
                  {deploymentUrl ? (
                    <>
                      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-end border-b border-border/50 pb-4">
                        <div className="flex-1 w-full max-w-md space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Target Base URL Override (runs at: <span className="text-primary">{targetUrlOverride || deploymentUrl}</span>)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. http://localhost:5173"
                            value={targetUrlOverride}
                            onChange={(e) => setTargetUrlOverride(e.target.value)}
                            className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Overrides the deployment URL above (e.g. for local testing against a dev server).
                          </p>
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="select-all"
                              checked={selectedTestCaseIds.size === testCases.length}
                              onChange={handleSelectAll}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer bg-card"
                            />
                            <label htmlFor="select-all" className="text-sm font-medium text-foreground cursor-pointer select-none">
                              Select All ({selectedTestCaseIds.size} / {testCases.length})
                            </label>
                          </div>
                          <button
                            onClick={runSelectedTestCases}
                            disabled={savingSelected || selectedTestCaseIds.size === 0}
                            className="flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
                          >
                            {savingSelected ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Running on Browserbase...
                              </>
                            ) : (
                              <>
                                <Play className="h-3.5 w-3.5 fill-current" />
                                Run Selected Tests
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="grid gap-3">
                    {testCases.map((tc) => (
                      <div
                        key={tc.testCaseId}
                        className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedTestCaseIds.has(tc.testCaseId)}
                            onChange={() => toggleSelectTestCase(tc.testCaseId)}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer bg-card"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-foreground">{tc.title}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityBadge(tc.priority)}`}>
                                {tc.priority}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{tc.description}</p>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span className="rounded-md bg-primary/5 px-2 py-1">{tc.type}</span>
                              <span className="rounded-md bg-primary/5 px-2 py-1">{tc.targetRoute}</span>
                            </div>
                          </div>
                        </div>

                        {executionResults[tc.testCaseId] && (
                          <div className="mt-2 border-t border-border/50 pt-3 space-y-3">
                            <div className="flex items-center gap-2">
                              {executionResults[tc.testCaseId].status === "passed" ? (
                                <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                                  <CheckCircle2 className="h-3 w-3" /> PASSED
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                                  <AlertCircle className="h-3 w-3" /> FAILED
                                </span>
                              )}
                              {executionResults[tc.testCaseId].sessionId && (
                                <span className="text-xs text-muted-foreground">
                                  Session ID: <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[10px]">{executionResults[tc.testCaseId].sessionId}</code>
                                </span>
                              )}
                              <button
                                onClick={() => toggleScriptExpand(tc.testCaseId)}
                                className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                              >
                                <Terminal className="h-3.5 w-3.5" />
                                {expandedScripts.has(tc.testCaseId) ? "Hide Code & Logs" : "Show Code & Logs"}
                              </button>
                            </div>

                            {expandedScripts.has(tc.testCaseId) && (
                              <div className="space-y-3 rounded-lg bg-black/40 border border-border p-3 font-mono text-xs text-gray-300">
                                <div>
                                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Generated Playwright Script</div>
                                  <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-black/60 p-2 text-gray-200 border border-border/40 max-h-60 text-[11px]">
                                    {executionResults[tc.testCaseId].script}
                                  </pre>
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Execution Logs</div>
                                  <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-black/60 p-2 text-gray-200 border border-border/40 max-h-40 text-[11px]">
                                    {executionResults[tc.testCaseId].logs}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                    </>
                    ) : (
                    <div className="flex items-center gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      Set a Deployment URL above to run tests against your deployed project.
                    </div>
                    )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
