
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


export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, repoId, owner, repo, branch, githubToken, url } = body;
        if (!userId || !repoId || !owner || !repo || !branch || !githubToken) {
            return NextResponse.json({ error: "All fields are required" }, { status: 400 });
        }

        // Resolve user ID
        const session = await auth();
        let dbUserId = "";
        if (session?.user?.id) {
            dbUserId = session.user.id;
        } else {
            // Fallback: look up user by id (passed in userId parameter from client)
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
        const validFiles: { path: string; content: string }[] = [];
        zipEntries.forEach((entry) => {
            const normalizedPath = entry.entryName.split("/").slice(1).join("/");
            if (entry.isDirectory || !normalizedPath) return;
            if (isUsefulFile(normalizedPath)) {
                const textContent = entry.getData().toString("utf8");
                validFiles.push({
                    path: normalizedPath,
                    content: textContent.slice(0, 5000),
                });
            }
        });
        if (validFiles.length === 0) {
            return NextResponse.json({ error: "No useful source files found in this repository" }, { status: 400 });
        }

        // --- STEP 3: Combine contexts perfectly matching your previous format ---
        const repoContext = validFiles
            .map((file) => `File Path: ${file.path}\n\nFile Content:\n${file.content}`)
            .join("\n\n----------------------\n\n");

        // --- STEP 4: Ask Gemini to generate structured test cases ---
        const prompt = `
You are an expert QA automation engineer.
Analyze the GitHub repository source code and generate useful small test cases.
Your goal: Generate test cases that can later be converted into Playwright / Browserbase automation scripts.

Repository:
Owner: ${owner}
Repo: ${repo}
Branch: ${branch}

Repository File Context:
${repoContext}

Generate 5 to 7 test cases.
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
