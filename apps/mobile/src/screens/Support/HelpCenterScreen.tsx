import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../../components/common';
import { colors, spacing, typography, borderRadius } from '../../theme';
import type { RootStackParamList } from '../../types';

type HelpCenterNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface HelpCategory {
  id: string;
  title: string;
  icon: string;
  description: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: '1',
    question: 'Comment acheter un billet?',
    answer: 'Pour acheter un billet, rendez-vous dans l\'onglet "Billets" de l\'application. Selectionnez le festival de votre choix, choisissez le type de billet souhaite, puis procedez au paiement securise.',
    category: 'tickets',
  },
  {
    id: '2',
    question: 'Comment fonctionne le cashless?',
    answer: 'Le systeme cashless vous permet de payer vos achats sur le festival sans especes. Rechargez votre portefeuille dans l\'onglet "Portefeuille", puis presentez votre QR code aux points de vente.',
    category: 'wallet',
  },
  {
    id: '3',
    question: 'Mon billet QR code ne fonctionne pas',
    answer: 'Assurez-vous que la luminosite de votre ecran est au maximum. Si le probleme persiste, verifiez votre connexion internet pour synchroniser le billet. Vous pouvez aussi contacter l\'accueil du festival.',
    category: 'tickets',
  },
  {
    id: '4',
    question: 'Comment obtenir un remboursement?',
    answer: 'Les demandes de remboursement doivent etre effectuees au moins 7 jours avant l\'evenement. Contactez notre support avec votre numero de commande pour initier la procedure.',
    category: 'payments',
  },
  {
    id: '5',
    question: 'Comment modifier mes informations personnelles?',
    answer: 'Rendez-vous dans l\'onglet "Profil", puis "Informations personnelles". Vous pouvez modifier votre nom, email et numero de telephone.',
    category: 'account',
  },
  {
    id: '6',
    question: 'Comment activer les notifications?',
    answer: 'Allez dans "Profil" > "Parametres" > "Notifications". Vous pouvez activer les alertes pour les artistes favoris, les offres speciales et les rappels d\'evenements.',
    category: 'account',
  },
  {
    id: '7',
    question: 'Puis-je transferer mon billet a quelqu\'un d\'autre?',
    answer: 'Oui, certains billets sont transferables. Dans l\'onglet "Billets", selectionnez le billet puis "Transferer". Le destinataire recevra un email avec le nouveau billet.',
    category: 'tickets',
  },
  {
    id: '8',
    question: 'Comment recuperer mon solde cashless apres le festival?',
    answer: 'Apres le festival, vous avez 30 jours pour demander le remboursement de votre solde restant. Allez dans "Portefeuille" > "Remboursement" et suivez les instructions.',
    category: 'wallet',
  },
];

const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: 'tickets',
    title: 'Billetterie',
    icon: '🎫',
    description: 'Achat, transfert et problemes de billets',
  },
  {
    id: 'wallet',
    title: 'Portefeuille',
    icon: '💳',
    description: 'Cashless, recharges et remboursements',
  },
  {
    id: 'account',
    title: 'Mon compte',
    icon: '👤',
    description: 'Profil, parametres et securite',
  },
  {
    id: 'payments',
    title: 'Paiements',
    icon: '💰',
    description: 'Transactions et factures',
  },
];

export const HelpCenterScreen: React.FC = () => {
  const navigation = useNavigation<HelpCenterNavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const filteredFAQs = FAQ_ITEMS.filter((item) => {
    const matchesSearch = searchQuery
      ? item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesCategory = selectedCategory
      ? item.category === selectedCategory
      : true;
    return matchesSearch && matchesCategory;
  });

  const handleContactSupport = () => {
    navigation.navigate('ContactUs');
  };

  const handleOpenWebsite = () => {
    Linking.openURL('https://festival.com/help');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Centre d'aide</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher une question..."
            placeholderTextColor={colors.textMuted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.categoriesGrid}>
            {HELP_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  selectedCategory === category.id && styles.categoryCardSelected,
                ]}
                onPress={() =>
                  setSelectedCategory(
                    selectedCategory === category.id ? null : category.id
                  )
                }
              >
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categoryDescription} numberOfLines={2}>
                  {category.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Questions frequentes
            {selectedCategory && (
              <Text style={styles.filterBadge}>
                {' '}({HELP_CATEGORIES.find(c => c.id === selectedCategory)?.title})
              </Text>
            )}
          </Text>
          <Card padding="none" style={styles.faqCard}>
            {filteredFAQs.length > 0 ? (
              filteredFAQs.map((item, index) => (
                <View key={item.id}>
                  {index > 0 && <View style={styles.divider} />}
                  <TouchableOpacity
                    style={styles.faqItem}
                    onPress={() =>
                      setExpandedFAQ(expandedFAQ === item.id ? null : item.id)
                    }
                  >
                    <View style={styles.faqHeader}>
                      <Text style={styles.faqQuestion}>{item.question}</Text>
                      <Text style={styles.expandIcon}>
                        {expandedFAQ === item.id ? '−' : '+'}
                      </Text>
                    </View>
                    {expandedFAQ === item.id && (
                      <Text style={styles.faqAnswer}>{item.answer}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyText}>Aucun resultat trouve</Text>
                <Text style={styles.emptySubtext}>
                  Essayez avec d'autres mots-cles
                </Text>
              </View>
            )}
          </Card>
        </View>

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Besoin d'aide supplementaire?</Text>
          <Card style={styles.contactCard}>
            <View style={styles.contactRow}>
              <View style={styles.contactInfo}>
                <Text style={styles.contactIcon}>💬</Text>
                <View>
                  <Text style={styles.contactTitle}>Contacter le support</Text>
                  <Text style={styles.contactSubtitle}>
                    Reponse sous 24h
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={handleContactSupport}
              >
                <Text style={styles.contactButtonText}>Ecrire</Text>
              </TouchableOpacity>
            </View>
          </Card>

          <Card style={styles.contactCard}>
            <View style={styles.contactRow}>
              <View style={styles.contactInfo}>
                <Text style={styles.contactIcon}>🌐</Text>
                <View>
                  <Text style={styles.contactTitle}>Site web</Text>
                  <Text style={styles.contactSubtitle}>
                    Plus d'informations en ligne
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={handleOpenWebsite}
              >
                <Text style={styles.contactButtonText}>Visiter</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>Festival App v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: colors.text,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  clearIcon: {
    fontSize: 16,
    color: colors.textMuted,
    padding: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  filterBadge: {
    color: colors.primary,
    textTransform: 'none',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  categoryCard: {
    width: '48%',
    margin: '1%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  categoryIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  categoryTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  categoryDescription: {
    ...typography.caption,
    color: colors.textMuted,
  },
  faqCard: {
    overflow: 'hidden',
  },
  faqItem: {
    padding: spacing.md,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  faqQuestion: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
    marginRight: spacing.sm,
  },
  expandIcon: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: '600',
  },
  faqAnswer: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  contactCard: {
    marginBottom: spacing.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  contactTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  contactSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  contactButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  contactButtonText: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '600',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  appVersion: {
    ...typography.caption,
    color: colors.textMuted,
  },
});

export default HelpCenterScreen;
