'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  CommandLineIcon,
  ShieldCheckIcon,
  SparklesIcon,
  CurrencyDollarIcon,
  PuzzlePieceIcon,
  CogIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Navigation */}
      <nav className="glass-effect border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">KP</span>
              </div>
              <span className="text-xl font-bold gradient-text">KinkyPolice</span>
            </Link>
            
            <div className="flex items-center space-x-4">
              <Link href="/auth" className="glass-effect hover:bg-white/10 text-white px-4 py-2 rounded-lg transition-all">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Documentation</span> KinkyPolice
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Découvrez toutes les commandes et fonctionnalités disponibles avec KinkyPolice.
          </p>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {[
            { icon: CommandLineIcon, label: 'Commandes', value: '35+', color: 'text-purple-400' },
            { icon: SparklesIcon, label: 'Catégories', value: '6', color: 'text-pink-400' },
            { icon: PuzzlePieceIcon, label: 'Jeux', value: '14', color: 'text-green-400' },
            { icon: ChartBarIcon, label: 'Serveurs', value: '2K+', color: 'text-blue-400' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-effect p-6 rounded-xl text-center"
            >
              <stat.icon className={`w-8 h-8 ${stat.color} mx-auto mb-2`} />
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-gray-400 text-sm">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Command Categories */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {[
            {
              title: 'NSFW & Adulte',
              icon: SparklesIcon,
              color: 'text-pink-400',
              commands: ['kinky', 'confession', 'kink-config', 'add-action', 'add-gage']
            },
            {
              title: 'Jeux & Divertissement',
              icon: PuzzlePieceIcon,
              color: 'text-green-400',
              commands: ['pendu', 'black-jack', 'morpion', 'puissance4', 'quiz-kinky']
            },
            {
              title: 'Économie KinkyCoins',
              icon: CurrencyDollarIcon,
              color: 'text-yellow-400',
              commands: ['balance', 'shop', 'leaderboard', 'top-points']
            },
            {
              title: 'Modération',
              icon: ShieldCheckIcon,
              color: 'text-red-400',
              commands: ['ban', 'kick', 'warn', 'mute', 'clear']
            },
            {
              title: 'Configuration',
              icon: CogIcon,
              color: 'text-blue-400',
              commands: ['config', 'embed-entree', 'embed-reglement', 'voice-logs-config']
            },
            {
              title: 'Utilitaires',
              icon: CommandLineIcon,
              color: 'text-purple-400',
              commands: ['embed', 'say', 'move', 'transcript', 'rename']
            }
          ].map((category, index) => (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-effect p-6 rounded-xl hover:bg-white/10 transition-all"
            >
              <div className="flex items-center space-x-3 mb-4">
                <category.icon className={`w-8 h-8 ${category.color}`} />
                <h3 className="text-xl font-semibold">{category.title}</h3>
              </div>
              
              <div className="space-y-2">
                {category.commands.map((command) => (
                  <div key={command} className="flex items-center space-x-2">
                    <code className="text-purple-400 font-mono">/{command}</code>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Getting Started */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-effect p-8 rounded-xl"
        >
          <h2 className="text-3xl font-bold mb-6">Commencer avec KinkyPolice</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">Étape 1: Inviter le bot</h3>
              <p className="text-gray-400 mb-4">
                Ajoutez KinkyPolice à votre serveur Discord avec les permissions nécessaires.
              </p>
              <button className="bg-discord-blurple hover:bg-discord-blurple/80 text-white px-6 py-3 rounded-lg font-semibold transition-all">
                Inviter KinkyPolice
              </button>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-4">Étape 2: Configuration</h3>
              <p className="text-gray-400 mb-4">
                Utilisez /config pour configurer le bot selon vos besoins.
              </p>
              <Link href="/dashboard">
                <button className="glass-effect hover:bg-white/10 text-white px-6 py-3 rounded-lg font-semibold transition-all">
                  Ouvrir le Dashboard
                </button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}