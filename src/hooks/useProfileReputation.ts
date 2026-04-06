import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function useProfileReputation(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile_reputation', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profile_reputation' as any)
        .select('*')
        .eq('user_id', userId!)
        .single()
      if (error) throw error
      return data as {
        user_id: string
        completed_sits: number
        active_badges: number
        note_moyenne: number
        is_manual_super: boolean
        statut_gardien: 'novice' | 'confirme' | 'super_gardien'
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUserBadges(userId: string | undefined) {
  return useQuery({
    queryKey: ['user_badges', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badge_attributions')
        .select('badge_id, created_at')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
      if (error) throw error

      const grouped = (data || []).reduce((acc, b) => {
        if (!acc[b.badge_id]) acc[b.badge_id] = { badge_id: b.badge_id, created_at: b.created_at, count: 0 }
        acc[b.badge_id].count++
        return acc
      }, {} as Record<string, { badge_id: string; created_at: string; count: number }>)

      return Object.values(grouped)
    },
    enabled: !!userId,
  })
}
