import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Restaurants table
export const restaurants = pgTable("restaurants", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  cuisineType: text("cuisine_type").notNull(),
  priceRange: text("price_range").notNull(), // $, $$, $$$, $$$$
  venueType: text("venue_type").default("restaurant"), // restaurant, club, bar, cafe, lounge, bistro, pub
  imageUrl: text("image_url"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  // Location fields - auto-detected
  address: text("address").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  // Operating hours - JSON: { "monday": { "open": "09:00", "close": "22:00", "closed": false }, ... }
  operatingHours: text("operating_hours"), // JSON string of daily hours
  // Delivery
  offersDelivery: boolean("offers_delivery").default(false),
  deliveryRadius: integer("delivery_radius"), // in km
  deliveryFee: integer("delivery_fee"), // in cents
  // Reservations & Seating
  acceptsReservations: boolean("accepts_reservations").default(false),
  seatingCapacity: integer("seating_capacity"),
  seatingArrangementUrl: text("seating_arrangement_url"), // uploaded image of seating layout
  hasVipSection: boolean("has_vip_section").default(false),
  // Pricing - vendor sets their own
  bookingPrice: integer("booking_price"), // Price in cents for a reservation/experience
  bookingCurrency: text("booking_currency").default("usd"),
  // Stripe integration - auto-created when vendor sets pricing
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  // Status
  verified: boolean("verified").default(false),
  isActive: boolean("is_active").default(true),
  // Computed ratings
  averageRating: decimal("average_rating", { precision: 2, scale: 1 }).default("0"),
  totalRatings: integer("total_ratings").default(0),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRestaurantSchema = createInsertSchema(restaurants).omit({
  id: true,
  averageRating: true,
  totalRatings: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Restaurant = typeof restaurants.$inferSelect;

// Restaurant ratings table
export const restaurantRatings = pgTable("restaurant_ratings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id),
  userId: varchar("user_id"),
  rating: integer("rating").notNull(), // 1-5 stars
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRatingSchema = createInsertSchema(restaurantRatings).omit({
  id: true,
  createdAt: true,
});

export type InsertRating = z.infer<typeof insertRatingSchema>;
export type RestaurantRating = typeof restaurantRatings.$inferSelect;

// Safaris table
export const safaris = pgTable("safaris", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  safariType: text("safari_type").notNull(), // game_drive, walking, bird_watching, night, photography
  duration: text("duration").notNull(), // e.g. "3 hours", "Full day", "3 days"
  groupSize: integer("group_size"), // max participants
  imageUrl: text("image_url"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  // Location
  address: text("address").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  // Pricing
  bookingPrice: integer("booking_price"),
  bookingCurrency: text("booking_currency").default("usd"),
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  // Status
  verified: boolean("verified").default(false),
  isActive: boolean("is_active").default(true),
  averageRating: decimal("average_rating", { precision: 2, scale: 1 }).default("0"),
  totalRatings: integer("total_ratings").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSafariSchema = createInsertSchema(safaris).omit({
  id: true,
  averageRating: true,
  totalRatings: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSafari = z.infer<typeof insertSafariSchema>;
export type Safari = typeof safaris.$inferSelect;

export const safariRatings = pgTable("safari_ratings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  safariId: varchar("safari_id").notNull().references(() => safaris.id),
  userId: varchar("user_id"),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSafariRatingSchema = createInsertSchema(safariRatings).omit({
  id: true,
  createdAt: true,
});

export type InsertSafariRating = z.infer<typeof insertSafariRatingSchema>;
export type SafariRating = typeof safariRatings.$inferSelect;

// Accommodations table
export const accommodations = pgTable("accommodations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  propertyType: text("property_type").notNull(), // house, apartment, guesthouse, hotel, villa, cabin, cottage, resort, hostel, lodge, camp, farmstay, treehouse, houseboat, castle
  amenities: text("amenities"), // comma-separated list
  roomTypes: text("room_types"), // comma-separated list
  imageUrl: text("image_url"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  // Location
  address: text("address").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  // Rooms & capacity (Airbnb-style)
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  beds: integer("beds"),
  maxGuests: integer("max_guests"),
  // Booking options (Airbnb-style)
  instantBook: boolean("instant_book").default(false),
  selfCheckIn: boolean("self_check_in").default(false),
  checkInType: text("check_in_type"), // keypad, lockbox, doorman, host
  cancellationPolicy: text("cancellation_policy").default("moderate"), // flexible, moderate, strict
  // Pricing (per night)
  bookingPrice: integer("booking_price"),
  bookingCurrency: text("booking_currency").default("usd"),
  monthlyPrice: integer("monthly_price"),
  monthlyAvailable: boolean("monthly_available").default(false),
  minimumStay: integer("minimum_stay").default(1),
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  // Status
  verified: boolean("verified").default(false),
  isActive: boolean("is_active").default(true),
  averageRating: decimal("average_rating", { precision: 2, scale: 1 }).default("0"),
  totalRatings: integer("total_ratings").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAccommodationSchema = createInsertSchema(accommodations).omit({
  id: true,
  averageRating: true,
  totalRatings: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAccommodation = z.infer<typeof insertAccommodationSchema>;
export type Accommodation = typeof accommodations.$inferSelect;

export const accommodationRatings = pgTable("accommodation_ratings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  accommodationId: varchar("accommodation_id").notNull().references(() => accommodations.id),
  userId: varchar("user_id"),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAccommodationRatingSchema = createInsertSchema(accommodationRatings).omit({
  id: true,
  createdAt: true,
});

export type InsertAccommodationRating = z.infer<typeof insertAccommodationRatingSchema>;
export type AccommodationRating = typeof accommodationRatings.$inferSelect;

// Companions table
export const companions = pgTable("companions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  serviceType: text("service_type").notNull(), // tour_guide, translator, driver, personal_assistant, travel_buddy, escort
  languages: text("languages").notNull(), // comma-separated
  specialties: text("specialties"), // comma-separated
  imageUrl: text("image_url"),
  phone: text("phone"),
  email: text("email"),
  // Dating profile fields
  gender: text("gender"), // male, female, non_binary, other
  age: integer("age"),
  bio: text("bio"),
  photos: text("photos"), // JSON array of photo URLs
  interests: text("interests"), // comma-separated
  availability: text("availability"), // available, busy, away
  responseTime: text("response_time"), // within_hour, few_hours, within_day
  // Escort-specific fields
  serviceCategories: text("service_categories"), // JSON array: dinner_date, city_tour, event_companion, social_companion, travel_partner
  serviceDescription: text("service_description"), // detailed description of services offered
  hourlyRate: integer("hourly_rate"), // price in cents per hour
  minimumHours: integer("minimum_hours"), // minimum booking duration
  isEscort: boolean("is_escort").default(false), // distinguishes escorts from other companions
  platformFeePercent: integer("platform_fee_percent").default(20), // platform commission percentage
  // Location
  city: text("city").notNull(),
  country: text("country").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  // Pricing (per session/day)
  bookingPrice: integer("booking_price"),
  bookingCurrency: text("booking_currency").default("usd"),
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  // Status
  verified: boolean("verified").default(false),
  isActive: boolean("is_active").default(true),
  averageRating: decimal("average_rating", { precision: 2, scale: 1 }).default("0"),
  totalRatings: integer("total_ratings").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCompanionSchema = createInsertSchema(companions).omit({
  id: true,
  averageRating: true,
  totalRatings: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCompanion = z.infer<typeof insertCompanionSchema>;
export type Companion = typeof companions.$inferSelect;

export const companionRatings = pgTable("companion_ratings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companionId: varchar("companion_id").notNull().references(() => companions.id),
  userId: varchar("user_id"),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCompanionRatingSchema = createInsertSchema(companionRatings).omit({
  id: true,
  createdAt: true,
});

export type InsertCompanionRating = z.infer<typeof insertCompanionRatingSchema>;
export type CompanionRating = typeof companionRatings.$inferSelect;

// Trips table - groups multiple bookings into one trip
export const trips = pgTable("trips", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  destination: text("destination"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  adults: integer("adults").default(1),
  children: integer("children").default(0),
  notes: text("notes"),
  status: text("status").default("planning"), // planning, confirmed, completed, cancelled
  totalCost: integer("total_cost").default(0), // in cents
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTripSchema = createInsertSchema(trips).omit({
  id: true,
  totalCost: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof trips.$inferSelect;

// Bookings table - individual bookings within a trip
export const bookings = pgTable("bookings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").references(() => trips.id),
  vendorType: text("vendor_type").notNull(), // restaurant, safari, accommodation, companion
  vendorId: varchar("vendor_id").notNull(),
  vendorName: text("vendor_name").notNull(),
  checkInDate: text("check_in_date"),
  checkOutDate: text("check_out_date"),
  adults: integer("adults").default(1),
  children: integer("children").default(0),
  totalGuests: integer("total_guests").default(1),
  pricePerUnit: integer("price_per_unit"), // in cents
  totalPrice: integer("total_price"), // in cents (pricePerUnit * quantity/nights * guests)
  serviceFeeAmount: integer("service_fee_amount"), // platform commission in cents
  serviceFeePercent: integer("service_fee_percent").default(12), // commission percentage
  currency: text("currency").default("usd"),
  status: text("status").default("pending"), // pending, confirmed, cancelled
  stripeSessionId: text("stripe_session_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

export const tripMemories = pgTable("trip_memories", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull().references(() => trips.id),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  location: text("location"),
  takenAt: text("taken_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTripMemorySchema = createInsertSchema(tripMemories).omit({
  id: true,
  createdAt: true,
});

export type InsertTripMemory = z.infer<typeof insertTripMemorySchema>;
export type TripMemory = typeof tripMemories.$inferSelect;

// Companion likes/connections table
export const companionLikes = pgTable("companion_likes", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companionId: varchar("companion_id").notNull().references(() => companions.id),
  likedBy: text("liked_by").notNull(), // device ID or user identifier
  status: text("status").default("liked"), // liked, passed, connected
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCompanionLikeSchema = createInsertSchema(companionLikes).omit({
  id: true,
  createdAt: true,
});

export type InsertCompanionLike = z.infer<typeof insertCompanionLikeSchema>;
export type CompanionLike = typeof companionLikes.$inferSelect;

export const companionMatches = pgTable("companion_matches", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  companionId: varchar("companion_id").notNull().references(() => companions.id),
  conversationId: varchar("conversation_id").references(() => chatConversations.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCompanionMatchSchema = createInsertSchema(companionMatches).omit({
  id: true,
  createdAt: true,
});

export type InsertCompanionMatch = z.infer<typeof insertCompanionMatchSchema>;
export type CompanionMatch = typeof companionMatches.$inferSelect;

// Flash Deals - time-limited vendor discounts
export const flashDeals = pgTable("flash_deals", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  vendorType: text("vendor_type").notNull(), // restaurant, safari, accommodation, companion
  vendorId: varchar("vendor_id").notNull(),
  vendorName: text("vendor_name").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  originalPrice: integer("original_price").notNull(), // in cents
  dealPrice: integer("deal_price").notNull(), // in cents
  currency: text("currency").default("usd"),
  discountPercent: integer("discount_percent").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  startsAt: timestamp("starts_at").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  maxRedemptions: integer("max_redemptions").default(0), // 0 = unlimited
  currentRedemptions: integer("current_redemptions").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFlashDealSchema = createInsertSchema(flashDeals).omit({
  id: true,
  currentRedemptions: true,
  createdAt: true,
});

export type InsertFlashDeal = z.infer<typeof insertFlashDealSchema>;
export type FlashDeal = typeof flashDeals.$inferSelect;

// Trip Bundles - packaged deals combining multiple vendor types
export const tripBundles = pgTable("trip_bundles", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  destination: text("destination").notNull(), // city or region
  country: text("country").notNull(),
  duration: text("duration"), // e.g. "3 nights", "5 days"
  // Pricing
  originalTotalPrice: integer("original_total_price").notNull(), // sum of individual prices in cents
  bundlePrice: integer("bundle_price").notNull(), // discounted bundle price in cents
  currency: text("currency").default("usd"),
  savingsPercent: integer("savings_percent").notNull(),
  // Bundle contents as JSON arrays of { vendorType, vendorId, vendorName, price }
  items: text("items").notNull(), // JSON array of bundle items
  // What's included summary
  includesStay: boolean("includes_stay").default(false),
  includesExperience: boolean("includes_experience").default(false),
  includesDining: boolean("includes_dining").default(false),
  includesCompanion: boolean("includes_companion").default(false),
  // Status
  maxBookings: integer("max_bookings").default(0), // 0 = unlimited
  currentBookings: integer("current_bookings").default(0),
  isActive: boolean("is_active").default(true),
  isFeatured: boolean("is_featured").default(false),
  startsAt: timestamp("starts_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTripBundleSchema = createInsertSchema(tripBundles).omit({
  id: true,
  currentBookings: true,
  createdAt: true,
});

export type InsertTripBundle = z.infer<typeof insertTripBundleSchema>;
export type TripBundle = typeof tripBundles.$inferSelect;

// Conversations table (for AI chat integrations)
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ============ IN-APP CHAT SYSTEM ============

export const chatConversations = pgTable("chat_conversations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  vendorType: text("vendor_type").notNull(),
  vendorId: varchar("vendor_id").notNull(),
  vendorName: text("vendor_name").notNull(),
  vendorImageUrl: text("vendor_image_url"),
  lastMessage: text("last_message"),
  lastMessageAt: timestamp("last_message_at"),
  unreadCount: integer("unread_count").default(0),
  hasActiveBooking: boolean("has_active_booking").default(false),
  isBlocked: boolean("is_blocked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertChatConversationSchema = createInsertSchema(chatConversations).omit({
  id: true,
  lastMessage: true,
  lastMessageAt: true,
  unreadCount: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;
export type ChatConversation = typeof chatConversations.$inferSelect;

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => chatConversations.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull(),
  senderType: text("sender_type").notNull(),
  content: text("content").notNull(),
  messageType: text("message_type").default("text"),
  isFiltered: boolean("is_filtered").default(false),
  originalContent: text("original_content"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  isFiltered: true,
  originalContent: true,
  createdAt: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// ============ PLATFORM TRANSACTIONS (Commission Tracking) ============

export const platformTransactions = pgTable("platform_transactions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id"),
  vendorType: text("vendor_type").notNull(),
  vendorId: varchar("vendor_id").notNull(),
  vendorName: text("vendor_name").notNull(),
  userId: text("user_id"),
  subtotalAmount: integer("subtotal_amount").notNull(),
  serviceFeeAmount: integer("service_fee_amount").notNull(),
  serviceFeePercent: integer("service_fee_percent").notNull(),
  totalAmount: integer("total_amount").notNull(),
  currency: text("currency").default("usd"),
  stripeSessionId: text("stripe_session_id"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPlatformTransactionSchema = createInsertSchema(platformTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertPlatformTransaction = z.infer<typeof insertPlatformTransactionSchema>;
export type PlatformTransaction = typeof platformTransactions.$inferSelect;

export const travellerProfiles = pgTable("traveller_profiles", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  deviceId: text("device_id").notNull().unique(),
  displayName: text("display_name").notNull(),
  travelStyle: text("travel_style").notNull(),
  interests: text("interests").notNull(),
  preferredDestinations: text("preferred_destinations"),
  travelFrequency: text("travel_frequency"),
  avatar: text("avatar"),
  notificationEmail: text("notification_email"),
  emailNotificationsEnabled: boolean("email_notifications_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTravellerProfileSchema = createInsertSchema(travellerProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTravellerProfile = z.infer<typeof insertTravellerProfileSchema>;
export type TravellerProfile = typeof travellerProfiles.$inferSelect;

// ============ LOYALTY REWARDS SYSTEM ============

export const loyaltyAccounts = pgTable("loyalty_accounts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  deviceId: text("device_id").notNull().unique(),
  totalPoints: integer("total_points").default(0),
  lifetimePoints: integer("lifetime_points").default(0),
  tier: text("tier").default("bronze"),
  totalBookings: integer("total_bookings").default(0),
  totalSpent: integer("total_spent").default(0),
  referralCode: text("referral_code").notNull().unique(),
  referredBy: text("referred_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLoyaltyAccountSchema = createInsertSchema(loyaltyAccounts).omit({
  id: true,
  totalPoints: true,
  lifetimePoints: true,
  tier: true,
  totalBookings: true,
  totalSpent: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLoyaltyAccount = z.infer<typeof insertLoyaltyAccountSchema>;
export type LoyaltyAccount = typeof loyaltyAccounts.$inferSelect;

export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => loyaltyAccounts.id),
  type: text("type").notNull(),
  points: integer("points").notNull(),
  description: text("description").notNull(),
  bookingId: varchar("booking_id"),
  referralCode: text("referral_code"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLoyaltyTransactionSchema = createInsertSchema(loyaltyTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertLoyaltyTransaction = z.infer<typeof insertLoyaltyTransactionSchema>;
export type LoyaltyTransaction = typeof loyaltyTransactions.$inferSelect;

// ============ PRICE NEGOTIATIONS ============

export const priceNegotiations = pgTable("price_negotiations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  deviceId: text("device_id").notNull(),
  vendorType: text("vendor_type").notNull(),
  vendorId: varchar("vendor_id").notNull(),
  vendorName: text("vendor_name").notNull(),
  originalPrice: integer("original_price").notNull(),
  currentOffer: integer("current_offer").notNull(),
  counterOffer: integer("counter_offer"),
  currency: text("currency").default("usd"),
  status: text("status").default("pending"),
  round: integer("round").default(1),
  maxRounds: integer("max_rounds").default(3),
  minOfferPercent: integer("min_offer_percent").default(70),
  buyerMessage: text("buyer_message"),
  vendorMessage: text("vendor_message"),
  expiresAt: timestamp("expires_at"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPriceNegotiationSchema = createInsertSchema(priceNegotiations).omit({
  id: true,
  counterOffer: true,
  status: true,
  round: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPriceNegotiation = z.infer<typeof insertPriceNegotiationSchema>;
export type PriceNegotiation = typeof priceNegotiations.$inferSelect;

// ============ REFERRAL PROGRAM ============

export const referralRedemptions = pgTable("referral_redemptions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  referralCode: text("referral_code").notNull(),
  referrerId: varchar("referrer_id").notNull(),
  referredDeviceId: text("referred_device_id").notNull(),
  referrerBonusPoints: integer("referrer_bonus_points").default(500),
  referredBonusPoints: integer("referred_bonus_points").default(250),
  status: text("status").default("completed"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ VENDOR WALLETS & ESCROW/PAYOUT SYSTEM ============

export const vendorWallets = pgTable("vendor_wallets", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull(),
  vendorType: text("vendor_type").notNull(),
  vendorName: text("vendor_name").notNull(),
  availableBalance: integer("available_balance").default(0),
  pendingBalance: integer("pending_balance").default(0),
  totalEarned: integer("total_earned").default(0),
  totalPaidOut: integer("total_paid_out").default(0),
  currency: text("currency").default("usd"),
  payoutEmail: text("payout_email"),
  payoutMethod: text("payout_method").default("bank_transfer"),
  bankAccountLast4: text("bank_account_last4"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertVendorWalletSchema = createInsertSchema(vendorWallets).omit({
  id: true,
  availableBalance: true,
  pendingBalance: true,
  totalEarned: true,
  totalPaidOut: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVendorWallet = z.infer<typeof insertVendorWalletSchema>;
export type VendorWallet = typeof vendorWallets.$inferSelect;

export const escrowTransactions = pgTable("escrow_transactions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").notNull(),
  vendorId: varchar("vendor_id").notNull(),
  vendorType: text("vendor_type").notNull(),
  platformTransactionId: varchar("platform_transaction_id"),
  stripeSessionId: text("stripe_session_id"),
  bookingAmount: integer("booking_amount").notNull(),
  platformFee: integer("platform_fee").notNull(),
  vendorPayout: integer("vendor_payout").notNull(),
  currency: text("currency").default("usd"),
  status: text("status").default("held"),
  releaseDate: timestamp("release_date"),
  releasedAt: timestamp("released_at"),
  userId: text("user_id"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEscrowTransactionSchema = createInsertSchema(escrowTransactions).omit({
  id: true,
  releasedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEscrowTransaction = z.infer<typeof insertEscrowTransactionSchema>;
export type EscrowTransaction = typeof escrowTransactions.$inferSelect;

export const payoutRequests = pgTable("payout_requests", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").notNull(),
  vendorId: varchar("vendor_id").notNull(),
  vendorType: text("vendor_type").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").default("usd"),
  payoutMethod: text("payout_method").default("bank_transfer"),
  payoutEmail: text("payout_email"),
  status: text("status").default("pending"),
  processedAt: timestamp("processed_at"),
  rejectedReason: text("rejected_reason"),
  transactionRef: text("transaction_ref"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPayoutRequestSchema = createInsertSchema(payoutRequests).omit({
  id: true,
  processedAt: true,
  rejectedReason: true,
  transactionRef: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPayoutRequest = z.infer<typeof insertPayoutRequestSchema>;
export type PayoutRequest = typeof payoutRequests.$inferSelect;

export const groupDiscountTiers = pgTable("group_discount_tiers", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  vendorType: text("vendor_type").notNull(),
  vendorId: varchar("vendor_id").notNull(),
  minGroupSize: integer("min_group_size").notNull(),
  maxGroupSize: integer("max_group_size").notNull(),
  discountPercent: integer("discount_percent").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGroupDiscountTierSchema = createInsertSchema(groupDiscountTiers).omit({
  id: true,
  createdAt: true,
});

export type InsertGroupDiscountTier = z.infer<typeof insertGroupDiscountTierSchema>;
export type GroupDiscountTier = typeof groupDiscountTiers.$inferSelect;

export const priceAlerts = pgTable("price_alerts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  deviceId: text("device_id").notNull(),
  vendorType: text("vendor_type").notNull(),
  vendorId: varchar("vendor_id").notNull(),
  vendorName: text("vendor_name").notNull(),
  targetPrice: integer("target_price").notNull(),
  currentPrice: integer("current_price").notNull(),
  isTriggered: boolean("is_triggered").default(false),
  isActive: boolean("is_active").default(true),
  triggeredAt: timestamp("triggered_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPriceAlertSchema = createInsertSchema(priceAlerts).omit({
  id: true,
  isTriggered: true,
  triggeredAt: true,
  createdAt: true,
});

export type InsertPriceAlert = z.infer<typeof insertPriceAlertSchema>;
export type PriceAlert = typeof priceAlerts.$inferSelect;

export const seasonalPricing = pgTable("seasonal_pricing", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  vendorType: text("vendor_type").notNull(),
  vendorId: varchar("vendor_id").notNull(),
  vendorName: text("vendor_name").notNull(),
  seasonType: text("season_type").notNull(),
  discountPercent: integer("discount_percent").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSeasonalPricingSchema = createInsertSchema(seasonalPricing).omit({
  id: true,
  createdAt: true,
});

export type InsertSeasonalPricing = z.infer<typeof insertSeasonalPricingSchema>;
export type SeasonalPricing = typeof seasonalPricing.$inferSelect;

// Car Rentals table
export const carRentals = pgTable("car_rentals", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  vehicleType: text("vehicle_type").notNull(), // sedan, suv, van, pickup, convertible, luxury, minibus
  brand: text("brand"),
  model: text("model"),
  year: integer("year"),
  seats: integer("seats").notNull(),
  transmission: text("transmission").notNull(), // automatic, manual
  fuelType: text("fuel_type").notNull(), // petrol, diesel, electric, hybrid
  features: text("features"), // comma-separated: ac, gps, bluetooth, child_seat, roof_rack, 4wd
  imageUrl: text("image_url"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  // Location
  address: text("address").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  // Pickup/Dropoff
  pickupLocations: text("pickup_locations"), // comma-separated: airport, hotel, city_center
  dropoffLocations: text("dropoff_locations"), // comma-separated
  // Pricing (per day)
  bookingPrice: integer("booking_price"),
  bookingCurrency: text("booking_currency").default("usd"),
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  // Insurance & policies
  insuranceIncluded: boolean("insurance_included").default(false),
  mileageLimit: text("mileage_limit"), // unlimited, 200km/day, etc.
  minimumAge: integer("minimum_age").default(21),
  // Security & protection
  securityDeposit: integer("security_deposit"), // in cents
  insuranceType: text("insurance_type"), // basic, comprehensive, premium
  insuranceCoverage: text("insurance_coverage"), // comma-separated: theft, accident, third_party, roadside, windscreen
  gpsTracking: boolean("gps_tracking").default(false),
  idVerificationRequired: boolean("id_verification_required").default(true),
  requiredDocuments: text("required_documents"), // comma-separated: drivers_license, passport, proof_of_address
  rentalAgreementRequired: boolean("rental_agreement_required").default(true),
  cancellationPolicy: text("cancellation_policy"), // flexible, moderate, strict
  damageExcess: integer("damage_excess"), // max renter liability in cents
  fuelPolicy: text("fuel_policy"), // full_to_full, same_to_same, prepaid
  lateReturnFee: integer("late_return_fee"), // per hour in cents
  // Status
  verified: boolean("verified").default(false),
  isActive: boolean("is_active").default(true),
  averageRating: decimal("average_rating", { precision: 2, scale: 1 }).default("0"),
  totalRatings: integer("total_ratings").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCarRentalSchema = createInsertSchema(carRentals).omit({
  id: true,
  averageRating: true,
  totalRatings: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCarRental = z.infer<typeof insertCarRentalSchema>;
export type CarRental = typeof carRentals.$inferSelect;

export const carRentalRatings = pgTable("car_rental_ratings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  carRentalId: varchar("car_rental_id").notNull().references(() => carRentals.id),
  userId: varchar("user_id"),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCarRentalRatingSchema = createInsertSchema(carRentalRatings).omit({
  id: true,
  createdAt: true,
});

export type InsertCarRentalRating = z.infer<typeof insertCarRentalRatingSchema>;
export type CarRentalRating = typeof carRentalRatings.$inferSelect;

export const rentalDamageReports = pgTable("rental_damage_reports", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  carRentalId: varchar("car_rental_id").notNull().references(() => carRentals.id),
  bookingId: varchar("booking_id"),
  deviceId: varchar("device_id"),
  reportType: text("report_type").notNull(), // pickup, return
  overallCondition: text("overall_condition").notNull(), // excellent, good, fair, poor
  exteriorNotes: text("exterior_notes"),
  interiorNotes: text("interior_notes"),
  fuelLevel: text("fuel_level"), // full, three_quarter, half, quarter, empty
  mileageReading: integer("mileage_reading"),
  photoUrls: text("photo_urls"), // comma-separated URLs
  damageLocations: text("damage_locations"), // comma-separated: front_left, front_right, rear_left, rear_right, roof, hood, trunk
  signatureData: text("signature_data"), // base64 signature
  acknowledgedAt: timestamp("acknowledged_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRentalDamageReportSchema = createInsertSchema(rentalDamageReports).omit({
  id: true,
  createdAt: true,
});

export type InsertRentalDamageReport = z.infer<typeof insertRentalDamageReportSchema>;
export type RentalDamageReport = typeof rentalDamageReports.$inferSelect;

export const rentalAgreements = pgTable("rental_agreements", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  carRentalId: varchar("car_rental_id").notNull().references(() => carRentals.id),
  bookingId: varchar("booking_id"),
  deviceId: varchar("device_id").notNull(),
  renterName: text("renter_name").notNull(),
  renterEmail: text("renter_email"),
  renterPhone: text("renter_phone"),
  licenseNumber: text("license_number").notNull(),
  licenseCountry: text("license_country").notNull(),
  pickupDate: timestamp("pickup_date").notNull(),
  returnDate: timestamp("return_date").notNull(),
  agreedTerms: boolean("agreed_terms").default(false),
  agreedInsurance: boolean("agreed_insurance").default(false),
  agreedDeposit: boolean("agreed_deposit").default(false),
  depositAmount: integer("deposit_amount"), // in cents
  signatureData: text("signature_data"), // base64 signature
  status: text("status").default("pending"), // pending, active, completed, disputed
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRentalAgreementSchema = createInsertSchema(rentalAgreements).omit({
  id: true,
  createdAt: true,
});

export type InsertRentalAgreement = z.infer<typeof insertRentalAgreementSchema>;
export type RentalAgreement = typeof rentalAgreements.$inferSelect;

// Destination Events table - for mega events, festivals, concerts at travel destinations
export const destinationEvents = pgTable("destination_events", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  eventType: text("event_type").notNull(), // festival, concert, sports, cultural, exhibition, conference, carnival, food_festival
  imageUrl: text("image_url"),
  // Location
  destination: text("destination").notNull(), // city name
  country: text("country").notNull(),
  venue: text("venue"),
  // Timing
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  // Pricing for attendees
  ticketPrice: integer("ticket_price"), // in cents, null = free event
  ticketCurrency: text("ticket_currency").default("usd"),
  ticketUrl: text("ticket_url"), // external link to buy tickets
  // Advertising / promotion
  isPromoted: boolean("is_promoted").default(false), // paid promotion by organizer
  promotionTier: text("promotion_tier").default("standard"), // standard, featured, premium
  promotionPrice: integer("promotion_price"), // what organizer paid in cents
  organizerName: text("organizer_name"),
  organizerEmail: text("organizer_email"),
  organizerPhone: text("organizer_phone"),
  // Traveler paywall
  isPremiumContent: boolean("is_premium_content").default(false), // if true, traveler pays to see full details
  // Status
  isActive: boolean("is_active").default(true),
  verified: boolean("verified").default(false),
  viewCount: integer("view_count").default(0),
  // Stripe integration for organizer ads
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDestinationEventSchema = createInsertSchema(destinationEvents).omit({
  id: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDestinationEvent = z.infer<typeof insertDestinationEventSchema>;
export type DestinationEvent = typeof destinationEvents.$inferSelect;

export const safetyReports = pgTable("safety_reports", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  deviceId: varchar("device_id").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  location: text("location"),
  vendorId: varchar("vendor_id"),
  vendorType: text("vendor_type"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSafetyReportSchema = createInsertSchema(safetyReports).omit({
  id: true,
  status: true,
  createdAt: true,
});

export type InsertSafetyReport = z.infer<typeof insertSafetyReportSchema>;
export type SafetyReport = typeof safetyReports.$inferSelect;

export const menuItems = pgTable("menu_items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  currency: text("currency").default("usd"),
  category: text("category").notNull().default("main"),
  imageUrl: text("image_url"),
  isAvailable: boolean("is_available").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
  createdAt: true,
});

export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItems.$inferSelect;

export const deliveryOrders = pgTable("delivery_orders", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  orderType: text("order_type").notNull().default("delivery"),
  deliveryAddress: text("delivery_address"),
  deliveryCity: text("delivery_city"),
  deliveryNotes: text("delivery_notes"),
  status: text("status").notNull().default("pending"),
  subtotalAmount: integer("subtotal_amount").notNull(),
  deliveryFeeAmount: integer("delivery_fee_amount").default(0),
  serviceFeeAmount: integer("service_fee_amount").notNull(),
  totalAmount: integer("total_amount").notNull(),
  currency: text("currency").default("usd"),
  stripeSessionId: text("stripe_session_id"),
  estimatedDeliveryTime: text("estimated_delivery_time"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDeliveryOrderSchema = createInsertSchema(deliveryOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDeliveryOrder = z.infer<typeof insertDeliveryOrderSchema>;
export type DeliveryOrder = typeof deliveryOrders.$inferSelect;

export const deliveryOrderItems = pgTable("delivery_order_items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(),
  menuItemId: varchar("menu_item_id").notNull(),
  itemName: text("item_name").notNull(),
  itemPrice: integer("item_price").notNull(),
  quantity: integer("quantity").notNull().default(1),
  specialInstructions: text("special_instructions"),
});

export const insertDeliveryOrderItemSchema = createInsertSchema(deliveryOrderItems).omit({
  id: true,
});

export type InsertDeliveryOrderItem = z.infer<typeof insertDeliveryOrderItemSchema>;
export type DeliveryOrderItem = typeof deliveryOrderItems.$inferSelect;
