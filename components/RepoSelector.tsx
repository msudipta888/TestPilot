// src/components/RepoSelector.tsx
"use client";

import { useState, useEffect } from "react";
import { Loader2, GitBranch } from "lucide-react";

interface Repository {
    id: number;
    name: string;
    fullName: string;
    url: string;
    defaultBranch: string;
}

export default function RepoSelector() {
    const [repos, setRepos] = useState<Repository[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRepo, setSelectedRepo] = useState<string>("");

    useEffect(() => {
        async function fetchUserRepos() {
            try {
                const res = await fetch("/api/repos");
                if (res.ok) {
                    const data = await res.json();
                    setRepos(data);
                }
            } catch (err) {
                console.error("Frontend repo fetch error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchUserRepos();
    }, []);
    const selectRepo = async () => {
        const res = await fetch("/api/selectedRepo", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                repoId: selectedRepo,
            }),
        });
        if (res.ok) {
            const data = await res.json();
            console.log(data);
        }
    }
    if (loading) {
        return (
            <div className="flex items-center gap-2 text-muted-foreground p-4">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Scanning GitHub accounts...</span>
            </div>
        );
    }

    return (
        <div className="border border-border bg-card rounded-xl p-6 shadow-sm max-w-xl">
            <div className="flex items-center gap-3 mb-4">
                <GitBranch className="h-6 w-6 text-foreground" />
                <h3 className="text-lg font-medium text-foreground">Connect Active Repository</h3>
            </div>

            <select
                value={selectedRepo}
                onChange={(e) => setSelectedRepo(e.target.value)}
                className="w-full bg-background text-foreground border border-border rounded-lg p-2.5 outline-none focus:border-primary transition"
            >
                <option value="">-- Choose a codebase to ingest --</option>
                {repos.map((repo) => (
                    <option key={repo.id} value={repo.fullName} onClick={selectRepo}>
                        {repo.fullName} ({repo.defaultBranch})
                    </option>
                ))}
            </select>

            {selectedRepo && (
                <button
                    onClick={() => console.log("Proceeding to ingest context for:", selectedRepo)}
                    className="mt-4 cursor-pointer w-full bg-primary text-primary-foreground font-medium rounded-lg py-2 hover:opacity-90 transition"
                >
                    Ingest & Analyze Codebase
                </button>
            )}
        </div>
    );
}