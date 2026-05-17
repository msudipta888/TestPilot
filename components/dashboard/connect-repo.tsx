"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { GitBranch, ArrowRight, Link2 } from "lucide-react"

export function ConnectRepo() {
  return (
    <Card className="overflow-hidden border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <GitBranch className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Connect Repository</CardTitle>
            <CardDescription>
              Link a GitHub repository to begin autonomous test generation
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Paste GitHub URL (e.g., https://github.com/user/repo)"
              className="pl-9 h-10 border-border/50 bg-muted/30 text-sm"
            />
          </div>
          <Button className="h-10 gap-2 px-5">
            Ingest & Analyze
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
