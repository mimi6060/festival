import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../../components/common';
import { colors, spacing, typography, borderRadius } from '../../theme';
import type { RootStackParamList } from '../../types';

const { width: _width } = Dimensions.get('window');

type MapNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Map'>;
type MapRouteProp = RouteProp<RootStackParamList, 'Map'>;

// Types professionnels pour les POIs
interface OpeningHours {
  open: string;
  close: string;
  isOpen?: boolean;
}

interface PriceRange {
  min: number;
  max: number;
  currency: string;
}

interface Location {
  zone: string;
  gridRef: string;
  latitude: number;
  longitude: number;
  nearestLandmark?: string;
}

interface POI {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  icon: string;
  description: string;
  // Informations de localisation
  location: Location;
  // Horaires
  hours: OpeningHours;
  // Prix
  priceRange?: PriceRange;
  // Evaluation
  rating?: number;
  reviewCount?: number;
  // Tags et filtres
  tags: string[];
  // Capacite et affluence
  capacity?: number;
  currentWaitTime?: number; // en minutes
  crowdLevel?: 'low' | 'medium' | 'high';
  // Contact
  phone?: string;
  // Accessibilite
  wheelchairAccessible: boolean;
  // Images
  imageUrl?: string;
  // Paiement
  paymentMethods: ('cashless' | 'card' | 'cash')[];
  // Distance (calculee dynamiquement)
  distance?: number; // en metres
}

const categories = [
  { key: 'all', label: 'Tout', icon: '🗺️' },
  { key: 'stages', label: 'Scenes', icon: '🎤' },
  { key: 'food', label: 'Food', icon: '🍔' },
  { key: 'drinks', label: 'Bars', icon: '🍺' },
  { key: 'services', label: 'Services', icon: '🚻' },
  { key: 'emergency', label: 'Urgences', icon: '🏥' },
  { key: 'info', label: 'Info', icon: 'ℹ️' },
];

// Donnees POI enrichies et professionnelles
const pois: POI[] = [
  // === STAGES ===
  {
    id: 'stage-1',
    name: 'Main Stage',
    category: 'stages',
    subcategory: 'principal',
    icon: '🎤',
    description:
      "La scene principale du festival avec les tetes d'affiche et les performances majeures.",
    location: {
      zone: 'Zone A - Centre',
      gridRef: 'A1',
      latitude: 48.8566,
      longitude: 2.3522,
      nearestLandmark: 'Entree principale',
    },
    hours: { open: '14:00', close: '02:00', isOpen: true },
    capacity: 15000,
    currentWaitTime: 0,
    crowdLevel: 'high',
    tags: ['headliners', 'son-premium', 'ecrans-geants'],
    wheelchairAccessible: true,
    paymentMethods: ['cashless'],
    distance: 150,
  },
  {
    id: 'stage-2',
    name: 'Electric Tent',
    category: 'stages',
    subcategory: 'electronique',
    icon: '🎧',
    description: 'Espace dedie a la musique electronique avec systeme son Funktion-One.',
    location: {
      zone: 'Zone B - Est',
      gridRef: 'B3',
      latitude: 48.857,
      longitude: 2.353,
      nearestLandmark: 'A cote du Bar Central',
    },
    hours: { open: '16:00', close: '06:00', isOpen: true },
    capacity: 5000,
    currentWaitTime: 5,
    crowdLevel: 'medium',
    tags: ['techno', 'house', 'bass-music', 'light-show'],
    wheelchairAccessible: true,
    paymentMethods: ['cashless'],
    distance: 280,
  },
  {
    id: 'stage-3',
    name: 'Acoustic Garden',
    category: 'stages',
    subcategory: 'acoustique',
    icon: '🎸',
    description: 'Scene intimiste dans un cadre naturel pour les performances acoustiques.',
    location: {
      zone: 'Zone C - Nord',
      gridRef: 'C2',
      latitude: 48.8575,
      longitude: 2.3515,
      nearestLandmark: "Pres de l'espace detente",
    },
    hours: { open: '12:00', close: '23:00', isOpen: true },
    capacity: 2000,
    currentWaitTime: 0,
    crowdLevel: 'low',
    tags: ['folk', 'indie', 'singer-songwriter', 'calme'],
    wheelchairAccessible: true,
    paymentMethods: ['cashless'],
    distance: 420,
  },

  // === FOOD ===
  {
    id: 'food-1',
    name: 'Le Gourmet Burger',
    category: 'food',
    subcategory: 'burger',
    icon: '🍔',
    description:
      'Burgers gastronomiques avec viande Charolaise et options vegetariennes. Frites maison et sauces artisanales.',
    location: {
      zone: 'Zone Food Court - Allee A',
      gridRef: 'D1',
      latitude: 48.8568,
      longitude: 2.3525,
      nearestLandmark: 'Face a la Main Stage',
    },
    hours: { open: '11:30', close: '03:00', isOpen: true },
    priceRange: { min: 9, max: 16, currency: 'EUR' },
    rating: 4.5,
    reviewCount: 234,
    capacity: 25,
    currentWaitTime: 12,
    crowdLevel: 'high',
    tags: ['burger', 'viande', 'vegetarien', 'frites', 'fait-maison'],
    wheelchairAccessible: true,
    paymentMethods: ['cashless', 'card'],
    distance: 95,
  },
  {
    id: 'food-2',
    name: 'Napoli Express',
    category: 'food',
    subcategory: 'pizza',
    icon: '🍕',
    description:
      'Pizzas au feu de bois cuites a 400°C. Pate fermentee 48h, ingredients italiens importes.',
    location: {
      zone: 'Zone Food Court - Allee A',
      gridRef: 'D2',
      latitude: 48.8567,
      longitude: 2.3527,
      nearestLandmark: 'A cote du Gourmet Burger',
    },
    hours: { open: '12:00', close: '02:00', isOpen: true },
    priceRange: { min: 10, max: 18, currency: 'EUR' },
    rating: 4.7,
    reviewCount: 312,
    capacity: 30,
    currentWaitTime: 18,
    crowdLevel: 'high',
    tags: ['pizza', 'italien', 'feu-de-bois', 'vegetarien', 'vegan'],
    wheelchairAccessible: true,
    paymentMethods: ['cashless', 'card'],
    distance: 110,
  },
  {
    id: 'food-3',
    name: 'Asian Street Food',
    category: 'food',
    subcategory: 'asiatique',
    icon: '🍜',
    description:
      'Wok, ramen, banh mi et specialites thaï. Options vegetariennes et vegan disponibles.',
    location: {
      zone: 'Zone Food Court - Allee B',
      gridRef: 'D3',
      latitude: 48.8565,
      longitude: 2.3528,
      nearestLandmark: 'Pres des Toilettes Nord',
    },
    hours: { open: '11:00', close: '02:30', isOpen: true },
    priceRange: { min: 8, max: 14, currency: 'EUR' },
    rating: 4.3,
    reviewCount: 189,
    capacity: 20,
    currentWaitTime: 8,
    crowdLevel: 'medium',
    tags: ['asiatique', 'thai', 'japonais', 'vegan', 'wok', 'ramen'],
    wheelchairAccessible: true,
    paymentMethods: ['cashless'],
    distance: 135,
  },
  {
    id: 'food-4',
    name: 'Green Garden',
    category: 'food',
    subcategory: 'vegetarien',
    icon: '🥗',
    description:
      'Restaurant 100% vegetal. Bowls, salades, wraps et desserts vegan. Ingredients bio et locaux.',
    location: {
      zone: 'Zone Food Court - Allee B',
      gridRef: 'D4',
      latitude: 48.8564,
      longitude: 2.353,
      nearestLandmark: "Face a l'espace chill",
    },
    hours: { open: '10:00', close: '23:00', isOpen: true },
    priceRange: { min: 7, max: 15, currency: 'EUR' },
    rating: 4.6,
    reviewCount: 156,
    capacity: 15,
    currentWaitTime: 5,
    crowdLevel: 'low',
    tags: ['vegan', 'vegetarien', 'bio', 'local', 'healthy', 'sans-gluten'],
    wheelchairAccessible: true,
    paymentMethods: ['cashless', 'card'],
    distance: 180,
  },
  {
    id: 'food-5',
    name: 'Glaces Artisanales',
    category: 'food',
    subcategory: 'dessert',
    icon: '🍦',
    description:
      'Glaces et sorbets artisanaux fabriques sur place. 20 parfums disponibles dont options vegan.',
    location: {
      zone: 'Zone Detente',
      gridRef: 'E2',
      latitude: 48.8572,
      longitude: 2.3518,
      nearestLandmark: 'Sous le grand arbre',
    },
    hours: { open: '11:00', close: '01:00', isOpen: true },
    priceRange: { min: 3, max: 7, currency: 'EUR' },
    rating: 4.8,
    reviewCount: 421,
    capacity: 10,
    currentWaitTime: 3,
    crowdLevel: 'low',
    tags: ['glace', 'sorbet', 'vegan', 'artisanal', 'dessert'],
    wheelchairAccessible: true,
    paymentMethods: ['cashless'],
    distance: 220,
  },
  {
    id: 'food-6',
    name: 'Tacos & Burritos',
    category: 'food',
    subcategory: 'mexicain',
    icon: '🌮',
    description: 'Cuisine mexicaine authentique. Tacos, burritos, quesadillas avec salsas maison.',
    location: {
      zone: 'Zone Food Court - Allee C',
      gridRef: 'D5',
      latitude: 48.8563,
      longitude: 2.3532,
      nearestLandmark: 'Entree Est du Food Court',
    },
    hours: { open: '12:00', close: '03:00', isOpen: true },
    priceRange: { min: 6, max: 13, currency: 'EUR' },
    rating: 4.4,
    reviewCount: 178,
    capacity: 18,
    currentWaitTime: 10,
    crowdLevel: 'medium',
    tags: ['mexicain', 'tacos', 'vegetarien', 'epice', 'guacamole'],
    wheelchairAccessible: true,
    paymentMethods: ['cashless'],
    distance: 165,
  },

  // === DRINKS ===
  {
    id: 'drink-1',
    name: 'Bar Central',
    category: 'drinks',
    subcategory: 'bar',
    icon: '🍺',
    description:
      'Le bar principal du festival. Large selection de bieres artisanales, vins et soft drinks.',
    location: {
      zone: 'Zone A - Centre',
      gridRef: 'A2',
      latitude: 48.8567,
      longitude: 2.352,
      nearestLandmark: 'Entre Main Stage et Electric Tent',
    },
    hours: { open: '12:00', close: '04:00', isOpen: true },
    priceRange: { min: 4, max: 9, currency: 'EUR' },
    rating: 4.2,
    reviewCount: 543,
    capacity: 100,
    currentWaitTime: 8,
    crowdLevel: 'high',
    tags: ['biere', 'vin', 'cocktails', 'soft', 'terrasse'],
    wheelchairAccessible: true,
    paymentMethods: ['cashless'],
    distance: 75,
  },
  {
    id: 'drink-2',
    name: 'Cocktail Lounge',
    category: 'drinks',
    subcategory: 'cocktails',
    icon: '🍹',
    description:
      'Bar a cocktails premium avec mixologues professionnels. Cocktails classiques et creations originales.',
    location: {
      zone: 'Zone VIP',
      gridRef: 'F1',
      latitude: 48.857,
      longitude: 2.3515,
      nearestLandmark: 'Entree VIP',
    },
    hours: { open: '18:00', close: '05:00', isOpen: true },
    priceRange: { min: 10, max: 18, currency: 'EUR' },
    rating: 4.6,
    reviewCount: 234,
    capacity: 50,
    currentWaitTime: 5,
    crowdLevel: 'medium',
    tags: ['cocktails', 'premium', 'mixologie', 'mojito', 'spritz'],
    wheelchairAccessible: true,
    paymentMethods: ['cashless', 'card'],
    distance: 310,
  },
  {
    id: 'drink-3',
    name: 'Fontaine a Eau',
    category: 'drinks',
    subcategory: 'eau',
    icon: '💧',
    description:
      "Point d'eau potable gratuit. Ramenez votre gourde pour vous hydrater gratuitement.",
    location: {
      zone: 'Zone A - Centre',
      gridRef: 'A3',
      latitude: 48.8566,
      longitude: 2.3523,
      nearestLandmark: "Pres de l'Accueil",
    },
    hours: { open: '00:00', close: '23:59', isOpen: true },
    capacity: 20,
    currentWaitTime: 2,
    crowdLevel: 'low',
    tags: ['eau', 'gratuit', 'hydratation', 'eco-responsable'],
    wheelchairAccessible: true,
    paymentMethods: [],
    distance: 45,
  },
  {
    id: 'drink-4',
    name: 'Coffee Corner',
    category: 'drinks',
    subcategory: 'cafe',
    icon: '☕',
    description:
      'Cafe de specialite, the, chocolat chaud. Grains torrefies localement, options lait vegetal.',
    location: {
      zone: 'Zone Detente',
      gridRef: 'E1',
      latitude: 48.8573,
      longitude: 2.3517,
      nearestLandmark: "Face a l'Acoustic Garden",
    },
    hours: { open: '08:00', close: '22:00', isOpen: true },
    priceRange: { min: 2, max: 6, currency: 'EUR' },
    rating: 4.5,
    reviewCount: 289,
    capacity: 15,
    currentWaitTime: 3,
    crowdLevel: 'low',
    tags: ['cafe', 'the', 'lait-vegetal', 'petit-dejeuner'],
    wheelchairAccessible: true,
    paymentMethods: ['cashless'],
    distance: 350,
  },

  // === SERVICES ===
  {
    id: 'service-1',
    name: 'Toilettes Nord',
    category: 'services',
    subcategory: 'sanitaires',
    icon: '🚻',
    description:
      '40 cabines dont 4 PMR. Nettoyage toutes les 30 minutes. Gel hydroalcoolique disponible.',
    location: {
      zone: 'Zone C - Nord',
      gridRef: 'C1',
      latitude: 48.8576,
      longitude: 2.352,
      nearestLandmark: "Derriere l'Acoustic Garden",
    },
    hours: { open: '00:00', close: '23:59', isOpen: true },
    capacity: 40,
    currentWaitTime: 5,
    crowdLevel: 'medium',
    tags: ['toilettes', 'pmr', 'accessible'],
    wheelchairAccessible: true,
    paymentMethods: [],
    distance: 180,
  },
  {
    id: 'service-2',
    name: 'Toilettes Sud',
    category: 'services',
    subcategory: 'sanitaires',
    icon: '🚻',
    description: '50 cabines dont 5 PMR. Zone la plus grande du site. Tables a langer disponibles.',
    location: {
      zone: 'Zone D - Sud',
      gridRef: 'G2',
      latitude: 48.8558,
      longitude: 2.3525,
      nearestLandmark: 'Pres du Camping',
    },
    hours: { open: '00:00', close: '23:59', isOpen: true },
    capacity: 50,
    currentWaitTime: 3,
    crowdLevel: 'low',
    tags: ['toilettes', 'pmr', 'bebe', 'accessible'],
    wheelchairAccessible: true,
    paymentMethods: [],
    distance: 320,
  },
  {
    id: 'service-3',
    name: 'Consigne Bagages',
    category: 'services',
    subcategory: 'consigne',
    icon: '🎒',
    description:
      'Consigne securisee 24h/24. Casiers S/M/L disponibles. Recharge possible pour vos appareils.',
    location: {
      zone: 'Zone Entree',
      gridRef: 'H1',
      latitude: 48.856,
      longitude: 2.351,
      nearestLandmark: "A droite de l'entree principale",
    },
    hours: { open: '10:00', close: '06:00', isOpen: true },
    priceRange: { min: 5, max: 15, currency: 'EUR' },
    capacity: 200,
    currentWaitTime: 2,
    crowdLevel: 'low',
    tags: ['consigne', 'securise', 'casier', 'recharge'],
    wheelchairAccessible: true,
    paymentMethods: ['cashless', 'card'],
    distance: 420,
  },
  {
    id: 'service-4',
    name: 'Station Recharge',
    category: 'services',
    subcategory: 'recharge',
    icon: '🔋',
    description:
      'Bornes de recharge gratuites pour smartphones. USB-A, USB-C et Lightning disponibles.',
    location: {
      zone: 'Zone A - Centre',
      gridRef: 'A4',
      latitude: 48.8565,
      longitude: 2.3524,
      nearestLandmark: "A cote de l'Accueil",
    },
    hours: { open: '10:00', close: '04:00', isOpen: true },
    capacity: 30,
    currentWaitTime: 10,
    crowdLevel: 'medium',
    tags: ['recharge', 'gratuit', 'telephone', 'usb'],
    wheelchairAccessible: true,
    paymentMethods: [],
    distance: 60,
  },

  // === EMERGENCY ===
  {
    id: 'emergency-1',
    name: 'Poste Medical Principal',
    category: 'emergency',
    subcategory: 'medical',
    icon: '🏥',
    description:
      'Centre medical avec medecins et infirmiers 24h/24. Urgences, premiers secours, pharmacie de base.',
    location: {
      zone: 'Zone Securite',
      gridRef: 'I1',
      latitude: 48.8562,
      longitude: 2.3512,
      nearestLandmark: "Pres de l'entree principale",
    },
    hours: { open: '00:00', close: '23:59', isOpen: true },
    phone: '+33 1 23 45 67 89',
    capacity: 20,
    tags: ['urgence', 'medecin', 'infirmier', '24h'],
    wheelchairAccessible: true,
    paymentMethods: [],
    distance: 250,
  },
  {
    id: 'emergency-2',
    name: 'Infirmerie Zone Nord',
    category: 'emergency',
    subcategory: 'infirmerie',
    icon: '🩹',
    description:
      'Premiers soins legers: pansements, desinfection, repos. Orientation vers poste medical si besoin.',
    location: {
      zone: 'Zone C - Nord',
      gridRef: 'C3',
      latitude: 48.8578,
      longitude: 2.3518,
      nearestLandmark: "Derriere l'espace detente",
    },
    hours: { open: '10:00', close: '04:00', isOpen: true },
    tags: ['premiers-soins', 'pansement', 'repos'],
    wheelchairAccessible: true,
    paymentMethods: [],
    distance: 380,
  },
  {
    id: 'emergency-3',
    name: 'Poste Securite',
    category: 'emergency',
    subcategory: 'securite',
    icon: '👮',
    description:
      'Equipe de securite 24h/24. Signalement, objets trouves, assistance. Liaison police si necessaire.',
    location: {
      zone: 'Zone Entree',
      gridRef: 'H2',
      latitude: 48.8559,
      longitude: 2.3508,
      nearestLandmark: "A gauche de l'entree principale",
    },
    hours: { open: '00:00', close: '23:59', isOpen: true },
    phone: '+33 1 23 45 67 90',
    tags: ['securite', 'police', 'assistance', '24h'],
    wheelchairAccessible: true,
    paymentMethods: [],
    distance: 430,
  },
  {
    id: 'emergency-4',
    name: 'Point de Rassemblement',
    category: 'emergency',
    subcategory: 'urgence',
    icon: '📍',
    description:
      "Point de rencontre en cas d'evacuation ou separation. Facilement identifiable par le drapeau rouge.",
    location: {
      zone: 'Zone A - Centre',
      gridRef: 'A5',
      latitude: 48.8566,
      longitude: 2.3522,
      nearestLandmark: 'Centre du site, drapeau rouge',
    },
    hours: { open: '00:00', close: '23:59', isOpen: true },
    tags: ['urgence', 'rencontre', 'evacuation', 'enfants'],
    wheelchairAccessible: true,
    paymentMethods: [],
    distance: 85,
  },

  // === INFO ===
  {
    id: 'info-1',
    name: 'Accueil Festival',
    category: 'info',
    subcategory: 'accueil',
    icon: 'ℹ️',
    description:
      'Information generale, plan du site, programme papier. Assistance multilingue FR/EN/ES.',
    location: {
      zone: 'Zone Entree',
      gridRef: 'H3',
      latitude: 48.8561,
      longitude: 2.3509,
      nearestLandmark: 'Juste apres les portiques',
    },
    hours: { open: '10:00', close: '02:00', isOpen: true },
    capacity: 10,
    currentWaitTime: 5,
    crowdLevel: 'medium',
    tags: ['info', 'plan', 'programme', 'multilingue'],
    wheelchairAccessible: true,
    paymentMethods: [],
    distance: 400,
  },
  {
    id: 'info-2',
    name: 'Point Cashless',
    category: 'info',
    subcategory: 'cashless',
    icon: '💳',
    description:
      "Rechargement de votre bracelet cashless. CB, especes. Remboursement du solde apres l'event.",
    location: {
      zone: 'Zone A - Centre',
      gridRef: 'A6',
      latitude: 48.8565,
      longitude: 2.3521,
      nearestLandmark: 'Face au Bar Central',
    },
    hours: { open: '10:00', close: '04:00', isOpen: true },
    capacity: 8,
    currentWaitTime: 12,
    crowdLevel: 'high',
    tags: ['cashless', 'recharge', 'paiement', 'remboursement'],
    wheelchairAccessible: true,
    paymentMethods: ['card', 'cash'],
    distance: 65,
  },
  {
    id: 'info-3',
    name: 'Boutique Officielle',
    category: 'info',
    subcategory: 'merchandising',
    icon: '👕',
    description:
      'T-shirts, hoodies, posters, vinyles. Editions limitees et collaborations exclusives.',
    location: {
      zone: 'Zone B - Est',
      gridRef: 'B1',
      latitude: 48.8569,
      longitude: 2.3535,
      nearestLandmark: 'Entree Est',
    },
    hours: { open: '11:00', close: '01:00', isOpen: true },
    priceRange: { min: 15, max: 80, currency: 'EUR' },
    rating: 4.3,
    reviewCount: 156,
    capacity: 30,
    currentWaitTime: 8,
    crowdLevel: 'medium',
    tags: ['merch', 't-shirt', 'vinyle', 'souvenir', 'edition-limitee'],
    wheelchairAccessible: true,
    paymentMethods: ['cashless', 'card'],
    distance: 290,
  },
  {
    id: 'info-4',
    name: 'Objets Trouves',
    category: 'info',
    subcategory: 'service',
    icon: '🔍',
    description:
      "Depot et recuperation d'objets perdus. Ouvert jusqu'a 48h apres la fin du festival.",
    location: {
      zone: 'Zone Entree',
      gridRef: 'H4',
      latitude: 48.856,
      longitude: 2.3507,
      nearestLandmark: 'A cote du Poste Securite',
    },
    hours: { open: '10:00', close: '06:00', isOpen: true },
    tags: ['objets-trouves', 'perdu', 'recuperation'],
    wheelchairAccessible: true,
    paymentMethods: [],
    distance: 440,
  },
];

// Composant pour l'indicateur de niveau d'affluence
const CrowdIndicator: React.FC<{ level?: 'low' | 'medium' | 'high' }> = ({ level }) => {
  if (!level) {
    return null;
  }

  const config = {
    low: { color: colors.success, label: 'Calme', bars: 1 },
    medium: { color: colors.warning, label: 'Modere', bars: 2 },
    high: { color: colors.error, label: 'Dense', bars: 3 },
  };

  const { color, label, bars } = config[level];

  return (
    <View style={styles.crowdIndicator}>
      <View style={styles.crowdBars}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={[styles.crowdBar, { backgroundColor: i <= bars ? color : colors.border }]}
          />
        ))}
      </View>
      <Text style={[styles.crowdLabel, { color }]}>{label}</Text>
    </View>
  );
};

// Composant pour les etoiles de notation
const RatingStars: React.FC<{ rating: number; count?: number }> = ({ rating, count }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <View style={styles.ratingContainer}>
      <Text style={styles.ratingStars}>
        {'★'.repeat(fullStars)}
        {hasHalfStar ? '½' : ''}
        {'☆'.repeat(5 - fullStars - (hasHalfStar ? 1 : 0))}
      </Text>
      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
      {count && <Text style={styles.reviewCount}>({count})</Text>}
    </View>
  );
};

// Composant pour le prix - kept for future map POI details
const _PriceIndicator: React.FC<{ priceRange?: PriceRange }> = ({ priceRange }) => {
  if (!priceRange) {
    return null;
  }

  return (
    <View style={styles.priceContainer}>
      <Text style={styles.priceText}>
        {priceRange.min}€ - {priceRange.max}€
      </Text>
    </View>
  );
};

// Composant pour les tags
const TagList: React.FC<{ tags: string[]; max?: number }> = ({ tags, max = 3 }) => {
  const displayTags = tags.slice(0, max);
  const remaining = tags.length - max;

  return (
    <View style={styles.tagContainer}>
      {displayTags.map((tag) => (
        <View key={tag} style={styles.tag}>
          <Text style={styles.tagText}>{tag}</Text>
        </View>
      ))}
      {remaining > 0 && (
        <View style={[styles.tag, styles.tagMore]}>
          <Text style={styles.tagText}>+{remaining}</Text>
        </View>
      )}
    </View>
  );
};

export const MapScreen: React.FC = () => {
  const navigation = useNavigation<MapNavigationProp>();
  const route = useRoute<MapRouteProp>();
  const initialFilter = route.params?.filter || 'all';
  const [selectedCategory, setSelectedCategory] = useState(initialFilter);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    if (route.params?.filter) {
      setSelectedCategory(route.params.filter);
    }
  }, [route.params?.filter]);

  const filteredPOIs =
    selectedCategory === 'all' ? pois : pois.filter((p) => p.category === selectedCategory);

  const groupedPOIs = filteredPOIs.reduce(
    (acc, poi) => {
      const category = categories.find((c) => c.key === poi.category);
      if (category) {
        if (!acc[category.label]) {
          acc[category.label] = [];
        }
        acc[category.label].push(poi);
      }
      return acc;
    },
    {} as Record<string, POI[]>
  );

  const getTitle = () => {
    switch (selectedCategory) {
      case 'food':
        return 'Restauration';
      case 'services':
        return 'Services';
      case 'emergency':
        return 'Urgences & Secours';
      case 'stages':
        return 'Scenes';
      case 'drinks':
        return 'Bars & Boissons';
      case 'info':
        return 'Informations';
      default:
        return 'Plan du Festival';
    }
  };

  const handlePOIPress = (poi: POI) => {
    setSelectedPOI(poi);
    setShowDetail(true);
  };

  const handleCall = (phone?: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleDirections = (poi: POI) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${poi.location.latitude},${poi.location.longitude}`,
      android: `geo:0,0?q=${poi.location.latitude},${poi.location.longitude}(${poi.name})`,
      default: `https://www.google.com/maps/search/?api=1&query=${poi.location.latitude},${poi.location.longitude}`,
    });
    Linking.openURL(url || '');
  };

  const renderPOICard = (poi: POI) => (
    <TouchableOpacity key={poi.id} onPress={() => handlePOIPress(poi)} activeOpacity={0.7}>
      <Card style={styles.poiCard}>
        <View style={styles.poiHeader}>
          <View style={styles.poiIconContainer}>
            <Text style={styles.poiIcon}>{poi.icon}</Text>
          </View>
          <View style={styles.poiMainInfo}>
            <View style={styles.poiTitleRow}>
              <Text style={styles.poiName} numberOfLines={1}>
                {poi.name}
              </Text>
              {poi.hours.isOpen ? (
                <View style={styles.openBadge}>
                  <Text style={styles.openBadgeText}>Ouvert</Text>
                </View>
              ) : (
                <View style={[styles.openBadge, styles.closedBadge]}>
                  <Text style={styles.closedBadgeText}>Ferme</Text>
                </View>
              )}
            </View>
            <Text style={styles.poiLocation}>📍 {poi.location.zone}</Text>
            {poi.location.gridRef && (
              <Text style={styles.poiGridRef}>Repere: {poi.location.gridRef}</Text>
            )}
          </View>
        </View>

        <Text style={styles.poiDescription} numberOfLines={2}>
          {poi.description}
        </Text>

        <View style={styles.poiMeta}>
          {/* Distance */}
          {poi.distance && (
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>🚶</Text>
              <Text style={styles.metaText}>
                {poi.distance < 1000 ? `${poi.distance}m` : `${(poi.distance / 1000).toFixed(1)}km`}
              </Text>
            </View>
          )}

          {/* Wait time */}
          {poi.currentWaitTime !== undefined && poi.currentWaitTime > 0 && (
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>⏱️</Text>
              <Text style={styles.metaText}>{poi.currentWaitTime} min</Text>
            </View>
          )}

          {/* Price */}
          {poi.priceRange && (
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>💰</Text>
              <Text style={styles.metaText}>
                {poi.priceRange.min}-{poi.priceRange.max}€
              </Text>
            </View>
          )}

          {/* Rating */}
          {poi.rating && (
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>⭐</Text>
              <Text style={styles.metaText}>{poi.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {/* Tags */}
        <TagList tags={poi.tags} max={4} />

        {/* Crowd indicator */}
        <View style={styles.poiFooter}>
          <CrowdIndicator level={poi.crowdLevel} />
          <View style={styles.poiActions}>
            {poi.wheelchairAccessible && <Text style={styles.accessibleIcon}>♿</Text>}
            <TouchableOpacity style={styles.directionButton} onPress={() => handleDirections(poi)}>
              <Text style={styles.directionIcon}>🧭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          {navigation.canGoBack() && (
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
          )}
          <View style={styles.headerText}>
            <Text style={styles.title}>{getTitle()}</Text>
            <Text style={styles.subtitle}>
              {filteredPOIs.length} lieu{filteredPOIs.length > 1 ? 'x' : ''} disponible
              {filteredPOIs.length > 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Map Placeholder */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapIcon}>🗺️</Text>
          <Text style={styles.mapText}>Carte interactive</Text>
          <Text style={styles.mapSubtext}>Bientot disponible</Text>
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
        style={styles.categoriesList}
      >
        {categories.map((category) => {
          const count =
            category.key === 'all'
              ? pois.length
              : pois.filter((p) => p.category === category.key).length;
          return (
            <TouchableOpacity
              key={category.key}
              style={[
                styles.categoryButton,
                selectedCategory === category.key && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(category.key)}
            >
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category.key && styles.categoryTextActive,
                ]}
              >
                {category.label}
              </Text>
              <View
                style={[
                  styles.categoryCount,
                  selectedCategory === category.key && styles.categoryCountActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryCountText,
                    selectedCategory === category.key && styles.categoryCountTextActive,
                  ]}
                >
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* POIs List */}
      <ScrollView
        style={styles.poiList}
        contentContainerStyle={styles.poiContent}
        showsVerticalScrollIndicator={false}
      >
        {selectedCategory === 'all' ? (
          Object.entries(groupedPOIs).map(([categoryName, categoryPOIs]) => (
            <View key={categoryName} style={styles.categoryGroup}>
              <Text style={styles.categoryGroupTitle}>{categoryName}</Text>
              {categoryPOIs.map(renderPOICard)}
            </View>
          ))
        ) : (
          <View style={styles.categoryGroup}>{filteredPOIs.map(renderPOICard)}</View>
        )}
      </ScrollView>

      {/* POI Detail Modal */}
      <Modal
        visible={showDetail}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetail(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedPOI && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconLarge}>
                    <Text style={styles.modalEmoji}>{selectedPOI.icon}</Text>
                  </View>
                  <TouchableOpacity style={styles.closeButton} onPress={() => setShowDetail(false)}>
                    <Text style={styles.closeIcon}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalTitle}>{selectedPOI.name}</Text>
                {selectedPOI.subcategory && (
                  <Text style={styles.modalSubcategory}>{selectedPOI.subcategory}</Text>
                )}

                {/* Status & Rating */}
                <View style={styles.modalStatusRow}>
                  {selectedPOI.hours.isOpen ? (
                    <View style={styles.openBadgeLarge}>
                      <Text style={styles.openBadgeLargeText}>Ouvert</Text>
                    </View>
                  ) : (
                    <View style={[styles.openBadgeLarge, styles.closedBadgeLarge]}>
                      <Text style={styles.closedBadgeLargeText}>Ferme</Text>
                    </View>
                  )}
                  {selectedPOI.rating && (
                    <RatingStars rating={selectedPOI.rating} count={selectedPOI.reviewCount} />
                  )}
                </View>

                {/* Description */}
                <Text style={styles.modalDescription}>{selectedPOI.description}</Text>

                {/* Location Info */}
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>📍 Localisation</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Zone</Text>
                    <Text style={styles.infoValue}>{selectedPOI.location.zone}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Repere</Text>
                    <Text style={styles.infoValue}>{selectedPOI.location.gridRef}</Text>
                  </View>
                  {selectedPOI.location.nearestLandmark && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Pres de</Text>
                      <Text style={styles.infoValue}>{selectedPOI.location.nearestLandmark}</Text>
                    </View>
                  )}
                  {selectedPOI.distance && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Distance</Text>
                      <Text style={styles.infoValue}>
                        {selectedPOI.distance < 1000
                          ? `${selectedPOI.distance} metres`
                          : `${(selectedPOI.distance / 1000).toFixed(1)} km`}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Hours & Availability */}
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>🕐 Horaires & Disponibilite</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Horaires</Text>
                    <Text style={styles.infoValue}>
                      {selectedPOI.hours.open} - {selectedPOI.hours.close}
                    </Text>
                  </View>
                  {selectedPOI.currentWaitTime !== undefined && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Attente estimee</Text>
                      <Text
                        style={[
                          styles.infoValue,
                          selectedPOI.currentWaitTime > 10 && { color: colors.warning },
                          selectedPOI.currentWaitTime > 20 && { color: colors.error },
                        ]}
                      >
                        {selectedPOI.currentWaitTime} minutes
                      </Text>
                    </View>
                  )}
                  {selectedPOI.capacity && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Capacite</Text>
                      <Text style={styles.infoValue}>{selectedPOI.capacity} personnes</Text>
                    </View>
                  )}
                  {selectedPOI.crowdLevel && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Affluence</Text>
                      <CrowdIndicator level={selectedPOI.crowdLevel} />
                    </View>
                  )}
                </View>

                {/* Price */}
                {selectedPOI.priceRange && (
                  <View style={styles.infoSection}>
                    <Text style={styles.infoSectionTitle}>💰 Tarifs</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Fourchette</Text>
                      <Text style={styles.infoValue}>
                        {selectedPOI.priceRange.min}€ - {selectedPOI.priceRange.max}€
                      </Text>
                    </View>
                  </View>
                )}

                {/* Payment & Accessibility */}
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>💳 Paiement & Accessibilite</Text>
                  {selectedPOI.paymentMethods.length > 0 && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Paiements</Text>
                      <Text style={styles.infoValue}>
                        {selectedPOI.paymentMethods
                          .map((m) =>
                            m === 'cashless' ? 'Cashless' : m === 'card' ? 'Carte' : 'Especes'
                          )
                          .join(', ')}
                      </Text>
                    </View>
                  )}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Accessible PMR</Text>
                    <Text style={styles.infoValue}>
                      {selectedPOI.wheelchairAccessible ? '✅ Oui' : '❌ Non'}
                    </Text>
                  </View>
                </View>

                {/* Tags */}
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>🏷️ Caracteristiques</Text>
                  <View style={styles.modalTagContainer}>
                    {selectedPOI.tags.map((tag) => (
                      <View key={tag} style={styles.modalTag}>
                        <Text style={styles.modalTagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDirections(selectedPOI)}
                  >
                    <Text style={styles.actionButtonIcon}>🧭</Text>
                    <Text style={styles.actionButtonText}>Itineraire</Text>
                  </TouchableOpacity>
                  {selectedPOI.phone && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonSecondary]}
                      onPress={() => handleCall(selectedPOI.phone)}
                    >
                      <Text style={styles.actionButtonIcon}>📞</Text>
                      <Text style={styles.actionButtonTextSecondary}>Appeler</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  backIcon: {
    fontSize: 24,
    color: colors.text,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  subtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  mapContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  mapPlaceholder: {
    height: 140,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  mapIcon: {
    fontSize: 36,
    marginBottom: spacing.xs,
  },
  mapText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  mapSubtext: {
    ...typography.caption,
    color: colors.textMuted,
  },
  categoriesList: {
    maxHeight: 56,
  },
  categoriesContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  categoryText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: colors.white,
  },
  categoryCount: {
    marginLeft: spacing.xs,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryCountActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  categoryCountText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '700',
  },
  categoryCountTextActive: {
    color: colors.white,
  },
  poiList: {
    flex: 1,
  },
  poiContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  categoryGroup: {
    marginBottom: spacing.md,
  },
  categoryGroupTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  poiCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  poiHeader: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  poiIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  poiIcon: {
    fontSize: 24,
  },
  poiMainInfo: {
    flex: 1,
  },
  poiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  poiName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    flex: 1,
    marginRight: spacing.sm,
  },
  openBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  openBadgeText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
    fontSize: 10,
  },
  closedBadge: {
    backgroundColor: colors.error + '20',
  },
  closedBadgeText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
    fontSize: 10,
  },
  poiLocation: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  poiGridRef: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
  },
  poiDescription: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  poiMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
    marginBottom: 4,
  },
  metaIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  metaText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  tag: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    marginRight: 4,
    marginBottom: 4,
  },
  tagMore: {
    backgroundColor: colors.surfaceLight,
  },
  tagText: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '500',
  },
  poiFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  crowdIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  crowdBars: {
    flexDirection: 'row',
    marginRight: spacing.xs,
  },
  crowdBar: {
    width: 4,
    height: 12,
    borderRadius: 2,
    marginRight: 2,
  },
  crowdLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  poiActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accessibleIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  directionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionIcon: {
    fontSize: 18,
  },
  // Rating styles
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingStars: {
    color: colors.warning,
    fontSize: 12,
  },
  ratingText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
    marginLeft: 4,
  },
  reviewCount: {
    ...typography.caption,
    color: colors.textMuted,
    marginLeft: 2,
  },
  // Price styles
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    position: 'relative',
  },
  modalIconLarge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEmoji: {
    fontSize: 36,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 18,
    color: colors.textMuted,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubcategory: {
    ...typography.small,
    color: colors.primary,
    textAlign: 'center',
    textTransform: 'capitalize',
    marginBottom: spacing.md,
  },
  modalStatusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  openBadgeLarge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
  },
  openBadgeLargeText: {
    ...typography.small,
    color: colors.success,
    fontWeight: '600',
  },
  closedBadgeLarge: {
    backgroundColor: colors.error + '20',
  },
  closedBadgeLargeText: {
    ...typography.small,
    color: colors.error,
    fontWeight: '600',
  },
  modalDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  infoSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoSectionTitle: {
    ...typography.small,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    ...typography.small,
    color: colors.textMuted,
  },
  infoValue: {
    ...typography.small,
    color: colors.text,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  modalTagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  modalTag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  modalTagText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginRight: spacing.sm,
  },
  actionButtonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 0,
  },
  actionButtonIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  actionButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  actionButtonTextSecondary: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
});

export default MapScreen;
