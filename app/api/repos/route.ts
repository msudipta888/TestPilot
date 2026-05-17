// src/app/api/repos/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
    // Pull the current user session securely on the server side
    const session = await auth();

    if (!session || !session.accessToken) {
        return NextResponse.json({ error: "Unauthorized. Missing GitHub session." }, { status: 401 });
    }

    try {
        // Query the official GitHub API to fetch user repositories, sorted by recent activity
        const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=10", {
            headers: {
                Authorization: `Bearer ${session.accessToken}`,
                Accept: "application/vnd.github.v3+json",
            },
        });

        if (!response.ok) {
            throw new Error(`GitHub API responded with status ${response.status}`);
        }

        const data = await response.json();

        // Clean the payload to send only what the frontend dashboard requires
        const refinedRepos = data.map((repo: any) => ({
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            isPrivate: repo.private,
            url: repo.html_url,
            defaultBranch: repo.default_branch,
            description: repo.description,
        }));

        return NextResponse.json(refinedRepos);
    } catch (error: any) {
        console.error("Failed fetching GitHub repositories:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}