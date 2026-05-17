"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  LayoutDashboard,
  GitBranch,
  Beaker,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
} from "lucide-react"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "#", active: true },
  { icon: GitBranch, label: "Repositories", href: "#" },
  { icon: Beaker, label: "Test Suites", href: "#" },
  { icon: ScrollText, label: "Execution Logs", href: "#" },
  { icon: Settings, label: "Settings", href: "#" },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-sidebar transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <ShieldCheck className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-base font-bold tracking-tight text-sidebar-foreground">
            AgentQA
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              item.active
                ? "bg-primary/10 text-primary"
                : "text-sidebar-muted hover:bg-sidebar-border/50 hover:text-sidebar-foreground",
              collapsed && "justify-center px-2"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </a>
        ))}
      </nav>

      {/* Credits Badge */}
      {!collapsed && (
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-border/30 px-3 py-2.5">
            <Zap className="h-3.5 w-3.5 text-yellow-400" />
            <div className="flex flex-col">
              <span className="text-xs text-sidebar-muted">Credits Remaining</span>
              <span className="text-sm font-semibold text-sidebar-foreground">
                8,450
              </span>
            </div>
          </div>
        </div>
      )}

      {collapsed && (
        <div className="flex justify-center px-2 py-2">
          <div className="flex items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-border/30 p-2">
            <Zap className="h-3.5 w-3.5 text-yellow-400" />
          </div>
        </div>
      )}

      {/* User Profile */}
      <div className={cn("border-t border-sidebar-border p-4", collapsed && "px-2")}>
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              JD
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-medium text-sidebar-foreground">
                John Doe
              </span>
              <span className="text-xs text-sidebar-muted">johndoe@testpilot.io</span>
            </div>
          )}
        </div>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border bg-sidebar text-sidebar-muted hover:text-sidebar-foreground"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>
    </aside>
  )
}
