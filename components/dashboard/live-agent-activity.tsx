"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface LogEntry {
  id: number
  text: string
  type: "info" | "success" | "warning" | "processing"
  timestamp: string
}

const initialLogs: LogEntry[] = [
  {
    id: 1,
    text: "Initializing AgentQA runtime v2.4.1...",
    type: "info",
    timestamp: "00:00:01",
  },
  {
    id: 2,
    text: "Connected to Browserbase cloud farm [us-east-1]",
    type: "success",
    timestamp: "00:00:02",
  },
  {
    id: 3,
    text: "Analyzing /components/ui/button.tsx...",
    type: "processing",
    timestamp: "00:00:04",
  },
  {
    id: 4,
    text: "Detected 12 testable components in repository",
    type: "info",
    timestamp: "00:00:06",
  },
  {
    id: 5,
    text: "Generating Playwright script for Login.tsx...",
    type: "processing",
    timestamp: "00:00:08",
  },
  {
    id: 6,
    text: "Spinning up Browserbase session [session-id: bb_a7f3k2...]",
    type: "warning",
    timestamp: "00:00:10",
  },
  {
    id: 7,
    text: "Test suite generated: auth-flow.spec.ts (3 scenarios)",
    type: "success",
    timestamp: "00:00:12",
  },
  {
    id: 8,
    text: "Running mutation analysis on DashboardHeader...",
    type: "processing",
    timestamp: "00:00:14",
  },
]

const statusColors = {
  info: "bg-terminal-blue",
  success: "bg-terminal-green",
  warning: "bg-terminal-yellow",
  processing: "bg-terminal-blue",
}

export function LiveAgentActivity() {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs)
  const [isStreaming, setIsStreaming] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isStreaming) return

    const interval = setInterval(() => {
      const newLogs: LogEntry[] = [
        {
          id: Date.now(),
          text: `Analyzing ${["/app/dashboard/page.tsx", "/components/header.tsx", "/lib/api/client.ts", "/app/api/auth/route.ts"][Math.floor(Math.random() * 4)]}...`,
          type: "processing",
          timestamp: new Date().toLocaleTimeString(),
        },
        {
          id: Date.now() + 1,
          text: `Test ${["passed", "generated", "queued", "running"][Math.floor(Math.random() * 4)]}: ${["auth", "navigation", "form-validation", "api-response"][Math.floor(Math.random() * 4)]}.spec.ts`,
          type: ["info", "success", "warning", "processing"][Math.floor(Math.random() * 4)] as LogEntry["type"],
          timestamp: new Date().toLocaleTimeString(),
        },
      ]
      setLogs((prev) => [...prev.slice(-50), ...newLogs])
    }, 4000)

    return () => clearInterval(interval)
  }, [isStreaming])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base">Live Agent Activity</CardTitle>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            8 parallel agents
          </Badge>
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            className={cn(
              "text-xs text-muted-foreground hover:text-foreground transition-colors",
              !isStreaming && "text-yellow-400"
            )}
          >
            {isStreaming ? "Pause" : "Resume"}
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div
          ref={scrollRef}
          className="h-52 overflow-y-auto rounded-b-xl border-t border-border/50 bg-[#050505] p-4 font-mono text-xs leading-relaxed"
        >
          {logs.map((log, i) => (
            <div key={log.id} className="flex gap-3 py-0.5">
              <span className="shrink-0 text-muted-foreground/50">
                {log.timestamp}
              </span>
              <span className={cn(statusColors[log.type], "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full animate-pulse-dot")} />
              <span
                className={cn(
                  log.type === "success" && "text-terminal-green",
                  log.type === "warning" && "text-terminal-yellow",
                  log.type === "processing" && "text-terminal-blue",
                  log.type === "info" && "text-terminal-text"
                )}
              >
                {log.text}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
