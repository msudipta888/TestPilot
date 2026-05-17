import { getServerSession } from "next-auth"
import GitHub from "next-auth/providers/github"

declare module "next-auth" {
    interface Session {
        accessToken?: string
    }
}

export const authOptions = {
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
        async jwt({ token, account }: { token: any; account: any }) {
            if (account) {
                token.accessToken = account.access_token
            }
            return token
        },
        async session({ session, token }: { session: any; token: any }) {
            if (token?.accessToken) {
                session.accessToken = token.accessToken as string
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
