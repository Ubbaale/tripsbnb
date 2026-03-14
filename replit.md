# Tripsbnb - All-in-One Travel Platform (Powered by TripVerse)

## Overview
Tripsbnb is a premium travel application designed to be an all-in-one platform for booking flights, accommodations, dining, companion experiences, and safari adventures. The project aims to consolidate various travel services into a single, intuitive mobile application, providing users with a seamless planning and booking experience. The business vision is to capture a significant share of the online travel market by offering comprehensive and curated travel bundles, focusing on user experience and competitive pricing. The app is branded as "Tripsbnb" with a "Powered by TripVerse" footer on the Discover and Profile screens.

## User Preferences
I prefer detailed explanations for complex features. I want iterative development where I can review changes frequently. Ask before making any major architectural changes or decisions that might impact the core design principles, especially regarding the tile-based design system. Do not make changes to the `design_guidelines.md` file.

## System Architecture

### UI/UX Decisions
The application features a 5-tab navigation structure (Deals, BnB, Journey, Explore, Profile) with a Venmo-style raised center logo button for the Journey tab. Discover is accessible as a stack screen via the compass icon in the Deals header. Key design elements include gradient cards, hero sections, and a consistent visual theme. Each tab has its own accent color (Deals: red, BnB: green, Experiences: orange, Profile: purple). The primary color is Deep Forest Green, accent is Golden, and background is Warm Off-White. Headings use Cormorant Garamond, and body text uses Inter. All interactive elements adhere to a critical tile-based design system, including specific border radii (16px or 24px), predefined shadow properties, press animations (scale 0.96-0.98 with `react-native-reanimated`), haptic feedback on press, `ImageBackground` with `LinearGradient` overlays, verified badges, and `overflow: "hidden"` on card containers.

### Technical Implementations
- **Headers**: All screen headers use opaque backgrounds by default (`useScreenOptions` with `transparent: false`). Content starts below the header automatically — no manual `paddingTop: headerHeight` needed. ChatScreen uses `keyboardVerticalOffset={headerHeight}` for proper keyboard avoidance with opaque headers. Screens with `headerShown: false` (onboarding, age verification) use `insets.top` for safe area.
- **Frontend**: Developed with React Native (Expo) for cross-platform mobile compatibility, utilizing React Navigation.
- **Desktop Web App**: A full single-page application (SPA) served at `/app` (and `/web-app`) from the Express backend, built with vanilla HTML/CSS/JS. It uses hash-based routing and calls the same REST API endpoints as the mobile app. Features include a frosted glass navbar, responsive grid layouts, detail modals, and the full Tripsbnb brand styling. New pages include Travel Toolkit, Safety Center, and Chat.
- **Dedicated Pages**:
    - **About Us Page**: Accessible at `/about` or `/about-us`, detailing the platform's story, mission, services, values, and promises.
    - **Restaurant Partner Onboarding**: Accessible at `/partner` or `/list-your-restaurant`, featuring a 4-step form for restaurant owners to register, including venue details, location, hours, delivery options, and pricing. Submits to `POST /api/restaurants`.
    - **Restaurant Dashboard**: Accessible at `/restaurant-dashboard` for partners to manage menus and delivery orders, featuring overview stats, CRUD operations for menu items, and order status progression.
- **Backend**: An Express.js server built with TypeScript handles API requests and business logic.
- **Onboarding**: A two-phase process with intro slides and a 4-step profile setup.
- **Location Services**: Integrates `expo-location` for GPS, reverse geocoding, and location-based filtering.
- **Multi-language Support**: Supports 14 languages with auto-detection and a language selector.
- **Payment System**: Integrated with Stripe for managing all bookings, with a uniform pricing model and a 12% service fee.
- **Multi-Currency Support**: A shared `formatPrice` utility supports 40+ currencies with proper formatting. All prices are stored in cents.

### Feature Specifications
- **Discover Screen**: Hero section, quick actions, featured experiences, and destinations with a "Near Me" vs "Worldwide" filter.
- **Stays Screen (BnB)**: Features property type chips, an Airbnb-style filter modal (`StaysFilterModal`) with extensive filtering options (Property Type, Price Range, Rooms & Beds, Amenities, Booking Options, Guest Rating). Monthly Apartment Deals are prominently featured with specific pricing and filtering.
- **Car Hire**: Vehicle rental listings with search and segmented filters, including a comprehensive protection system (security deposits, insurance, GPS tracking, ID verification, damage excess, cancellation/fuel policies, late return fees). A DamageReportScreen allows detailed vehicle condition documentation.
- **Experiences Screen**: Listings for safaris, companions, and restaurants, with segment tabs.
- **Timeline Screen**: Visual chronological journey of user bookings.
- **Profile Screen**: Tile-based layout for user info, wallet, safety, and app settings.
- **Travel Toolkit** (`TravelToolkitScreen`): Includes a live currency converter, AI-powered smart packing lists, and AI-generated emergency info.
- **Destination Guide** (`DestinationGuideScreen`): AI-powered comprehensive destination guide with various insights and a "Mega Events" section for AI-discovered events with monetization tiers.
- **Event Submission** (`EventSubmissionScreen`): A 3-step organizer onboarding form for submitting events and selecting promotion tiers.
- **In-App Chat**: Messaging system with content filtering for sensitive information and vendor contact masking.

## External Dependencies

- **Stripe**: Payment processing, product/price management, and checkout sessions.
- **React Native (Expo)**: Core framework for frontend development.
- **React Navigation**: Navigation flow management.
- **Express.js**: Backend server framework.
- **i18next, react-i18next, expo-localization**: Internationalization and multi-language support.
- **react-native-reanimated**: Animations.
- **expo-haptics**: Haptic feedback.
- **expo-linear-gradient**: Gradient overlays.
- **expo-location**: Location-based services.
- **AsyncStorage**: Local data storage.
- **expo-image-picker**: Photo uploads.
- **Multer**: Handling multipart/form-data for photo uploads.