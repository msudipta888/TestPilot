import { NextRequest, NextResponse } from "next/server";
import Browserbase from "@browserbasehq/sdk";
import { chromium } from "playwright-core";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";

const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY! });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { testCases } = body;

        if (!testCases || testCases.length === 0) {
            return NextResponse.json({ error: "No test cases provided" }, { status: 400 });
        }

        const results: any[] = [];

        // Process each test case sequentially (NOT with .map) so sessions don't conflict
        for (const tc of testCases) {
            let status = "passed";
            let logs = "";
            let script = "";
            let sessionId = "";

            try {
                // Resolve relative target routes — try: 1) sibling absolute, 2) repo deploymentUrl, 3) fail
                let resolvedRoute = tc.targetRoute;
                if (!resolvedRoute.startsWith("http://") && !resolvedRoute.startsWith("https://")) {
                    const dbTest = await prisma.generatedTests.findFirst({
                        where: { testCaseId: tc.testCaseId },
                        include: { repo: true }
                    });

                    let baseUrl: string | null = null;

                    // Try 1: sibling test case with absolute URL
                    if (dbTest) {
                        const siblingTest = await prisma.generatedTests.findFirst({
                            where: {
                                repoId: dbTest.repoId,
                                targetRoute: { startsWith: "http" }
                            }
                        });
                        if (siblingTest) {
                            try {
                                baseUrl = new URL(siblingTest.targetRoute).origin;
                            } catch (e) { /* ignore */ }
                        }
                    }

                    // Try 2: repo's persisted deployment URL
                    if (!baseUrl && dbTest?.repo?.deploymentUrl) {
                        const dUrl = dbTest.repo.deploymentUrl.trim();
                        if (dUrl.startsWith("http://") || dUrl.startsWith("https://")) {
                            baseUrl = dUrl.replace(/\/+$/, "");
                        }
                    }

                    if (!baseUrl) {
                        throw new Error(
                            "Target URL is relative and no deployment URL is configured. "
                            + "Please set a deployment URL for this repository in the UI to run tests."
                        );
                    }

                    const path = resolvedRoute.startsWith("/") ? resolvedRoute : "/" + resolvedRoute;
                    resolvedRoute = baseUrl + path;
                }

                // Step 1: Ask Gemini to generate a Playwright script for this test case
                const absoluteUrl = resolvedRoute;
                const prompt = `You are a Playwright automation expert.
Write a self-contained Node.js Playwright script for the following test case.

Test Case:
- Title: ${tc.title}
- Description: ${tc.description}
- Target URL: ${absoluteUrl}
- Target Files: ${tc.targetFiles?.join(", ") ?? ""}
- Expected Result: ${tc.expectedResult}

Rules:
1. Use playwright-core. Assume a variable called "browser" is already connected via CDP. Do NOT call chromium.launch() or chromium.connectOverCDP(). Start directly with: const page = await browser.newPage();
2. Write assertions. If the expected result is NOT met, throw a descriptive Error.
3. At the end of the script, close the page with: await page.close();
4. Navigate using the EXACT full URL below. Do NOT use a relative path (e.g. "/create"). Use the complete URL including protocol and host.
   Correct: await page.goto('${absoluteUrl}');
   Wrong: await page.goto('/create');
5. Return ONLY raw JavaScript code. No markdown, no backtick fences, no explanation text.`;

                const llmResponse = await ai.models.generateContent({
                    model: "gemini-3.5-flash",
                    contents: prompt,
                });

                script = llmResponse.text?.trim() ?? "";

                // Strip accidental markdown fences if Gemini added them anyway
                script = script
                    .replace(/^```(?:javascript|js)?\n?/i, "")
                    .replace(/\n?```$/i, "")
                    .trim();
                console.log('script:', script)
                // Step 2: Create a fresh Browserbase session for this test case
                const session = await bb.sessions.create({
                    projectId: process.env.BROWSERBASE_PROJECT_ID!,
                });
                sessionId = session.id;

                // Step 3: Connect Playwright via CDP using the session's connectUrl
                const browser = await chromium.connectOverCDP(session.connectUrl);

                // Step 4: Run the Gemini-generated script, passing in the browser object
                try {
                    const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
                    const fn = new AsyncFunction("browser", script);
                    await fn(browser);
                } catch (execError: any) {
                    status = "failed";
                    logs = execError.message || "Script execution failed";
                } finally {
                    // Always close the browser to end the Browserbase session
                    await browser.close();
                }
            } catch (tcError: any) {
                // Handle errors from Gemini call or session creation
                status = "failed";
                logs = tcError.message || "Failed to process test case";
            }

            results.push({
                testCaseId: tc.testCaseId,
                status,
                logs,
                sessionId,
                script,
            });
        }

        return NextResponse.json({
            success: true,
            message: `Executed ${results.length} test case(s)`,
            results,
        });
    } catch (error: any) {
        console.error("Testcase execution error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to execute tests" },
            { status: 500 }
        );
    }
}
