export function formatUGX(amount: number | null | undefined): string {
  return `UGX ${(amount ?? 0).toLocaleString('en-UG')}`
}

export function formatCurrency(amount: number | null | undefined, currency: string = 'UGX'): string {
  if (currency === 'UGX') return formatUGX(amount)
  return `${currency} ${(amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
