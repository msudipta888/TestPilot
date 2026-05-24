
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import AdmZip from "adm-zip";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,

});
const ALLOWED_EXTENSIONS = [
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".json",
    ".md",
];

const IMPORTANT_FILES = [
    "package.json",
    "next.config",
    "middleware",
    "app/",
    "pages/",
    "components/",
    "src/",
    "lib/",
    "utils/",
    "actions/",
    "api/",
    "server/",
];

const IGNORE_PATHS = [
    "node_modules",
    ".next",
    "dist",
    "build",
    ".git",
    "coverage",
    "public/",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    ".png",
    ".jpg",
    ".jpeg",
    ".svg",
    ".webp",
    ".mp4",
    ".mov",
];

function isUsefulFile(path: string) {
    const isIgnored = IGNORE_PATHS.some((item) => path.includes(item));

    const isAllowedExtension = ALLOWED_EXTENSIONS.some((ext) =>
        path.endsWith(ext)
    );

    const isImportantPath = IMPORTANT_FILES.some((item) =>
        path.includes(item)
    );

    return !isIgnored && isAllowedExtension && isImportantPath;
}

function extractRoutes(files: { path: string }[]): string[] {
    const routes = new Set<string>();
    const routePatterns = [
        /^app\/page\.(tsx|jsx|js|ts)$/,           // / (root)
        /^app\/(.+)\/page\.(tsx|jsx|js|ts)$/,       // /some-path
        /^app\/api\/(.+)\/route\.(ts|js)$/,          // /api/some-path
        /^pages\/index\.(tsx|jsx|js|ts)$/,           // / (pages router)
        /^pages\/(.+)\.(tsx|jsx|js|ts)$/,            // /some-path (pages router)
        /^src\/app\/page\.(tsx|jsx|js|ts)$/,         // / (src/app)
        /^src\/app\/(.+)\/page\.(tsx|jsx|js|ts)$/,   // /some-path (src/app)
        /^src\/pages\/index\.(tsx|jsx|js|ts)$/,      // / (src/pages)
        /^src\/pages\/(.+)\.(tsx|jsx|js|ts)$/,       // /some-path (src/pages)
    ];

    for (const file of files) {
        for (const pattern of routePatterns) {
            const match = file.path.match(pattern);
            if (match) {
                if (match[1] === undefined) {
                    routes.add("/");
                } else {
                    let route = "/" + match[1];
                    // Skip dynamic route segments like [param]
                    if (!route.includes("[") && !route.includes("]")) {
                        // Remove route groups like (auth)
                        route = route.replace(/\/\([^)]+\)/g, "");
                        if (route) {
                            routes.add(route);
                        } else {
                            routes.add("/");
                        }
                    }
                }
                break;
            }
        }
    }

    return Array.from(routes).sort();
}


export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, repoId, owner, repo, branch, githubToken, url } = body;
        if (!userId || !repoId || !owner || !repo || !branch || !githubToken) {
            return NextResponse.json({ error: "All fields are required" }, { status: 400 });
        }
        console.log('repo id:', repoId)
        const session = await auth();
        let dbUserId = "";
        if (session?.user?.id) {
            dbUserId = session.user.id;
        } else {
            const user = await prisma.user.findFirst({
                where: { id: userId },
            });
            if (user) {
                dbUserId = user.id;
            }
        }

        if (!dbUserId) {
            return NextResponse.json({ error: "User not found in database. Please log in again." }, { status: 400 });
        }

        // Upsert selected repository
        const githubId = parseInt(repoId, 10);
        if (isNaN(githubId)) {
            return NextResponse.json({ error: "Invalid repository ID" }, { status: 400 });
        }



        let dbRepo = await prisma.selectedRepo.findUnique({
            where: { githubRepoId: githubId },
        });

        if (!dbRepo) {
            dbRepo = await prisma.selectedRepo.create({
                data: {
                    githubRepoId: githubId,
                    repoName: `${owner}/${repo}`,
                    repoUrl: url || `https://github.com/${owner}/${repo}`,
                    defaultBranch: branch,
                    userId: dbUserId,
                },
            });
        }

        // Check if we already have the repository content cached in our database
        const dbRepoInfo = await prisma.reposInfo.findUnique({
            where: { githubRepoId: githubId },
            select: { content: true }
        });

        let repoContext = "";
        let extractedFiles: { path: string; content: string }[] = [];

        if (dbRepoInfo?.content) {
            repoContext = dbRepoInfo.content;
            console.log('Using cached repository context from database');
        } else {
            console.log('Fetching repository zipball from GitHub...');
            // --- STEP 1 & 2 UPGRADE: ONE-SHOT ZIP DOWNLOAD & RAM EXTRACTION ---
            const archiveUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${branch}`;
            const archiveResponse = await fetch(archiveUrl, {
                headers: {
                    Authorization: `Bearer ${githubToken}`,
                    Accept: "application/vnd.github.v3+json",
                }
            });
            if (!archiveResponse.ok) {
                throw new Error(`Failed to fetch repository zipball archive: ${archiveResponse.statusText}`);
            }
            const buffer = await archiveResponse.arrayBuffer();
            const zip = new AdmZip(Buffer.from(buffer));
            const zipEntries = zip.getEntries();

            zipEntries.forEach((entry) => {
                const normalizedPath = entry.entryName.split("/").slice(1).join("/");
                if (entry.isDirectory || !normalizedPath) return;
                if (isUsefulFile(normalizedPath)) {
                    const textContent = entry.getData().toString("utf8");
                    extractedFiles.push({
                        path: normalizedPath,
                        content: textContent.slice(0, 5000),
                    });
                }
            });
            if (extractedFiles.length === 0) {
                return NextResponse.json({ error: "No useful source files found in this repository" }, { status: 400 });
            }

            // --- STEP 3: Combine contexts perfectly matching your previous format ---
            repoContext = extractedFiles
                .map((file) => `File Path: ${file.path}\n\nFile Content:\n${file.content}`)
                .join("\n\n----------------------\n\n");

            // Cache the context back to the database for subsequent requests
            await prisma.reposInfo.update({
                where: { githubRepoId: githubId },
                data: { content: repoContext }
            });
        }

        // Extract actual routes from files for prompt guidance
        let routeList: string[] = [];
        if (dbRepoInfo?.content) {
            const pathRegex = /^File Path: (.+)$/gm;
            const paths: { path: string }[] = [];
            let m;
            while ((m = pathRegex.exec(dbRepoInfo.content)) !== null) {
                paths.push({ path: m[1] });
            }
            routeList = extractRoutes(paths);
        } else {
            routeList = extractRoutes(extractedFiles);
        }

        const routeContext = routeList.length > 0
            ? `\nDetected routes in this project:\n${routeList.map(r => `  - ${r}`).join("\n")}`
            : "\nNo specific page/API routes detected in file structure — infer routes carefully from file contents.";

        // --- STEP 4: Ask Gemini to generate structured test cases ---

        const prompt = `
You are an expert QA automation engineer.

Analyze the GitHub repository source code and generate useful small test cases.

Your goal:
Generate test cases that can later be converted into Playwright / Browserbase automation scripts.

Repository:
Owner: ${owner}
Repo: ${repo}
Branch: ${branch}

Repository File Context:
${repoContext}
${routeContext}

Generate 5 to 6 test cases.

Each test case must include:
- title: clear test case title
- description: one-line description
- type: one of ui, auth, api, form, integration, edge-case
- priority: low, medium, high
- targetRoute: the EXACT app route/page to test. Pick ONLY from the "Detected routes" list above. If none match, set to "/" (root).
- targetFiles: related file paths that exist in the repository context
- expectedResult: what should happen when the test passes

CRITICAL RULES (read carefully):
1. targetRoute MUST be from the "Detected routes" list above. DO NOT invent routes that are not in that list.
2. Only use file paths that exist in the repository context. Do not invent fake target files.
3. If no detected route fits the test case, use "/" as targetRoute.
4. Keep description short, only one line.
5. Return only valid JSON matching the schema below.
`;

        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        generatedTests: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    type: { type: Type.STRING, enum: ["ui", "auth", "api", "form", "integration", "edge-case"] },
                                    priority: { type: Type.STRING, enum: ["low", "medium", "high"] },
                                    targetRoute: { type: Type.STRING },
                                    targetFiles: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    expectedResult: { type: Type.STRING },
                                },
                                required: ["title", "description", "type", "priority", "targetRoute", "targetFiles", "expectedResult"],
                            },
                        },
                    },
                    required: ["generatedTests"],
                },
            },
        });
        const aiResult = JSON.parse(response.text || "{}");
        const generatedTests = aiResult.generatedTests || [];
        console.log('input token count:', response.usageMetadata?.promptTokenCount);
        console.log('output token count:', response.usageMetadata?.candidatesTokenCount);
        if (!generatedTests.length) {
            return NextResponse.json({ error: "Gemini did not generate any test cases" }, { status: 400 });
        }
        const insertTestCases = generatedTests.map((test: any) => {
            return {
                testCaseId: `tc-${randomUUID()}`,
                userId: dbUserId,
                repoId: dbRepo.id,
                title: test.title,
                description: test.description,
                type: test.type,
                priority: test.priority,
                targetRoute: test.targetRoute,
                targetFiles: test.targetFiles,
                expectedResult: test.expectedResult,
                repoName: repo,
                repoOwner: owner,
                branch,
            }
        });
        await prisma.generatedTests.createMany({
            data: insertTestCases
        });
        return NextResponse.json({
            success: true,
            message: "Test cases generated successfully",
            count: insertTestCases.length,
            testCases: insertTestCases,
        });
    } catch (error: any) {
        console.error("Generate test cases error:", error);
        return NextResponse.json({ success: false, error: error.message || "Failed to generate test cases" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const githubRepoId = searchParams.get("githubRepoId");

        if (!githubRepoId) {
            return NextResponse.json({ error: "githubRepoId query parameter is required" }, { status: 400 });
        }

        const id = parseInt(githubRepoId, 10);
        if (isNaN(id)) {
            return NextResponse.json({ error: "Invalid githubRepoId" }, { status: 400 });
        }

        const repo = await prisma.selectedRepo.findUnique({
            where: { githubRepoId: id },
            select: { id: true, deploymentUrl: true, repoName: true }
        });

        if (!repo) {
            return NextResponse.json({ repo: null, deploymentUrl: null });
        }

        return NextResponse.json({ repo, deploymentUrl: repo.deploymentUrl });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { repoId, deploymentUrl } = body;

        if (!repoId || deploymentUrl === undefined) {
            return NextResponse.json({ error: "repoId and deploymentUrl are required" }, { status: 400 });
        }

        const repo = await prisma.selectedRepo.findUnique({
            where: { id: repoId }
        });

        if (!repo) {
            return NextResponse.json({ error: "Repository not found" }, { status: 404 });
        }

        const updated = await prisma.selectedRepo.update({
            where: { id: repoId },
            data: { deploymentUrl: deploymentUrl || null }
        });

        return NextResponse.json({
            success: true,
            deploymentUrl: updated.deploymentUrl,
        });
    } catch (error: any) {
        console.error("Update deployment URL error:", error);
        return NextResponse.json({ success: false, error: error.message || "Failed to update deployment URL" }, { status: 500 });
    }
}
