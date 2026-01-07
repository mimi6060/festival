'use client';

import { useState } from 'react';

type SettingsTab = 'general' | 'notifications' | 'payments' | 'security' | 'api';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [saved, setSaved] = useState(false);

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'general',
      label: 'General',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    {
      id: 'payments',
      label: 'Paiements',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      id: 'security',
      label: 'Securite',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      id: 'api',
      label: 'API',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
    },
  ];

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parametres</h1>
        <p className="text-gray-500 mt-1">
          Configurez votre application et vos preferences.
        </p>
      </div>

      {/* Settings Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations generales</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Nom de la plateforme</label>
                      <input type="text" className="input-field" defaultValue="Festival Platform" />
                    </div>
                    <div>
                      <label className="form-label">Email de contact</label>
                      <input type="email" className="input-field" defaultValue="contact@festival.com" />
                    </div>
                    <div>
                      <label className="form-label">Fuseau horaire</label>
                      <select className="input-field">
                        <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
                        <option value="Europe/London">Europe/London (UTC+0)</option>
                        <option value="America/New_York">America/New_York (UTC-5)</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Devise par defaut</label>
                      <select className="input-field">
                        <option value="EUR">Euro (EUR)</option>
                        <option value="USD">Dollar US (USD)</option>
                        <option value="GBP">Livre Sterling (GBP)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Apparence</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Logo</label>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                        </div>
                        <button className="btn-secondary">Changer le logo</button>
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Theme</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="theme" value="light" defaultChecked className="w-4 h-4 text-primary-600" />
                          <span className="text-gray-700">Clair</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="theme" value="dark" className="w-4 h-4 text-primary-600" />
                          <span className="text-gray-700">Sombre</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="theme" value="system" className="w-4 h-4 text-primary-600" />
                          <span className="text-gray-700">Systeme</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Settings */}
            {activeTab === 'notifications' && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Preferences de notification</h2>
                  <div className="space-y-4">
                    {[
                      { id: 'orders', label: 'Nouvelles commandes', description: 'Recevoir une notification pour chaque nouvelle commande' },
                      { id: 'refunds', label: 'Demandes de remboursement', description: 'Etre notifie des demandes de remboursement' },
                      { id: 'lowstock', label: 'Stock faible', description: 'Alerte quand un billet est presque epuise' },
                      { id: 'reports', label: 'Rapports hebdomadaires', description: 'Recevoir un resume hebdomadaire par email' },
                    ].map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{item.label}</p>
                          <p className="text-sm text-gray-500">{item.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary-600 peer-focus:ring-2 peer-focus:ring-primary-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Canaux de notification</h2>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="email" defaultChecked className="w-4 h-4 rounded text-primary-600" />
                      <label htmlFor="email" className="text-gray-700">Email</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="push" className="w-4 h-4 rounded text-primary-600" />
                      <label htmlFor="push" className="text-gray-700">Notifications push</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="sms" className="w-4 h-4 rounded text-primary-600" />
                      <label htmlFor="sms" className="text-gray-700">SMS</label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payments Settings */}
            {activeTab === 'payments' && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuration Stripe</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Cle publique</label>
                      <input type="text" className="input-field font-mono" placeholder="pk_live_..." />
                    </div>
                    <div>
                      <label className="form-label">Cle secrete</label>
                      <input type="password" className="input-field font-mono" placeholder="sk_live_..." />
                    </div>
                    <div>
                      <label className="form-label">Webhook Secret</label>
                      <input type="password" className="input-field font-mono" placeholder="whsec_..." />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Frais de service</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Commission par vente (%)</label>
                      <input type="number" className="input-field" defaultValue="5" min="0" max="100" step="0.1" />
                    </div>
                    <div>
                      <label className="form-label">Frais fixes par transaction (EUR)</label>
                      <input type="number" className="input-field" defaultValue="0.50" min="0" step="0.01" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Authentification</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Authentification a deux facteurs</p>
                        <p className="text-sm text-gray-500">Ajouter une couche de securite supplementaire</p>
                      </div>
                      <button className="btn-secondary">Configurer</button>
                    </div>
                    <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Sessions actives</p>
                        <p className="text-sm text-gray-500">Gerer vos sessions connectees</p>
                      </div>
                      <button className="btn-secondary">Voir</button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Mot de passe</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Mot de passe actuel</label>
                      <input type="password" className="input-field" />
                    </div>
                    <div>
                      <label className="form-label">Nouveau mot de passe</label>
                      <input type="password" className="input-field" />
                    </div>
                    <div>
                      <label className="form-label">Confirmer le mot de passe</label>
                      <input type="password" className="input-field" />
                    </div>
                    <button className="btn-primary">Changer le mot de passe</button>
                  </div>
                </div>
              </div>
            )}

            {/* API Settings */}
            {activeTab === 'api' && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Cles API</h2>
                  <p className="text-gray-500 mb-4">
                    Utilisez ces cles pour integrer votre application avec l&apos;API Festival.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Cle API de production</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="input-field font-mono flex-1"
                          value="fst_live_xxxxxxxxxxxxxxxxxxxxxxxx"
                          readOnly
                        />
                        <button className="btn-secondary">Copier</button>
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Cle API de test</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="input-field font-mono flex-1"
                          value="fst_test_xxxxxxxxxxxxxxxxxxxxxxxx"
                          readOnly
                        />
                        <button className="btn-secondary">Copier</button>
                      </div>
                    </div>
                    <button className="btn-danger">Regenerer les cles</button>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Webhooks</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">URL du webhook</label>
                      <input type="url" className="input-field" placeholder="https://votre-site.com/webhooks/festival" />
                    </div>
                    <div>
                      <label className="form-label">Evenements a recevoir</label>
                      <div className="space-y-2 mt-2">
                        {['order.created', 'order.completed', 'order.refunded', 'ticket.scanned'].map((event) => (
                          <label key={event} className="flex items-center gap-2">
                            <input type="checkbox" className="w-4 h-4 rounded text-primary-600" defaultChecked />
                            <span className="text-gray-700 font-mono text-sm">{event}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <button className="btn-primary">Enregistrer le webhook</button>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              {saved && (
                <span className="text-green-600 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Modifications enregistrees
                </span>
              )}
              <button onClick={handleSave} className="btn-primary">
                Enregistrer les modifications
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
