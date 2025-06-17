'use client'

import { motion } from 'framer-motion'
import { 
  ShieldCheckIcon, 
  SparklesIcon, 
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon,
  CogIcon,
  ArrowRightIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { ArrowRightIcon as ArrowRightSolid } from '@heroicons/react/24/solid'
import Link from 'next/link'

const features = [
  {
    icon: ShieldCheckIcon,
    title: 'Modération Avancée',
    description: 'Système de modération automatisé avec logs détaillés et sanctions personnalisables.'
  },
  {
    icon: SparklesIcon,
    title: 'Contenu NSFW',
    description: 'Large collection de contenus adultes avec modération et filtres adaptés.'
  },
  {
    icon: CurrencyDollarIcon,
    title: 'Économie KinkyCoins',
    description: 'Système économique complet avec casino, paris et récompenses.'
  },
  {
    icon: UserGroupIcon,
    title: 'Jeux Interactifs',
    description: 'Mini-jeux variés pour animer votre communauté Discord.'
  },
  {
    icon: ChartBarIcon,
    title: 'Analytics',
    description: 'Statistiques détaillées de votre serveur et engagement des membres.'
  },
  {
    icon: CogIcon,
    title: 'Configuration',
    description: 'Interface intuitive pour personnaliser entièrement le bot.'
  }
]

const stats = [
  { label: 'Serveurs', value: '2,847+' },
  { label: 'Utilisateurs', value: '127K+' },
  { label: 'Commandes', value: '35+' },
  { label: 'Uptime', value: '99.9%' }
]

const plans = [
  {
    name: 'Gratuit',
    price: '0€',
    period: '/mois',
    features: [
      'Commandes de base',
      'Modération simple',
      'Support communautaire'
    ],
    cta: 'Commencer',
    popular: false
  },
  {
    name: 'Premium',
    price: '4.99€',
    period: '/mois',
    features: [
      'Toutes les fonctionnalités',
      'Contenu NSFW premium',
      'Économie avancée',
      'Support prioritaire',
      'Analytics détaillées'
    ],
    cta: 'Choisir Premium',
    popular: true
  },
  {
    name: 'Enterprise',
    price: 'Sur mesure',
    period: '',
    features: [
      'Configuration personnalisée',
      'Intégrations sur mesure',
      'Support dédié 24/7',
      'SLA garantie'
    ],
    cta: 'Nous contacter',
    popular: false
  }
]

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 w-full z-50 glass-effect"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">KP</span>
              </div>
              <span className="text-xl font-bold gradient-text">KinkyPolice</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-300 hover:text-white transition-colors">Fonctionnalités</a>
              <Link href="/docs" className="text-gray-300 hover:text-white transition-colors">Documentation</Link>
              <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">Tarifs</a>
            </div>

            <div className="flex items-center space-x-4">
              <Link href="/auth">
                <button className="bg-discord-blurple hover:bg-discord-blurple/80 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2">
                  <span>Se connecter</span>
                  <ArrowRightSolid className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 hero-glow"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6"
            >
              Le bot Discord
              <br />
              <span className="gradient-text">le plus complet</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl md:text-2xl text-gray-400 mb-8 max-w-3xl mx-auto"
            >
              Modération avancée, contenu NSFW, économie, jeux et bien plus. 
              Transformez votre serveur Discord en communauté premium.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 flex items-center space-x-2">
                <span>Ajouter à Discord</span>
                <ArrowRightIcon className="w-5 h-5" />
              </button>
              
              <Link href="/docs">
                <button className="glass-effect text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all">
                  Voir la documentation
                </button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-20 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold gradient-text mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-400 text-sm md:text-base">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Fonctionnalités <span className="gradient-text">Premium</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Découvrez toutes les fonctionnalités qui font de KinkyPolice le choix numéro 1 des communautés Discord.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass-effect p-6 rounded-2xl hover:bg-white/10 transition-all group"
              >
                <feature.icon className="w-12 h-12 text-purple-400 mb-4 group-hover:text-purple-300 transition-colors" />
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Tarifs <span className="gradient-text">Transparents</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Choisissez le plan qui correspond à vos besoins. Toujours sans engagement.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`glass-effect p-8 rounded-2xl relative ${
                  plan.popular ? 'ring-2 ring-purple-500' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Populaire
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-end justify-center">
                    <span className="text-4xl font-bold gradient-text">{plan.price}</span>
                    <span className="text-gray-400 ml-1">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-3">
                      <CheckIcon className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button className={`w-full py-3 rounded-xl font-semibold transition-all ${
                  plan.popular 
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
                    : 'glass-effect hover:bg-white/10 text-white'
                }`}>
                  {plan.cta}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-effect p-12 rounded-3xl"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Prêt à transformer votre serveur ?
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Rejoignez des milliers de communautés qui font confiance à KinkyPolice.
            </p>
            <button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 flex items-center space-x-2 mx-auto">
              <span>Commencer maintenant</span>
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900/50 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">KP</span>
              </div>
              <span className="text-xl font-bold gradient-text">KinkyPolice</span>
            </div>
            
            <div className="flex space-x-6 text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Conditions</a>
              <a href="#" className="hover:text-white transition-colors">Confidentialité</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>&copy; 2024 KinkyPolice. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}