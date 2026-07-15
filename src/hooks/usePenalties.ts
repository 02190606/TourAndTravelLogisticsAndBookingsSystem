import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { generateId } from '@/utils'
import toast from 'react-hot-toast'
import type { Penalty, PenaltyStatus } from '@/types'

export function usePenalties(vehicleId: string) {
  return useQuery({
    queryKey: ['penalties', vehicleId],
    queryFn: async () => {
      const { data } = await supabase
        .from('penalties')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('date_issued', { ascending: false })
      return (data || []) as Penalty[]
    },
  })
}

export function useAddPenalty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ vehicleId, ...fields }: { vehicleId: string; date_issued: string; amount: number; reason: string; issued_by: string; notes: string }) => {
      const { error } = await supabase.from('penalties').insert({
        id: generateId('PEN'),
        vehicle_id: vehicleId,
        ...fields,
        amount: Number(fields.amount),
        status: 'unpaid',
      })
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['penalties', variables.vehicleId] })
      toast.success('Penalty added')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdatePenaltyStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status, vehicleId }: { id: string; status: PenaltyStatus; vehicleId: string }) => {
      const { error } = await supabase.from('penalties').update({ status }).eq('id', id)
      if (error) throw error
      return { vehicleId }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['penalties', variables.vehicleId] })
      toast.success(`Penalty marked as ${variables.status}`)
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
