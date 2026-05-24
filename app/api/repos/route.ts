// src/app/api/repos/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    // Pull the current user session securely on the server side
    const session = await auth();

    if (!session || !session.accessToken) {
        return NextResponse.json({ error: "Unauthorized. Missing GitHub session." }, { status: 401 });
    }
    const userId = session.user?.id;
    let refinedRepos = [];
    if (userId) {
        refinedRepos = await prisma.reposInfo.findMany({
            where: { userId: userId }
        })
        if (refinedRepos.length > 0) {
            return NextResponse.json(refinedRepos.map((repo) => ({
                id: repo.githubRepoId,
                fullName: repo.fullName,
                url: `https://github.com/${repo.fullName}`,
                defaultBranch: repo.defaultBranch,
            })));
        }
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

        // Keep only essential fields
        refinedRepos = data.map((repo: any) => ({
            id: repo.id,
            fullName: repo.full_name,
            url: repo.html_url,
            defaultBranch: repo.default_branch,
        }));

        // Use userId already set in session from JWT token
        const dbUserId = session.user?.id;
        console.log('dbUserId from session:', dbUserId);

        if (dbUserId) {
            await Promise.all(
                refinedRepos.map((repo: any) =>
                    prisma.reposInfo.upsert({
                        where: { githubRepoId: repo.id },
                        update: { fullName: repo.fullName, defaultBranch: repo.defaultBranch },
                        create: {
                            githubRepoId: repo.id,
                            fullName: repo.fullName,
                            defaultBranch: repo.defaultBranch,
                            userId: dbUserId,
                        },
                    })
                )
            );
        }

        return NextResponse.json(refinedRepos);
    } catch (error: any) {
        console.error("Failed fetching GitHub repositories:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}