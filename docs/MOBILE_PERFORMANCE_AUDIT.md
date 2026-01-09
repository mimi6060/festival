# Mobile App Performance Audit Report

**Date:** 2026-01-09
**App:** Festival Mobile App (React Native + Expo)
**Location:** `/apps/mobile/`

---

## Executive Summary

This comprehensive performance audit of the Festival mobile app identifies key areas for optimization across components, images, lists, state management, navigation, and network handling. The app follows generally good practices but has several opportunities for significant performance improvements.

### Overall Score: 7/10

| Category           | Score | Priority Issues                                     |
| ------------------ | ----- | --------------------------------------------------- |
| Component Analysis | 6/10  | Missing memoization, inline functions               |
| Image Optimization | 5/10  | No FastImage, no caching strategy                   |
| List Performance   | 7/10  | Missing getItemLayout                               |
| State Management   | 8/10  | Good Zustand usage, some optimization needed        |
| Navigation         | 7/10  | Missing lazy loading                                |
| Network            | 7/10  | Good offline support, missing request deduplication |

---

## 1. Component Analysis

### 1.1 Missing React.memo - CRITICAL

The following components receive props but are not memoized, causing unnecessary re-renders:

#### Critical (High re-render frequency)

| Component         | File                     | Impact                              |
| ----------------- | ------------------------ | ----------------------------------- |
| `TabIcon`         | `MainTabs.tsx:22`        | Re-renders on every tab change      |
| `TransactionItem` | `TransactionItem.tsx:10` | Re-renders when parent list scrolls |
| `BalanceCard`     | `BalanceCard.tsx:12`     | Re-renders on every wallet update   |
| `EventCard`       | `EventCard.tsx:21`       | Re-renders in program list          |
| `ArtistCard`      | `ArtistCard.tsx:22`      | Re-renders in artist list           |
| `Card`            | `Card.tsx:18`            | Base component used everywhere      |
| `Button`          | `Button.tsx:25`          | Used in many screens                |

**Fix Example:**

```tsx
// Before
export const TransactionItem: React.FC<TransactionItemProps> = ({ transaction }) => {
  // ...
};

// After
export const TransactionItem: React.FC<TransactionItemProps> = React.memo(({ transaction }) => {
  // ...
});

// Or with custom comparison
export const TransactionItem = React.memo<TransactionItemProps>(
  ({ transaction }) => {
    // ...
  },
  (prevProps, nextProps) => prevProps.transaction.id === nextProps.transaction.id
);
```

### 1.2 Inline Functions in Render - HIGH PRIORITY

Inline functions create new references on every render, breaking memoization.

#### MainTabs.tsx (Lines 56-100)

```tsx
// PROBLEM: Inline function in tabBarIcon
options={{
  tabBarIcon: ({ focused }) => (
    <TabIcon focused={focused} icon="..." label="..." />
  ),
}}
```

**Fix:**

```tsx
// Create stable callbacks outside render
const renderHomeIcon = useCallback(({ focused }: { focused: boolean }) => (
  <TabIcon focused={focused} icon="..." label="Accueil" />
), []);

// Use in options
options={{ tabBarIcon: renderHomeIcon }}
```

#### ProgramScreen.tsx (Line 170)

```tsx
// PROBLEM: Arrow function in onPress
<TouchableOpacity
  onPress={() => handleToggleFavorite(item.id)}  // Creates new function each render
>
```

**Fix:**

```tsx
// Use useCallback with stable reference
const handleFavoritePress = useCallback((eventId: string) => () => {
  toggleFavorite(eventId);
}, [toggleFavorite]);

// Or better: Pass id as data attribute
<TouchableOpacity
  onPress={handleToggleFavorite}
  data-id={item.id}
>
```

#### HomeScreen.tsx (Lines 138-144, 172-196)

Multiple inline arrow functions in map iterations:

```tsx
// PROBLEM
activeTickets.map((ticket) => (
  <TicketCard
    onPress={() => handleTicketPress(ticket)} // New function per render
  />
));
```

**Fix:**

```tsx
// Extract item component
const TicketItem = React.memo(({ ticket, onPress }) => (
  <TicketCard ticket={ticket} onPress={onPress} />
));

// Use stable callback
const handlePress = useCallback(
  (ticket: Ticket) => {
    navigation.navigate('TicketDetail', { ticketId: ticket.id });
  },
  [navigation]
);
```

### 1.3 Missing Keys in Lists - MEDIUM

All FlatList implementations correctly use `keyExtractor`. No issues found.

### 1.4 Expensive Calculations Without Memoization

#### TransactionsScreen.tsx (Lines 121-141)

```tsx
// PROBLEM: Date formatting in every render cycle
const groupedTransactions = useMemo(() => {
  const groups: { [key: string]: Transaction[] } = {};
  filteredTransactions.forEach((transaction) => {
    const date = new Date(transaction.createdAt).toLocaleDateString('fr-FR', {
      // Expensive formatting
    });
    // ...
  });
  return Object.entries(groups)...
}, [filteredTransactions]);
```

**Fix:** Consider caching date format results or using a lighter date library.

---

## 2. Image Optimization

### 2.1 Missing FastImage - CRITICAL

The app uses the standard React Native `Image` component instead of `react-native-fast-image`.

**Files affected:**

- `ArtistCard.tsx` (Lines 63, 101, 173)
- `EventCard.tsx` (Lines 84)

**Impact:**

- No aggressive caching
- No priority loading
- No prefetching
- Slower image display

**Fix:**

```bash
# Install
npm install react-native-fast-image
```

```tsx
// Before
import { Image } from 'react-native';
<Image source={{ uri: artist.image }} style={styles.avatar} />;

// After
import FastImage from 'react-native-fast-image';
<FastImage
  source={{
    uri: artist.image,
    priority: FastImage.priority.normal,
    cache: FastImage.cacheControl.immutable,
  }}
  style={styles.avatar}
  resizeMode={FastImage.resizeMode.cover}
/>;
```

### 2.2 No Image Preloading Strategy - HIGH

Images are loaded only when components mount. Consider preloading critical images.

**Fix:**

```tsx
// Create image preloader
import FastImage from 'react-native-fast-image';

export const preloadImages = (urls: string[]) => {
  FastImage.preload(urls.map((uri) => ({ uri })));
};

// Use in HomeScreen or App initialization
useEffect(() => {
  const artistImages = upcomingEvents.map((e) => e.artist.image).filter(Boolean);
  preloadImages(artistImages);
}, [upcomingEvents]);
```

### 2.3 No Placeholder Images - MEDIUM

Images show blank space while loading. Implement placeholder strategy.

**Fix:**

```tsx
<FastImage
  source={{ uri: artist.image }}
  defaultSource={require('../assets/placeholder-artist.png')}
  style={styles.avatar}
/>
```

### 2.4 Missing Image Dimensions - LOW

Some images don't have explicit dimensions, which can cause layout jumps.

---

## 3. List Performance

### 3.1 Missing getItemLayout - HIGH PRIORITY

FlatLists without `getItemLayout` cannot optimize scroll-to-index operations.

**Files affected:**

- `ProgramScreen.tsx` - FlatList without getItemLayout
- `TransactionsScreen.tsx` - Both FlatLists missing getItemLayout
- `NotificationsScreen.tsx` - FlatList without getItemLayout
- `MyTicketsScreen.tsx` - FlatList without getItemLayout

**Fix for ProgramScreen.tsx:**

```tsx
const ITEM_HEIGHT = 120; // Measure actual item height

<FlatList
  data={filteredEvents}
  renderItem={renderEvent}
  keyExtractor={(item) => item.id}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  // ...
/>;
```

### 3.2 Missing initialNumToRender - MEDIUM

Default `initialNumToRender` (10) may not be optimal for all screens.

**Fix:**

```tsx
<FlatList
  initialNumToRender={8}
  maxToRenderPerBatch={10}
  windowSize={5}
  removeClippedSubviews={true}
  // ...
/>
```

### 3.3 Nested ScrollView in WalletScreen - MEDIUM

`WalletScreen.tsx` uses ScrollView with inline map for transactions instead of FlatList.

```tsx
// PROBLEM: Lines 160-163
recentTransactions.map((transaction) => (
  <TransactionItem key={transaction.id} transaction={transaction} />
));
```

For small lists (5 items) this is acceptable, but should use FlatList for larger datasets.

### 3.4 Render Function Not Memoized - HIGH

`renderItem` functions are defined inside components, recreating on every render.

**Fix:**

```tsx
// Extract outside component or use useCallback
const renderEvent = useCallback(
  ({ item }: { item: ProgramEvent }) => {
    return <EventCard event={item} />;
  },
  [
    /* dependencies */
  ]
);
```

---

## 4. State Management

### 4.1 Good: Zustand with Persistence

The app correctly uses Zustand with AsyncStorage persistence:

- `walletStore.ts` - Good partialize implementation
- `programStore.ts` - Good selective persistence
- `ticketStore.ts` - Good configuration
- `notificationStore.ts` - Good configuration

### 4.2 Store Selector Optimization Needed - MEDIUM

Components may re-render when unrelated store parts change.

**Current (potentially inefficient):**

```tsx
// HomeScreen.tsx
const { user } = useAuthStore();
const { tickets } = useTicketStore();
const { balance } = useWalletStore();
const { unreadCount } = useNotificationStore();
const { events: programEvents, favorites, toggleFavorite } = useProgramStore();
```

**Optimized:**

```tsx
// Use shallow comparison for multiple values
import { useShallow } from 'zustand/react/shallow';

const { events, favorites, toggleFavorite } = useProgramStore(
  useShallow((state) => ({
    events: state.events,
    favorites: state.favorites,
    toggleFavorite: state.toggleFavorite,
  }))
);

// Or individual selectors for atomic values
const unreadCount = useNotificationStore((state) => state.unreadCount);
```

### 4.3 AsyncStorage Usage - GOOD

AsyncStorage is properly used with:

- JSON serialization via `createJSONStorage`
- Selective persistence via `partialize`
- Proper key naming conventions

### 4.4 Potential Memory Issue - LOW

Large arrays (events, transactions) are stored in memory. Consider pagination for very large datasets.

---

## 5. Navigation

### 5.1 Missing Lazy Loading - HIGH PRIORITY

Screens are imported eagerly in navigation files.

**Current (AuthNavigator.tsx):**

```tsx
import { LoginScreen } from '../../screens/Auth/LoginScreen';
import { RegisterScreen } from '../../screens/Auth/RegisterScreen';
```

**Fix:**

```tsx
import React, { lazy, Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';

const LoginScreen = lazy(() => import('../../screens/Auth/LoginScreen'));
const RegisterScreen = lazy(() => import('../../screens/Auth/RegisterScreen'));

const LazyScreen = ({ children }: { children: React.ReactNode }) => (
  <Suspense
    fallback={
      <View style={styles.loader}>
        <ActivityIndicator />
      </View>
    }
  >
    {children}
  </Suspense>
);

// In navigator
<Stack.Screen
  name="Login"
  component={() => (
    <LazyScreen>
      <LoginScreen />
    </LazyScreen>
  )}
/>;
```

**Better approach using React Navigation's lazy:**

```tsx
const Tab = createBottomTabNavigator<MainTabParamList>();

// Use lazy prop (React Navigation 7+)
<Tab.Navigator>
  <Tab.Screen name="Home" component={HomeScreen} options={{ lazy: true }} />
</Tab.Navigator>;
```

### 5.2 Tab Navigator Optimization - MEDIUM

All tab screens load simultaneously. Consider `lazy={true}` for less-used tabs.

### 5.3 Navigation State Not Persisted - LOW

Consider persisting navigation state for better UX on app restart.

---

## 6. Network

### 6.1 Good: Comprehensive Offline Support

The app has excellent offline infrastructure:

- `OfflineService` with sync queue
- `DataSyncService` with delta sync
- Network state detection
- Conflict resolution

### 6.2 Missing Request Caching/Deduplication - MEDIUM

Multiple components may trigger the same API call simultaneously.

**Current (HomeScreen.tsx line 40):**

```tsx
useEffect(() => {
  initializeDemoData();
  offlineService.syncAllData(); // No deduplication
}, []);
```

**Fix:** Add request deduplication in API service:

```tsx
const pendingRequests = new Map<string, Promise<any>>();

async function dedupedFetch(key: string, fetchFn: () => Promise<any>) {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const promise = fetchFn().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}
```

### 6.3 Good: Retry Logic with Exponential Backoff

`DataSyncService.ts` implements proper retry logic (lines 451-475).

### 6.4 Missing Request Batching - MEDIUM

Multiple sync operations run sequentially. Consider batching for better performance:

```tsx
// Current: Sequential
for (const dataType of SYNC_ORDER) {
  await this.syncDataType(dataType);
}

// Better: Parallel with concurrency limit
await pLimit(3)(SYNC_ORDER.map((type) => () => this.syncDataType(type)));
```

### 6.5 No HTTP Cache Headers Usage - LOW

Consider implementing cache headers for API responses.

---

## 7. Additional Issues

### 7.1 Missing Error Boundaries - HIGH

No error boundaries found. App crashes will be unhandled.

**Fix:**

```tsx
// ErrorBoundary.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false, error: undefined };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text>Something went wrong</Text>
          <TouchableOpacity onPress={this.handleRetry}>
            <Text>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// Wrap app
<ErrorBoundary>
  <App />
</ErrorBoundary>;
```

### 7.2 useNativeDriver Not Utilized - MEDIUM

`OnboardingScreen.tsx` animation uses `useNativeDriver: false`:

```tsx
// Line 159
onScroll={Animated.event(
  [{ nativeEvent: { contentOffset: { x: scrollX } } }],
  { useNativeDriver: false }  // Performance impact
)}
```

For color/opacity animations, native driver isn't supported, but consider using `react-native-reanimated` for better performance.

### 7.3 Console Logs in Production - LOW

Multiple files contain console.log statements that should be removed or wrapped for production:

- `DataSyncService.ts` (lines 151, 251, 333, etc.)
- `useWallet.ts` (lines 104, 109, etc.)
- `NFCScanner.tsx` (referenced in hooks)

---

## Critical Issues (Must Fix)

| #   | Issue                            | File(s)                                | Estimated Impact          |
| --- | -------------------------------- | -------------------------------------- | ------------------------- |
| 1   | Missing React.memo on list items | TransactionItem, EventCard, ArtistCard | 30% render reduction      |
| 2   | Inline functions in MainTabs     | MainTabs.tsx                           | Eliminates tab re-renders |
| 3   | No FastImage                     | ArtistCard, EventCard                  | 50% faster image loads    |
| 4   | Missing getItemLayout            | All FlatLists                          | Instant scroll-to-index   |
| 5   | No Error Boundaries              | App.tsx                                | Crash prevention          |

## High Priority (Should Fix)

| #   | Issue                            | File(s)                   | Estimated Impact             |
| --- | -------------------------------- | ------------------------- | ---------------------------- |
| 1   | Inline functions in renderItem   | ProgramScreen, HomeScreen | 20% render reduction         |
| 2   | Missing lazy loading for screens | Navigation files          | Faster initial load          |
| 3   | Store selector optimization      | All screens using stores  | Reduced re-renders           |
| 4   | Image preloading                 | HomeScreen, ProgramScreen | Better perceived performance |

## Medium Priority (Nice to Have)

| #   | Issue                          | File(s)          | Impact                |
| --- | ------------------------------ | ---------------- | --------------------- |
| 1   | Request batching               | DataSyncService  | Faster sync           |
| 2   | useNativeDriver for animations | OnboardingScreen | Smoother animations   |
| 3   | Request deduplication          | API services     | Reduced network calls |
| 4   | FlatList tuning params         | All list screens | Optimized memory      |

---

## Performance Checklist

### Before Each Release

- [ ] Run React Native Performance Monitor
- [ ] Check for unnecessary re-renders with React DevTools
- [ ] Profile list scrolling FPS (target: 60fps)
- [ ] Test offline mode functionality
- [ ] Verify image loading times
- [ ] Check memory usage patterns
- [ ] Remove/guard console statements
- [ ] Test on low-end devices

### Component Guidelines

```tsx
// Every list item component should:
export const MyListItem = React.memo<Props>(
  ({ data, onPress }) => {
    // Use useCallback for handlers
    const handlePress = useCallback(() => {
      onPress(data.id);
    }, [data.id, onPress]);

    return <TouchableOpacity onPress={handlePress}>...</TouchableOpacity>;
  },
  // Custom comparison for complex props
  (prev, next) => prev.data.id === next.data.id
);
```

### FlatList Configuration Template

```tsx
<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={keyExtractor}
  getItemLayout={getItemLayout}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={5}
  removeClippedSubviews={true}
  updateCellsBatchingPeriod={50}
  onEndReachedThreshold={0.5}
  onEndReached={handleEndReached}
/>
```

### Image Component Template

```tsx
<FastImage
  source={{
    uri: imageUrl,
    priority: FastImage.priority.normal,
    cache: FastImage.cacheControl.immutable,
  }}
  style={styles.image}
  resizeMode={FastImage.resizeMode.cover}
  onError={() => setImageError(true)}
  fallback={Platform.OS === 'android'}
/>
```

---

## Recommended Libraries

| Library                 | Purpose             | Current Status |
| ----------------------- | ------------------- | -------------- |
| react-native-fast-image | Image caching       | NOT INSTALLED  |
| @shopify/flash-list     | Faster FlatList     | NOT INSTALLED  |
| react-native-reanimated | Smooth animations   | INSTALLED      |
| p-limit                 | Concurrency control | NOT INSTALLED  |

---

## Monitoring Recommendations

1. **Implement Performance Monitoring:**

   ```bash
   npm install @sentry/react-native
   ```

2. **Add Custom Performance Markers:**

   ```tsx
   import { PerformanceObserver, performance } from 'perf_hooks';

   performance.mark('screen-mount-start');
   // ... component logic
   performance.mark('screen-mount-end');
   performance.measure('Screen Mount', 'screen-mount-start', 'screen-mount-end');
   ```

3. **Track List Performance:**
   ```tsx
   <FlatList
     onScrollBeginDrag={() => performance.mark('scroll-start')}
     onMomentumScrollEnd={() => {
       performance.mark('scroll-end');
       performance.measure('Scroll', 'scroll-start', 'scroll-end');
     }}
   />
   ```

---

## Conclusion

The Festival mobile app has a solid foundation with good state management (Zustand), comprehensive offline support, and proper TypeScript usage. The main performance improvements should focus on:

1. **Memoization** - Add React.memo to all list item components
2. **Image Optimization** - Integrate FastImage for caching
3. **List Performance** - Add getItemLayout and tune FlatList params
4. **Navigation** - Implement lazy loading for screens

Implementing these changes is estimated to improve:

- Initial load time by 20-30%
- List scrolling FPS to consistent 60fps
- Memory usage by 15-20%
- Image loading time by 40-50%

---

_Report generated for Festival Mobile App v0.0.1_
