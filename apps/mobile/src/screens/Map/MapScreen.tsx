import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/common';
import { colors, spacing, typography, borderRadius } from '../../theme';

const { width } = Dimensions.get('window');

interface MapPoint {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
}

const categories = [
  { key: 'all', label: 'Tout', icon: '🗺️' },
  { key: 'stages', label: 'Scenes', icon: '🎤' },
  { key: 'food', label: 'Food', icon: '🍔' },
  { key: 'drinks', label: 'Bars', icon: '🍺' },
  { key: 'services', label: 'Services', icon: '🚻' },
  { key: 'info', label: 'Info', icon: 'ℹ️' },
];

const mapPoints: MapPoint[] = [
  // Stages
  { id: '1', name: 'Main Stage', category: 'stages', icon: '🎤', description: 'Scene principale - 10 000 places' },
  { id: '2', name: 'Electric Tent', category: 'stages', icon: '🎧', description: 'Scene electronique - 5 000 places' },
  { id: '3', name: 'Acoustic Garden', category: 'stages', icon: '🎸', description: 'Scene acoustique - 2 000 places' },
  { id: '4', name: 'DJ Booth', category: 'stages', icon: '🎚️', description: 'Espace DJ - 1 000 places' },
  // Food
  { id: '5', name: 'Burger Stand', category: 'food', icon: '🍔', description: 'Burgers et frites' },
  { id: '6', name: 'Pizza Corner', category: 'food', icon: '🍕', description: 'Pizzas artisanales' },
  { id: '7', name: 'Asian Kitchen', category: 'food', icon: '🍜', description: 'Cuisine asiatique' },
  { id: '8', name: 'Veggie Paradise', category: 'food', icon: '🥗', description: 'Options vegetariennes' },
  { id: '9', name: 'Ice Cream', category: 'food', icon: '🍦', description: 'Glaces et sorbets' },
  // Drinks
  { id: '10', name: 'Bar Central', category: 'drinks', icon: '🍺', description: 'Bieres et cocktails' },
  { id: '11', name: 'Cocktail Lounge', category: 'drinks', icon: '🍹', description: 'Cocktails premium' },
  { id: '12', name: 'Water Station', category: 'drinks', icon: '💧', description: 'Eau gratuite' },
  { id: '13', name: 'Coffee Shop', category: 'drinks', icon: '☕', description: 'Cafe et the' },
  // Services
  { id: '14', name: 'Toilettes Nord', category: 'services', icon: '🚻', description: 'Sanitaires zone nord' },
  { id: '15', name: 'Toilettes Sud', category: 'services', icon: '🚻', description: 'Sanitaires zone sud' },
  { id: '16', name: 'Poste Medical', category: 'services', icon: '🏥', description: 'Premiers secours' },
  { id: '17', name: 'Consignes', category: 'services', icon: '🎒', description: 'Depot bagages' },
  { id: '18', name: 'Recharge Mobile', category: 'services', icon: '🔋', description: 'Stations de recharge' },
  // Info
  { id: '19', name: 'Accueil', category: 'info', icon: 'ℹ️', description: 'Information generale' },
  { id: '20', name: 'Point Cashless', category: 'info', icon: '💳', description: 'Rechargement portefeuille' },
  { id: '21', name: 'Merchandising', category: 'info', icon: '👕', description: 'Boutique officielle' },
  { id: '22', name: 'Objets Trouves', category: 'info', icon: '🔍', description: 'Objets perdus' },
];

export const MapScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredPoints = selectedCategory === 'all'
    ? mapPoints
    : mapPoints.filter((p) => p.category === selectedCategory);

  const groupedPoints = filteredPoints.reduce((acc, point) => {
    const category = categories.find((c) => c.key === point.category);
    if (category) {
      if (!acc[category.label]) {
        acc[category.label] = [];
      }
      acc[category.label].push(point);
    }
    return acc;
  }, {} as Record<string, MapPoint[]>);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Plan du site</Text>
        <Text style={styles.subtitle}>Trouvez votre chemin</Text>
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
        {categories.map((category) => (
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
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Points List */}
      <ScrollView
        style={styles.pointsList}
        contentContainerStyle={styles.pointsContent}
        showsVerticalScrollIndicator={false}
      >
        {selectedCategory === 'all' ? (
          Object.entries(groupedPoints).map(([categoryName, points]) => (
            <View key={categoryName} style={styles.categoryGroup}>
              <Text style={styles.categoryGroupTitle}>{categoryName}</Text>
              {points.map((point) => (
                <Card key={point.id} style={styles.pointCard}>
                  <View style={styles.pointContent}>
                    <View style={styles.pointIcon}>
                      <Text style={styles.pointEmoji}>{point.icon}</Text>
                    </View>
                    <View style={styles.pointInfo}>
                      <Text style={styles.pointName}>{point.name}</Text>
                      <Text style={styles.pointDescription}>{point.description}</Text>
                    </View>
                    <TouchableOpacity style={styles.directionsButton}>
                      <Text style={styles.directionsIcon}>📍</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              ))}
            </View>
          ))
        ) : (
          <View style={styles.categoryGroup}>
            {filteredPoints.map((point) => (
              <Card key={point.id} style={styles.pointCard}>
                <View style={styles.pointContent}>
                  <View style={styles.pointIcon}>
                    <Text style={styles.pointEmoji}>{point.icon}</Text>
                  </View>
                  <View style={styles.pointInfo}>
                    <Text style={styles.pointName}>{point.name}</Text>
                    <Text style={styles.pointDescription}>{point.description}</Text>
                  </View>
                  <TouchableOpacity style={styles.directionsButton}>
                    <Text style={styles.directionsIcon}>📍</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}
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
  mapContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  mapPlaceholder: {
    height: 180,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  mapIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  mapText: {
    ...typography.h3,
    color: colors.text,
  },
  mapSubtext: {
    ...typography.caption,
    color: colors.textMuted,
  },
  categoriesList: {
    maxHeight: 80,
  },
  categoriesContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
    fontSize: 18,
    marginRight: spacing.xs,
  },
  categoryText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: colors.white,
  },
  pointsList: {
    flex: 1,
  },
  pointsContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  categoryGroup: {
    marginBottom: spacing.lg,
  },
  categoryGroupTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  pointCard: {
    marginBottom: spacing.sm,
  },
  pointContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  pointEmoji: {
    fontSize: 22,
  },
  pointInfo: {
    flex: 1,
  },
  pointName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  pointDescription: {
    ...typography.caption,
    color: colors.textMuted,
  },
  directionsButton: {
    padding: spacing.sm,
  },
  directionsIcon: {
    fontSize: 20,
  },
});

export default MapScreen;
