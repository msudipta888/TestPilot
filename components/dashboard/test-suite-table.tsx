"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Play, Eye, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface TestExecution {
  id: string
  name: string
  route: string
  browser: string
  status: "passed" | "failed" | "running"
  duration: string
}

const tests: TestExecution[] = [
  {
    id: "1",
    name: "Login Flow Validation",
    route: "/auth/login",
    browser: "Chromium",
    status: "passed",
    duration: "12.4s",
  },
  {
    id: "2",
    name: "Dashboard Navigation",
    route: "/dashboard",
    browser: "Firefox",
    status: "running",
    duration: "--",
  },
  {
    id: "3",
    name: "Payment Checkout",
    route: "/checkout",
    browser: "Chromium",
    status: "failed",
    duration: "8.2s",
  },
  {
    id: "4",
    name: "User Registration",
    route: "/auth/register",
    browser: "WebKit",
    status: "passed",
    duration: "15.1s",
  },
  {
    id: "5",
    name: "API Error Handling",
    route: "/api/*",
    browser: "Chromium",
    status: "passed",
    duration: "6.7s",
  },
  {
    id: "6",
    name: "Search Results Page",
    route: "/search",
    browser: "Firefox",
    status: "running",
    duration: "--",
  },
  {
    id: "7",
    name: "Profile Settings Update",
    route: "/settings/profile",
    browser: "Chromium",
    status: "passed",
    duration: "9.3s",
  },
]

const statusConfig = {
  passed: {
    label: "Passed",
    variant: "success" as const,
  },
  failed: {
    label: "Failed",
    variant: "destructive" as const,
  },
  running: {
    label: "Running in Cloud",
    variant: "warning" as const,
  },
}

export function TestSuiteTable() {
  return (
    <div className="rounded-xl border border-border/50 bg-card">
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold">Recent Test Executions</h3>
          <p className="text-sm text-muted-foreground">
            Real-time results from the latest test suite run
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Play className="h-3.5 w-3.5" />
          Run All
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[240px]">Test Name</TableHead>
            <TableHead>Target Route</TableHead>
            <TableHead>Browser</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tests.map((test) => (
            <TableRow key={test.id} className="group">
              <TableCell className="font-medium">{test.name}</TableCell>
              <TableCell>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  {test.route}
                </code>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {test.browser}
              </TableCell>
              <TableCell>
                <Badge
                  variant={statusConfig[test.status].variant}
                  className={cn(
                    "gap-1.5",
                    test.status === "running" && "animate-pulse"
                  )}
                >
                  {test.status === "running" && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  {statusConfig[test.status].label}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
