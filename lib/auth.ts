import { getServerSession } from "next-auth"
import GitHub from "next-auth/providers/github"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

declare module "next-auth" {
    interface Session {
        accessToken?: string
        user?: {
            id?: string
            name?: string | null
            email?: string | null
            image?: string | null
        }
    }
}

export const authOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        GitHub({
            clientId: process.env.AUTH_GITHUB_ID!,
            clientSecret: process.env.AUTH_GITHUB_SECRET!,
            authorization: {
                params: {
                    scope: "repo read:user"
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user, account }: { token: any; user: any; account: any }) {
            if (account) {
                token.accessToken = account.access_token
            }
            if (user) {
                token.userId = user.id
            }
            return token
        },
        async session({ session, token }: { session: any; token: any }) {
            if (token?.accessToken) {
                session.accessToken = token.accessToken as string
            }
            if (token?.userId) {
                if (!session.user) {
                    session.user = {}
                }
                session.user.id = token.userId as string
            }
            return session
        },
    },
    session: {
        strategy: "jwt" as const,
        maxAge: 60 * 60 * 24 * 7,
    },
}

export const auth = () => getServerSession(authOptions)

