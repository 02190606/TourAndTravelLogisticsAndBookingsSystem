export function formatUGX(amount: number): string {
  return `UGX ${amount.toLocaleString('en-UG')}`
}

export function formatCurrency(amount: number, currency: string = 'UGX'): string {
  if (currency === 'UGX') return formatUGX(amount)
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
