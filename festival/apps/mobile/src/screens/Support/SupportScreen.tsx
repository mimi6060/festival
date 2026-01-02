import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button } from '../../components/common';
import { colors, spacing, typography, borderRadius } from '../../theme';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  {
    id: '1',
    question: 'Comment recharger mon compte cashless?',
    answer: 'Vous pouvez recharger votre compte cashless directement depuis l\'application dans la section Portefeuille, ou aux bornes de rechargement situees sur le site du festival.',
    category: 'Cashless',
  },
  {
    id: '2',
    question: 'Comment acceder au festival avec mon billet?',
    answer: 'Presentez votre QR code depuis l\'application a l\'entree du festival. Assurez-vous que votre telephone soit charge et la luminosite au maximum pour un scan optimal.',
    category: 'Billets',
  },
  {
    id: '3',
    question: 'Puis-je transferer mon billet a quelqu\'un d\'autre?',
    answer: 'Les billets nominatifs ne peuvent pas etre transferes. Pour les billets non-nominatifs, contactez notre support avec les informations du nouveau participant.',
    category: 'Billets',
  },
  {
    id: '4',
    question: 'Que faire si j\'ai perdu mon bracelet cashless?',
    answer: 'Rendez-vous immediatement au stand Accueil ou Objets Trouves. Nous pouvons desactiver votre ancien bracelet et en creer un nouveau avec votre solde.',
    category: 'Cashless',
  },
  {
    id: '5',
    question: 'Comment recuperer mon solde cashless non utilise?',
    answer: 'Apres le festival, connectez-vous a votre compte dans les 30 jours. Vous pourrez demander un remboursement depuis la section Portefeuille.',
    category: 'Cashless',
  },
  {
    id: '6',
    question: 'Ou puis-je trouver le programme des concerts?',
    answer: 'Le programme complet est disponible dans la section Programme de l\'application. Vous pouvez filtrer par jour et ajouter vos artistes favoris.',
    category: 'Programme',
  },
  {
    id: '7',
    question: 'Y a-t-il des consignes pour mes affaires?',
    answer: 'Oui, des consignes securisees sont disponibles pres de l\'entree principale. Le tarif est de 5EUR par jour, payable en cashless.',
    category: 'Services',
  },
  {
    id: '8',
    question: 'Ou se trouve le poste medical?',
    answer: 'Un poste medical est situe pres de la scene principale. Des infirmiers circulent egalement sur le site. En cas d\'urgence, signalez-vous au personnel de securite.',
    category: 'Services',
  },
];

const categories = ['Tous', 'Cashless', 'Billets', 'Programme', 'Services'];

interface LostItemFormData {
  description: string;
  location: string;
  date: string;
  contact: string;
}

export const SupportScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'faq' | 'contact' | 'lost'>('faq');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lostItemForm, setLostItemForm] = useState<LostItemFormData>({
    description: '',
    location: '',
    date: '',
    contact: '',
  });

  const filteredFAQ = faqData.filter((item) => {
    const matchesCategory = selectedCategory === 'Tous' || item.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCall = () => {
    Linking.openURL('tel:+33123456789');
  };

  const handleEmail = () => {
    Linking.openURL('mailto:support@festival.com?subject=Demande%20de%20support');
  };

  const handleChat = () => {
    Alert.alert('Chat en direct', 'Le chat en direct sera bientot disponible. En attendant, contactez-nous par email ou telephone.');
  };

  const handleSubmitLostItem = () => {
    if (!lostItemForm.description || !lostItemForm.location) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }
    Alert.alert(
      'Signalement envoye',
      'Votre signalement a ete enregistre. Nous vous contacterons si nous retrouvons votre objet.',
      [{ text: 'OK', onPress: () => setLostItemForm({ description: '', location: '', date: '', contact: '' }) }]
    );
  };

  const renderFAQ = () => (
    <View style={styles.tabContent}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher dans la FAQ..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryContainer}
        style={styles.categoryScroll}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              selectedCategory === category && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextActive,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* FAQ List */}
      {filteredFAQ.length > 0 ? (
        filteredFAQ.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.faqItem}
            onPress={() => setExpandedFAQ(expandedFAQ === item.id ? null : item.id)}
          >
            <View style={styles.faqHeader}>
              <Text style={styles.faqCategory}>{item.category}</Text>
              <Text style={styles.faqQuestion}>{item.question}</Text>
              <Text style={styles.faqArrow}>
                {expandedFAQ === item.id ? '▲' : '▼'}
              </Text>
            </View>
            {expandedFAQ === item.id && (
              <Text style={styles.faqAnswer}>{item.answer}</Text>
            )}
          </TouchableOpacity>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>Aucun resultat</Text>
          <Text style={styles.emptySubtitle}>
            Essayez avec d'autres termes de recherche
          </Text>
        </View>
      )}
    </View>
  );

  const renderContact = () => (
    <View style={styles.tabContent}>
      <Card style={styles.contactCard}>
        <TouchableOpacity style={styles.contactItem} onPress={handleChat}>
          <View style={styles.contactIcon}>
            <Text style={styles.contactEmoji}>💬</Text>
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactTitle}>Chat en direct</Text>
            <Text style={styles.contactSubtitle}>Reponse en moins de 5 min</Text>
          </View>
          <Text style={styles.contactArrow}>→</Text>
        </TouchableOpacity>
      </Card>

      <Card style={styles.contactCard}>
        <TouchableOpacity style={styles.contactItem} onPress={handleEmail}>
          <View style={styles.contactIcon}>
            <Text style={styles.contactEmoji}>📧</Text>
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactTitle}>Email</Text>
            <Text style={styles.contactSubtitle}>support@festival.com</Text>
          </View>
          <Text style={styles.contactArrow}>→</Text>
        </TouchableOpacity>
      </Card>

      <Card style={styles.contactCard}>
        <TouchableOpacity style={styles.contactItem} onPress={handleCall}>
          <View style={styles.contactIcon}>
            <Text style={styles.contactEmoji}>📞</Text>
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactTitle}>Telephone</Text>
            <Text style={styles.contactSubtitle}>+33 1 23 45 67 89</Text>
          </View>
          <Text style={styles.contactArrow}>→</Text>
        </TouchableOpacity>
      </Card>

      <Card style={styles.infoCard}>
        <Text style={styles.infoIcon}>ℹ️</Text>
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Horaires du support</Text>
          <Text style={styles.infoText}>
            Pendant le festival: 24h/24{'\n'}
            Avant/Apres: 9h-18h (Lun-Ven)
          </Text>
        </View>
      </Card>

      {/* On-site Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Points d'assistance sur site</Text>
        <Card style={styles.locationCard}>
          <View style={styles.locationItem}>
            <Text style={styles.locationIcon}>📍</Text>
            <View style={styles.locationInfo}>
              <Text style={styles.locationName}>Accueil Principal</Text>
              <Text style={styles.locationDescription}>Entree du festival</Text>
            </View>
          </View>
        </Card>
        <Card style={styles.locationCard}>
          <View style={styles.locationItem}>
            <Text style={styles.locationIcon}>📍</Text>
            <View style={styles.locationInfo}>
              <Text style={styles.locationName}>Point Info Central</Text>
              <Text style={styles.locationDescription}>Zone Food Court</Text>
            </View>
          </View>
        </Card>
      </View>
    </View>
  );

  const renderLostItems = () => (
    <View style={styles.tabContent}>
      <Card style={styles.lostInfoCard}>
        <Text style={styles.lostInfoIcon}>📦</Text>
        <Text style={styles.lostInfoTitle}>Objets perdus / trouves</Text>
        <Text style={styles.lostInfoText}>
          Signalez un objet perdu ou renseignez-vous sur un objet que vous avez trouve.
        </Text>
      </Card>

      <View style={styles.formSection}>
        <Text style={styles.formTitle}>Signaler un objet perdu</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Description de l'objet *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Ex: Sac a dos noir avec logo..."
            placeholderTextColor={colors.textMuted}
            value={lostItemForm.description}
            onChangeText={(text) =>
              setLostItemForm({ ...lostItemForm, description: text })
            }
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Dernier emplacement connu *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Ex: Pres de la Main Stage"
            placeholderTextColor={colors.textMuted}
            value={lostItemForm.location}
            onChangeText={(text) =>
              setLostItemForm({ ...lostItemForm, location: text })
            }
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Date et heure approximatives</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Ex: Samedi 13 juillet vers 22h"
            placeholderTextColor={colors.textMuted}
            value={lostItemForm.date}
            onChangeText={(text) =>
              setLostItemForm({ ...lostItemForm, date: text })
            }
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Contact (email ou telephone)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Votre email ou numero"
            placeholderTextColor={colors.textMuted}
            value={lostItemForm.contact}
            onChangeText={(text) =>
              setLostItemForm({ ...lostItemForm, contact: text })
            }
            keyboardType="email-address"
          />
        </View>

        <Button
          title="Envoyer le signalement"
          onPress={handleSubmitLostItem}
          fullWidth
          style={styles.submitButton}
        />
      </View>

      <Card style={styles.lostLocationCard}>
        <View style={styles.lostLocationContent}>
          <Text style={styles.lostLocationIcon}>🔍</Text>
          <View style={styles.lostLocationInfo}>
            <Text style={styles.lostLocationTitle}>
              Stand Objets Trouves
            </Text>
            <Text style={styles.lostLocationText}>
              Pres de l'entree principale{'\n'}
              Ouvert 10h - 02h pendant le festival
            </Text>
          </View>
        </View>
      </Card>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Support</Text>
        <Text style={styles.subtitle}>Comment pouvons-nous vous aider?</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'faq' && styles.tabActive]}
          onPress={() => setActiveTab('faq')}
        >
          <Text style={[styles.tabText, activeTab === 'faq' && styles.tabTextActive]}>
            FAQ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'contact' && styles.tabActive]}
          onPress={() => setActiveTab('contact')}
        >
          <Text style={[styles.tabText, activeTab === 'contact' && styles.tabTextActive]}>
            Contact
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'lost' && styles.tabActive]}
          onPress={() => setActiveTab('lost')}
        >
          <Text style={[styles.tabText, activeTab === 'lost' && styles.tabTextActive]}>
            Objets
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'faq' && renderFAQ()}
        {activeTab === 'contact' && renderContact()}
        {activeTab === 'lost' && renderLostItems()}
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  tabContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  // FAQ styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  categoryScroll: {
    marginBottom: spacing.md,
  },
  categoryContainer: {
    paddingRight: spacing.md,
  },
  categoryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
  },
  categoryText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: colors.white,
  },
  faqItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  faqCategory: {
    ...typography.caption,
    color: colors.primary,
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
    marginRight: 'auto',
  },
  faqQuestion: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
    width: '100%',
    marginTop: spacing.xs,
  },
  faqArrow: {
    color: colors.textMuted,
    fontSize: 12,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  faqAnswer: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.md,
    lineHeight: 22,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  // Contact styles
  contactCard: {
    marginBottom: spacing.sm,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  contactEmoji: {
    fontSize: 24,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  contactSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  contactArrow: {
    fontSize: 18,
    color: colors.textMuted,
  },
  infoCard: {
    flexDirection: 'row',
    marginTop: spacing.md,
    backgroundColor: colors.surfaceLight,
  },
  infoIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  locationCard: {
    marginBottom: spacing.sm,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  locationDescription: {
    ...typography.caption,
    color: colors.textMuted,
  },
  // Lost items styles
  lostInfoCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  lostInfoIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  lostInfoTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  lostInfoText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  formSection: {
    marginBottom: spacing.lg,
  },
  formTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  lostLocationCard: {
    backgroundColor: colors.surfaceLight,
  },
  lostLocationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lostLocationIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  lostLocationInfo: {
    flex: 1,
  },
  lostLocationTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  lostLocationText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

export default SupportScreen;
