import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github';

export const { } = NextAuth({
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
        async jwt({ token, account, user }) {

        }
    }
})