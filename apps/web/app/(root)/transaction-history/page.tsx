import { redirect } from 'next/navigation'

const TransactionHistory = async ({ searchParams }: SearchParamProps) => {
  const params = new URLSearchParams()
  if (searchParams?.id) params.set('id', String(searchParams.id))
  if (searchParams?.page) params.set('page', String(searchParams.page))
  if (searchParams?.view) params.set('view', String(searchParams.view))

  const queryString = params.toString() ? `?${params.toString()}` : ''
  redirect(`/financial-intelligence${queryString}`)
}

export default TransactionHistory