# TripVerse Design Guidelines

## Brand Identity

**Purpose**: TripVerse is a premium all-in-one travel platform combining flights, accommodations, dining, companions, and safari experiences with industry-leading trust and safety.

**Aesthetic Direction**: Luxurious/Editorial — Sophisticated traveler aesthetic with premium materials, refined typography, and restrained elegance. Think Condé Nast Traveler meets modern fintech trust. The app feels EXPENSIVE and SAFE, not playful or casual.

**Memorable Element**: The unified travel timeline — a visual journey that connects all bookings (flight → stay → safari → dining) in one elegant chronological view. This is the hero feature that no competitor has.

## Navigation Architecture

**Root Navigation**: Tab Bar (5 tabs)
- Discover (Home with personalized travel cards)
- Stays (Accommodation marketplace)
- Experiences (Safaris, companions, dining combined)
- Timeline (Unified travel itinerary - CENTER TAB)
- Profile (Account, wallet, safety)

**Modal Screens**: Booking flows, chat interfaces, ID verification, payments

## Screen-by-Screen Specifications

### 1. Discover (Home)
**Purpose**: Personalized travel discovery dashboard
**Layout**:
- Header: Transparent, location indicator left, notification bell right
- Main: Scrollable with hero search card + category cards (Stays, Companions, Safaris, Dining)
- Safe Area: Top inset = headerHeight + Spacing.xl, Bottom = tabBarHeight + Spacing.xl

### 2. Stays
**Purpose**: Browse and book accommodations
**Layout**:
- Header: Search bar, map/list toggle right
- Main: Scrollable list of property cards with smart pricing badge
- Floating: Filter button (bottom-right with subtle shadow)
- Safe Area: Top = headerHeight + Spacing.xl, Bottom = tabBarHeight + Spacing.xl
- Empty State: "No stays yet" with empty-stays.png illustration

### 3. Experiences
**Purpose**: Book safaris, companions, and dining in one place
**Layout**:
- Header: Segmented control (Safaris | Companions | Dining)
- Main: Scrollable grid/list depending on segment
- Safe Area: Top = headerHeight + Spacing.xl, Bottom = tabBarHeight + Spacing.xl
- Empty State: Different per segment (empty-safaris.png, empty-companions.png, empty-dining.png)

### 4. Timeline (Center Tab)
**Purpose**: Visual journey of all upcoming bookings
**Layout**:
- Header: Transparent, "Your Journey" title
- Main: Scrollable vertical timeline with connected booking cards
- Safe Area: Top = headerHeight + Spacing.xl, Bottom = tabBarHeight + Spacing.xl
- Empty State: "Start planning" with empty-timeline.png

### 5. Profile
**Purpose**: Account management, wallet, safety controls
**Layout**:
- Header: None
- Main: Scrollable with avatar at top, sections for Wallet, Safety, Settings
- Safe Area: Top = insets.top + Spacing.xl, Bottom = tabBarHeight + Spacing.xl

### 6. Chat (Modal)
**Purpose**: In-app messaging for bookings
**Layout**:
- Header: Back button left, contact name, video call right
- Main: Message list
- Footer: Input with send button
- Safe Area: Standard modal insets

### 7. Booking Detail (Modal)
**Purpose**: Complete booking with escrow payment
**Layout**:
- Header: Close button left, booking type title
- Main: Scrollable form
- Footer: Price summary + "Confirm & Pay" button
- Safe Area: Standard modal insets

## Color Palette

**Primary**: #1A4D2E (Deep Forest Green - trust, adventure, premium)
**Accent**: #DAA520 (Golden - premium, verified badges)
**Background**: #FAFAF8 (Warm Off-White)
**Surface**: #FFFFFF
**Text Primary**: #1C1C1E
**Text Secondary**: #6E6E73
**Success**: #34C759
**Error**: #FF3B30
**Warning**: #FF9500

**Semantic Colors**:
- Verified Badge: Golden
- Safety Alert: Error with 10% opacity background
- Escrow Protected: Primary with checkmark

## Typography

**Primary Font**: Cormorant Garamond (serif, editorial luxury for headings)
**Secondary Font**: Inter (sans-serif, legible for body text)

**Type Scale**:
- Hero: Cormorant 32pt Bold
- H1: Cormorant 28pt SemiBold
- H2: Cormorant 22pt Medium
- Body: Inter 16pt Regular
- Caption: Inter 13pt Regular
- Label: Inter 14pt Medium

## Visual Design

- Use Feather icons for all UI elements
- Verified badges always include gold checkmark icon
- Floating action buttons use shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.10, shadowRadius: 2
- Safety button is always red circular icon (top-right or floating)
- All touchable items show 90% opacity on press

## CRITICAL: Tile-Based Card Design (MUST FOLLOW)

**All image-based cards MUST use this tile design pattern:**

### Required Tile Styling:
```
borderRadius: BorderRadius.lg (16px) or BorderRadius.xl (24px)
overflow: "hidden"
shadowColor: "#000"
shadowOffset: { width: 0, height: 4 }
shadowOpacity: 0.15
shadowRadius: 12
elevation: 8
```

### Required Interactions:
- **Press animation**: Scale to 0.96-0.98 on press using react-native-reanimated
- **Haptic feedback**: Haptics.impactAsync(ImpactFeedbackStyle.Light) on press
- **Spring animation**: withSpring(scale, { damping: 15, stiffness: 300 })

### Required Image Styling:
- Use ImageBackground with LinearGradient overlay
- Gradient: ["transparent", "rgba(0,0,0,0.5-0.7)"] for text readability
- Image must fill the tile completely with resizeMode: "cover"

### Card Types:

**DestinationCard** (image tile with overlay text):
- Full image background with gradient overlay
- Rating badge top-right with star icon
- Name and location at bottom
- Price in golden accent color
- BorderRadius.lg, shadows, scale 0.96 press

**ExperienceCard** (image + content tile):
- Image section top half with gradient
- White content section bottom half
- Category badge with gradient colors
- Verified badge with golden background
- BorderRadius.xl, Shadows.card, scale 0.98 press

**FeaturedCard** (hero image tile):
- Full-width image with gradient
- Badge top-left
- Title and subtitle bottom
- BorderRadius.xl, full shadows

**PropertyCard** (stays listing tile):
- Image left, content right (horizontal layout)
- Verified badge if applicable
- Rating, reviews, price display
- BorderRadius.lg, Shadows.card, scale 0.98 press

### DO NOT:
- Remove shadows from cards
- Remove press animations
- Use flat designs without gradients on images
- Use border instead of shadow for elevation
- Remove haptic feedback
- Use opacity instead of scale for press states

## Assets to Generate

**Required**:
1. **icon.png** - App icon with stylized compass/globe in Deep Forest Green and Golden accent
2. **splash-icon.png** - Same as icon for launch screen
3. **empty-stays.png** - Minimal line illustration of elegant room with armchair, WHERE USED: Stays screen empty state
4. **empty-safaris.png** - Safari vehicle outline under acacia tree, WHERE USED: Experiences > Safaris empty state
5. **empty-companions.png** - Two abstract figures in conversation, WHERE USED: Experiences > Companions empty state
6. **empty-dining.png** - Table setting outline, WHERE USED: Experiences > Dining empty state
7. **empty-timeline.png** - Connected dots path illustration, WHERE USED: Timeline screen empty state
8. **user-avatar-preset.png** - Neutral silhouette in circle, WHERE USED: Profile screen default avatar

**Optional**:
9. **onboarding-safety.png** - Shield with checkmark, WHERE USED: Onboarding screen
10. **verification-success.png** - ID card with checkmark, WHERE USED: ID verification success

All illustrations should be: line art style, 2-color max (Primary + Accent), 600x600px, transparent background.