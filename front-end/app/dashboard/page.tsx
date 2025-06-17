'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import {
  CogIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  UsersIcon,
  BellIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface Guild {
  id: string
  name: string
  icon: string | null
  permissions: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [guilds, setGuilds] = useState<Guild[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.push('/auth')
        return
      }
      
      setUser(session.user)
      fetchUserGuilds(session.access_token)
    })
  }, [router])

  const fetchUserGuilds = async (accessToken: string) => {
    try {
      // In a real implementation, you'd call your backend API
      // For now, we'll simulate with some mock data
      const mockGuilds: Guild[] = [
        {
          id: '123456789',
          name: 'Serveur de Test KinkyPolice',
          icon: null,
          permissions: '8' // Administrator
        },
        {
          id: '987654321',
          name: 'Ma Communauté Discord',
          icon: null,
          permissions: '32' // Manage Server
        }
      ]
      
      setGuilds(mockGuilds)
    } catch (error) {
      console.error('Error fetching guilds:', error)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Navigation */}
      <nav className="glass-effect border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">KP</span>
              </div>
              <span className="text-xl font-bold gradient-text">KinkyPolice Dashboard</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-gray-300 hidden md:block">
                {user?.user_metadata?.full_name || user?.email}
              </span>
              <button
                onClick={signOut}
                className="glass-effect hover:bg-white/10 text-white px-4 py-2 rounded-lg transition-all"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">
            Bienvenue, <span className="gradient-text">{user?.user_metadata?.full_name?.split(' ')[0] || 'Admin'}</span>
          </h1>
          <p className="text-gray-400">
            Gérez vos serveurs Discord avec KinkyPolice
          </p>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { icon: UsersIcon, label: 'Serveurs', value: guilds.length.toString(), color: 'text-blue-400' },
            { icon: ShieldCheckIcon, label: 'Modérations', value: '42', color: 'text-green-400' },
            { icon: ChartBarIcon, label: 'Membres actifs', value: '1.2K', color: 'text-purple-400' },
            { icon: BellIcon, label: 'Alertes', value: '3', color: 'text-yellow-400' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-effect p-6 rounded-xl"
            >
              <div className="flex items-center space-x-3">
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-gray-400 text-sm">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Server List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-effect p-6 rounded-xl"
        >
          <h2 className="text-2xl font-bold mb-6">Vos Serveurs Discord</h2>
          
          {guilds.length === 0 ? (
            <div className="text-center py-12">
              <ExclamationTriangleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Aucun serveur trouvé</h3>
              <p className="text-gray-400 mb-6">
                Vous devez avoir des permissions d'administrateur ou de gestion du serveur.
              </p>
              <button className="bg-discord-blurple hover:bg-discord-blurple/80 text-white px-6 py-3 rounded-lg font-semibold transition-all">
                Inviter KinkyPolice
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {guilds.map((guild, index) => (
                <motion.div
                  key={guild.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="glass-effect p-4 rounded-lg hover:bg-white/10 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                        {guild.icon ? (
                          <img
                            src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                            alt={guild.name}
                            className="w-12 h-12 rounded-full"
                          />
                        ) : (
                          <span className="text-white font-bold">
                            {guild.name.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-lg">{guild.name}</h3>
                        <p className="text-gray-400 text-sm">ID: {guild.id}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button className="glass-effect hover:bg-white/10 p-2 rounded-lg transition-all group-hover:bg-white/20">
                        <ChartBarIcon className="w-5 h-5" />
                      </button>
                      <button className="glass-effect hover:bg-white/10 p-2 rounded-lg transition-all group-hover:bg-white/20">
                        <CogIcon className="w-5 h-5" />
                      </button>
                      <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-all">
                        Gérer
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid md:grid-cols-2 gap-6 mt-8"
        >
          <div className="glass-effect p-6 rounded-xl">
            <h3 className="text-xl font-semibold mb-4">Actions Rapides</h3>
            <div className="space-y-3">
              <button className="w-full glass-effect hover:bg-white/10 p-3 rounded-lg text-left transition-all">
                <div className="flex items-center space-x-3">
                  <CogIcon className="w-5 h-5 text-purple-400" />
                  <span>Configuration générale</span>
                </div>
              </button>
              <button className="w-full glass-effect hover:bg-white/10 p-3 rounded-lg text-left transition-all">
                <div className="flex items-center space-x-3">
                  <ShieldCheckIcon className="w-5 h-5 text-green-400" />
                  <span>Paramètres de modération</span>
                </div>
              </button>
              <button className="w-full glass-effect hover:bg-white/10 p-3 rounded-lg text-left transition-all">
                <div className="flex items-center space-x-3">
                  <ChartBarIcon className="w-5 h-5 text-blue-400" />
                  <span>Voir les statistiques</span>
                </div>
              </button>
            </div>
          </div>

          <div className="glass-effect p-6 rounded-xl">
            <h3 className="text-xl font-semibold mb-4">Activité Récente</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Nouveau membre rejoint</span>
                <span className="text-gray-500">Il y a 2h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Configuration mise à jour</span>
                <span className="text-gray-500">Il y a 4h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Message modéré</span>
                <span className="text-gray-500">Il y a 6h</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}