import { redirect } from 'next/navigation'

interface InvitePageProps {
  params: Promise<{
    token: string
  }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  // Await the params promise
  const { token } = await params
  
  // Redirect to the existing invitation acceptance page
  redirect(`/invitation/accept?token=${token}`)
}
