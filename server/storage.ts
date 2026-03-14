import { eq, desc, sql, and, ilike, ne, gte, lte } from "drizzle-orm";
import { db } from "./db";
import {
  type User,
  type InsertUser,
  type Restaurant,
  type InsertRestaurant,
  type RestaurantRating,
  type InsertRating,
  type Safari,
  type InsertSafari,
  type SafariRating,
  type InsertSafariRating,
  type Accommodation,
  type InsertAccommodation,
  type AccommodationRating,
  type InsertAccommodationRating,
  type Companion,
  type InsertCompanion,
  type CompanionRating,
  type InsertCompanionRating,
  type CompanionLike,
  type InsertCompanionLike,
  type CarRental,
  type InsertCarRental,
  type CarRentalRating,
  type InsertCarRentalRating,
  type Trip,
  type InsertTrip,
  type Booking,
  type InsertBooking,
  type TripMemory,
  type InsertTripMemory,
  type FlashDeal,
  type InsertFlashDeal,
  type TripBundle,
  type InsertTripBundle,
  type ChatConversation,
  type InsertChatConversation,
  type ChatMessage,
  type InsertChatMessage,
  type PlatformTransaction,
  type InsertPlatformTransaction,
  type TravellerProfile,
  type InsertTravellerProfile,
  type VendorWallet,
  type InsertVendorWallet,
  type EscrowTransaction,
  type InsertEscrowTransaction,
  type PayoutRequest,
  type InsertPayoutRequest,
  type GroupDiscountTier,
  type InsertGroupDiscountTier,
  type PriceAlert,
  type InsertPriceAlert,
  type SeasonalPricing,
  type InsertSeasonalPricing,
  type RentalDamageReport,
  type InsertRentalDamageReport,
  type RentalAgreement,
  type InsertRentalAgreement,
  type SafetyReport,
  type InsertSafetyReport,
  type MenuItem,
  type InsertMenuItem,
  type DeliveryOrder,
  type InsertDeliveryOrder,
  type DeliveryOrderItem,
  type InsertDeliveryOrderItem,
  users,
  restaurants,
  restaurantRatings,
  safaris,
  safariRatings,
  accommodations,
  accommodationRatings,
  companions,
  companionRatings,
  companionLikes,
  companionMatches,
  type CompanionMatch,
  type InsertCompanionMatch,
  carRentals,
  carRentalRatings,
  trips,
  bookings,
  tripMemories,
  flashDeals,
  tripBundles,
  chatConversations,
  chatMessages,
  platformTransactions,
  travellerProfiles,
  vendorWallets,
  escrowTransactions,
  payoutRequests,
  groupDiscountTiers,
  priceAlerts,
  seasonalPricing,
  rentalDamageReports,
  rentalAgreements,
  safetyReports,
  menuItems,
  deliveryOrders,
  deliveryOrderItems,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Restaurants
  getRestaurants(filters?: {
    country?: string;
    city?: string;
    cuisineType?: string;
    verified?: boolean;
  }): Promise<Restaurant[]>;
  getRestaurantById(id: string): Promise<Restaurant | undefined>;
  getRestaurantsByCountry(country: string): Promise<Restaurant[]>;
  getRestaurantsByCity(city: string): Promise<Restaurant[]>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  updateRestaurant(id: string, data: Partial<InsertRestaurant>): Promise<Restaurant | undefined>;
  
  // Ratings
  getRatingsByRestaurant(restaurantId: string): Promise<RestaurantRating[]>;
  createRating(rating: InsertRating): Promise<RestaurantRating>;
  updateRestaurantRating(restaurantId: string): Promise<void>;
  
  // Safaris
  getSafaris(filters?: { country?: string; city?: string; safariType?: string; verified?: boolean }): Promise<Safari[]>;
  getSafariById(id: string): Promise<Safari | undefined>;
  createSafari(safari: InsertSafari): Promise<Safari>;
  updateSafari(id: string, data: Partial<InsertSafari>): Promise<Safari | undefined>;
  getSafariRatings(safariId: string): Promise<SafariRating[]>;
  createSafariRating(rating: InsertSafariRating): Promise<SafariRating>;

  // Accommodations
  getAccommodations(filters?: { country?: string; city?: string; propertyType?: string; verified?: boolean }): Promise<Accommodation[]>;
  getAccommodationById(id: string): Promise<Accommodation | undefined>;
  createAccommodation(accommodation: InsertAccommodation): Promise<Accommodation>;
  updateAccommodation(id: string, data: Partial<InsertAccommodation>): Promise<Accommodation | undefined>;
  getAccommodationRatings(accommodationId: string): Promise<AccommodationRating[]>;
  createAccommodationRating(rating: InsertAccommodationRating): Promise<AccommodationRating>;

  // Companions
  getCompanions(filters?: { country?: string; city?: string; serviceType?: string; verified?: boolean }): Promise<Companion[]>;
  getCompanionById(id: string): Promise<Companion | undefined>;
  createCompanion(companion: InsertCompanion): Promise<Companion>;
  updateCompanion(id: string, data: Partial<InsertCompanion>): Promise<Companion | undefined>;
  getCompanionRatings(companionId: string): Promise<CompanionRating[]>;
  createCompanionRating(rating: InsertCompanionRating): Promise<CompanionRating>;

  // Car Rentals
  getCarRentals(filters?: { country?: string; city?: string; vehicleType?: string; transmission?: string; fuelType?: string; verified?: boolean }): Promise<CarRental[]>;
  getCarRentalById(id: string): Promise<CarRental | undefined>;
  createCarRental(carRental: InsertCarRental): Promise<CarRental>;
  updateCarRental(id: string, data: Partial<InsertCarRental>): Promise<CarRental | undefined>;
  getCarRentalRatings(carRentalId: string): Promise<CarRentalRating[]>;
  createCarRentalRating(rating: InsertCarRentalRating): Promise<CarRentalRating>;

  // Rental damage reports
  getDamageReports(carRentalId: string, bookingId?: string): Promise<RentalDamageReport[]>;
  createDamageReport(report: InsertRentalDamageReport): Promise<RentalDamageReport>;

  // Rental agreements
  getRentalAgreement(carRentalId: string, deviceId: string, bookingId?: string): Promise<RentalAgreement | undefined>;
  getRentalAgreements(carRentalId: string): Promise<RentalAgreement[]>;
  createRentalAgreement(agreement: InsertRentalAgreement): Promise<RentalAgreement>;
  updateRentalAgreement(id: string, data: Partial<InsertRentalAgreement>): Promise<RentalAgreement | undefined>;

  // Location helpers
  getCountries(): Promise<string[]>;
  getCitiesByCountry(country: string): Promise<string[]>;

  // Trips
  getTrips(): Promise<Trip[]>;
  getTripById(id: string): Promise<Trip | undefined>;
  createTrip(trip: InsertTrip): Promise<Trip>;
  updateTrip(id: string, data: Partial<InsertTrip>): Promise<Trip | undefined>;
  deleteTrip(id: string): Promise<void>;

  // Bookings
  getBookings(tripId?: string): Promise<Booking[]>;
  getBookingById(id: string): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, data: Partial<InsertBooking>): Promise<Booking | undefined>;
  deleteBooking(id: string): Promise<void>;

  // Trip Memories
  getTripMemories(tripId: string): Promise<TripMemory[]>;
  getTripMemoryById(id: string): Promise<TripMemory | undefined>;
  createTripMemory(memory: InsertTripMemory): Promise<TripMemory>;
  updateTripMemory(id: string, data: Partial<InsertTripMemory>): Promise<TripMemory | undefined>;
  deleteTripMemory(id: string): Promise<void>;

  // Companion Likes & Matches
  getCompanionLikes(likedBy: string): Promise<CompanionLike[]>;
  createCompanionLike(like: InsertCompanionLike): Promise<CompanionLike>;
  getCompanionLikeByCompanionAndUser(companionId: string, likedBy: string): Promise<CompanionLike | undefined>;
  getDiscoverCompanions(filters?: { city?: string; country?: string; gender?: string; serviceType?: string; lat?: number; lng?: number; radiusKm?: number }): Promise<Companion[]>;
  getCompanionMatches(userId: string): Promise<CompanionMatch[]>;
  createCompanionMatch(match: InsertCompanionMatch): Promise<CompanionMatch>;
  getCompanionMatchByUserAndCompanion(userId: string, companionId: string): Promise<CompanionMatch | undefined>;

  // Flash Deals
  getFlashDeals(filters?: { country?: string; city?: string; vendorType?: string; activeOnly?: boolean }): Promise<FlashDeal[]>;
  getFlashDealById(id: string): Promise<FlashDeal | undefined>;
  createFlashDeal(deal: InsertFlashDeal): Promise<FlashDeal>;
  updateFlashDeal(id: string, data: Partial<InsertFlashDeal>): Promise<FlashDeal | undefined>;
  incrementDealRedemption(id: string): Promise<void>;

  // Trip Bundles
  getTripBundles(filters?: { country?: string; destination?: string; featured?: boolean; activeOnly?: boolean }): Promise<TripBundle[]>;
  getTripBundleById(id: string): Promise<TripBundle | undefined>;
  createTripBundle(bundle: InsertTripBundle): Promise<TripBundle>;
  updateTripBundle(id: string, data: Partial<InsertTripBundle>): Promise<TripBundle | undefined>;
  incrementBundleBooking(id: string): Promise<void>;

  // Chat Conversations
  getChatConversations(userId: string): Promise<ChatConversation[]>;
  getChatConversationById(id: string): Promise<ChatConversation | undefined>;
  getChatConversationByVendor(userId: string, vendorType: string, vendorId: string): Promise<ChatConversation | undefined>;
  createChatConversation(conv: InsertChatConversation): Promise<ChatConversation>;
  updateChatConversation(id: string, data: Partial<ChatConversation>): Promise<ChatConversation | undefined>;

  // Chat Messages
  getChatMessages(conversationId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // Platform Transactions
  createPlatformTransaction(tx: InsertPlatformTransaction): Promise<PlatformTransaction>;
  getPlatformTransactions(filters?: { vendorType?: string; userId?: string }): Promise<PlatformTransaction[]>;

  getTravellerProfile(deviceId: string): Promise<TravellerProfile | undefined>;
  createTravellerProfile(profile: InsertTravellerProfile): Promise<TravellerProfile>;
  updateTravellerProfile(deviceId: string, data: Partial<InsertTravellerProfile>): Promise<TravellerProfile | undefined>;

  getVendorWallet(vendorId: string, vendorType: string): Promise<VendorWallet | undefined>;
  getVendorWalletById(id: string): Promise<VendorWallet | undefined>;
  createVendorWallet(wallet: InsertVendorWallet): Promise<VendorWallet>;
  updateVendorWallet(id: string, data: Partial<Omit<VendorWallet, "id">>): Promise<VendorWallet | undefined>;

  getEscrowTransactions(vendorId: string, vendorType: string): Promise<EscrowTransaction[]>;
  getEscrowTransactionById(id: string): Promise<EscrowTransaction | undefined>;
  createEscrowTransaction(tx: InsertEscrowTransaction): Promise<EscrowTransaction>;
  updateEscrowTransaction(id: string, data: Partial<Omit<EscrowTransaction, "id">>): Promise<EscrowTransaction | undefined>;

  getPayoutRequests(vendorId: string, vendorType: string): Promise<PayoutRequest[]>;
  getPayoutRequestById(id: string): Promise<PayoutRequest | undefined>;
  createPayoutRequest(req: InsertPayoutRequest): Promise<PayoutRequest>;
  updatePayoutRequest(id: string, data: Partial<Omit<PayoutRequest, "id">>): Promise<PayoutRequest | undefined>;

  createSafetyReport(report: InsertSafetyReport): Promise<SafetyReport>;
  getSafetyReports(deviceId: string): Promise<SafetyReport[]>;

  getMenuItems(restaurantId: string): Promise<MenuItem[]>;
  getMenuItemById(id: string): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: string, data: Partial<InsertMenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: string): Promise<void>;

  getDeliveryOrders(filters?: { restaurantId?: string; status?: string }): Promise<DeliveryOrder[]>;
  getDeliveryOrderById(id: string): Promise<DeliveryOrder | undefined>;
  createDeliveryOrder(order: InsertDeliveryOrder): Promise<DeliveryOrder>;
  updateDeliveryOrderStatus(id: string, status: string): Promise<DeliveryOrder | undefined>;
  createDeliveryOrderItems(items: InsertDeliveryOrderItem[]): Promise<DeliveryOrderItem[]>;
  getDeliveryOrderItems(orderId: string): Promise<DeliveryOrderItem[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Restaurants
  async getRestaurants(filters?: {
    country?: string;
    city?: string;
    cuisineType?: string;
    verified?: boolean;
  }): Promise<Restaurant[]> {
    let query = db.select().from(restaurants).where(eq(restaurants.isActive, true));
    
    const conditions = [eq(restaurants.isActive, true)];
    
    if (filters?.country) {
      conditions.push(ilike(restaurants.country, filters.country));
    }
    if (filters?.city) {
      conditions.push(ilike(restaurants.city, filters.city));
    }
    if (filters?.cuisineType) {
      conditions.push(ilike(restaurants.cuisineType, filters.cuisineType));
    }
    if (filters?.verified !== undefined) {
      conditions.push(eq(restaurants.verified, filters.verified));
    }
    
    const result = await db
      .select()
      .from(restaurants)
      .where(and(...conditions))
      .orderBy(desc(restaurants.averageRating));
    
    return result;
  }

  async getRestaurantById(id: string): Promise<Restaurant | undefined> {
    const result = await db.select().from(restaurants).where(eq(restaurants.id, id));
    return result[0];
  }

  async getRestaurantsByCountry(country: string): Promise<Restaurant[]> {
    return this.getRestaurants({ country });
  }

  async getRestaurantsByCity(city: string): Promise<Restaurant[]> {
    return this.getRestaurants({ city });
  }

  async createRestaurant(insertRestaurant: InsertRestaurant): Promise<Restaurant> {
    const result = await db.insert(restaurants).values(insertRestaurant).returning();
    return result[0];
  }

  async updateRestaurant(id: string, data: Partial<InsertRestaurant>): Promise<Restaurant | undefined> {
    const result = await db
      .update(restaurants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(restaurants.id, id))
      .returning();
    return result[0];
  }

  // Ratings
  async getRatingsByRestaurant(restaurantId: string): Promise<RestaurantRating[]> {
    return db
      .select()
      .from(restaurantRatings)
      .where(eq(restaurantRatings.restaurantId, restaurantId))
      .orderBy(desc(restaurantRatings.createdAt));
  }

  async createRating(insertRating: InsertRating): Promise<RestaurantRating> {
    const result = await db.insert(restaurantRatings).values(insertRating).returning();
    
    // Update restaurant average rating
    await this.updateRestaurantRating(insertRating.restaurantId);
    
    return result[0];
  }

  async updateRestaurantRating(restaurantId: string): Promise<void> {
    const ratings = await this.getRatingsByRestaurant(restaurantId);
    
    if (ratings.length === 0) return;
    
    const totalRatings = ratings.length;
    const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings;
    
    await db
      .update(restaurants)
      .set({
        averageRating: averageRating.toFixed(1),
        totalRatings,
        updatedAt: new Date(),
      })
      .where(eq(restaurants.id, restaurantId));
  }

  // Location helpers
  async getCountries(): Promise<string[]> {
    const result = await db
      .selectDistinct({ country: restaurants.country })
      .from(restaurants)
      .where(eq(restaurants.isActive, true))
      .orderBy(restaurants.country);
    
    return result.map(r => r.country);
  }

  async getCitiesByCountry(country: string): Promise<string[]> {
    const result = await db
      .selectDistinct({ city: restaurants.city })
      .from(restaurants)
      .where(and(
        eq(restaurants.isActive, true),
        ilike(restaurants.country, country)
      ))
      .orderBy(restaurants.city);
    
    return result.map(r => r.city);
  }

  // Safaris
  async getSafaris(filters?: { country?: string; city?: string; safariType?: string; verified?: boolean }): Promise<Safari[]> {
    const conditions = [eq(safaris.isActive, true)];
    if (filters?.country) conditions.push(ilike(safaris.country, filters.country));
    if (filters?.city) conditions.push(ilike(safaris.city, filters.city));
    if (filters?.safariType) conditions.push(ilike(safaris.safariType, filters.safariType));
    if (filters?.verified !== undefined) conditions.push(eq(safaris.verified, filters.verified));
    return db.select().from(safaris).where(and(...conditions)).orderBy(desc(safaris.averageRating));
  }

  async getSafariById(id: string): Promise<Safari | undefined> {
    const result = await db.select().from(safaris).where(eq(safaris.id, id));
    return result[0];
  }

  async createSafari(data: InsertSafari): Promise<Safari> {
    const result = await db.insert(safaris).values(data).returning();
    return result[0];
  }

  async updateSafari(id: string, data: Partial<InsertSafari>): Promise<Safari | undefined> {
    const result = await db.update(safaris).set({ ...data, updatedAt: new Date() }).where(eq(safaris.id, id)).returning();
    return result[0];
  }

  async getSafariRatings(safariId: string): Promise<SafariRating[]> {
    return db.select().from(safariRatings).where(eq(safariRatings.safariId, safariId)).orderBy(desc(safariRatings.createdAt));
  }

  async createSafariRating(data: InsertSafariRating): Promise<SafariRating> {
    const result = await db.insert(safariRatings).values(data).returning();
    const ratings = await this.getSafariRatings(data.safariId);
    if (ratings.length > 0) {
      const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
      await db.update(safaris).set({ averageRating: avg.toFixed(1), totalRatings: ratings.length, updatedAt: new Date() }).where(eq(safaris.id, data.safariId));
    }
    return result[0];
  }

  // Accommodations
  async getAccommodations(filters?: { country?: string; city?: string; propertyType?: string; verified?: boolean }): Promise<Accommodation[]> {
    const conditions = [eq(accommodations.isActive, true)];
    if (filters?.country) conditions.push(ilike(accommodations.country, filters.country));
    if (filters?.city) conditions.push(ilike(accommodations.city, filters.city));
    if (filters?.propertyType) conditions.push(ilike(accommodations.propertyType, filters.propertyType));
    if (filters?.verified !== undefined) conditions.push(eq(accommodations.verified, filters.verified));
    return db.select().from(accommodations).where(and(...conditions)).orderBy(desc(accommodations.averageRating));
  }

  async getAccommodationById(id: string): Promise<Accommodation | undefined> {
    const result = await db.select().from(accommodations).where(eq(accommodations.id, id));
    return result[0];
  }

  async createAccommodation(data: InsertAccommodation): Promise<Accommodation> {
    const result = await db.insert(accommodations).values(data).returning();
    return result[0];
  }

  async updateAccommodation(id: string, data: Partial<InsertAccommodation>): Promise<Accommodation | undefined> {
    const result = await db.update(accommodations).set({ ...data, updatedAt: new Date() }).where(eq(accommodations.id, id)).returning();
    return result[0];
  }

  async getAccommodationRatings(accommodationId: string): Promise<AccommodationRating[]> {
    return db.select().from(accommodationRatings).where(eq(accommodationRatings.accommodationId, accommodationId)).orderBy(desc(accommodationRatings.createdAt));
  }

  async createAccommodationRating(data: InsertAccommodationRating): Promise<AccommodationRating> {
    const result = await db.insert(accommodationRatings).values(data).returning();
    const ratings = await this.getAccommodationRatings(data.accommodationId);
    if (ratings.length > 0) {
      const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
      await db.update(accommodations).set({ averageRating: avg.toFixed(1), totalRatings: ratings.length, updatedAt: new Date() }).where(eq(accommodations.id, data.accommodationId));
    }
    return result[0];
  }

  // Companions
  async getCompanions(filters?: { country?: string; city?: string; serviceType?: string; verified?: boolean }): Promise<Companion[]> {
    const conditions = [eq(companions.isActive, true)];
    if (filters?.country) conditions.push(ilike(companions.country, filters.country));
    if (filters?.city) conditions.push(ilike(companions.city, filters.city));
    if (filters?.serviceType) conditions.push(ilike(companions.serviceType, filters.serviceType));
    if (filters?.verified !== undefined) conditions.push(eq(companions.verified, filters.verified));
    return db.select().from(companions).where(and(...conditions)).orderBy(desc(companions.averageRating));
  }

  async getCompanionById(id: string): Promise<Companion | undefined> {
    const result = await db.select().from(companions).where(eq(companions.id, id));
    return result[0];
  }

  async createCompanion(data: InsertCompanion): Promise<Companion> {
    const result = await db.insert(companions).values(data).returning();
    return result[0];
  }

  async updateCompanion(id: string, data: Partial<InsertCompanion>): Promise<Companion | undefined> {
    const result = await db.update(companions).set({ ...data, updatedAt: new Date() }).where(eq(companions.id, id)).returning();
    return result[0];
  }

  async getCompanionRatings(companionId: string): Promise<CompanionRating[]> {
    return db.select().from(companionRatings).where(eq(companionRatings.companionId, companionId)).orderBy(desc(companionRatings.createdAt));
  }

  async createCompanionRating(data: InsertCompanionRating): Promise<CompanionRating> {
    const result = await db.insert(companionRatings).values(data).returning();
    const ratings = await this.getCompanionRatings(data.companionId);
    if (ratings.length > 0) {
      const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
      await db.update(companions).set({ averageRating: avg.toFixed(1), totalRatings: ratings.length, updatedAt: new Date() }).where(eq(companions.id, data.companionId));
    }
    return result[0];
  }

  // Car Rentals
  async getCarRentals(filters?: { country?: string; city?: string; vehicleType?: string; transmission?: string; fuelType?: string; verified?: boolean }): Promise<CarRental[]> {
    const conditions = [eq(carRentals.isActive, true)];
    if (filters?.country) conditions.push(ilike(carRentals.country, filters.country));
    if (filters?.city) conditions.push(ilike(carRentals.city, filters.city));
    if (filters?.vehicleType) conditions.push(ilike(carRentals.vehicleType, filters.vehicleType));
    if (filters?.transmission) conditions.push(ilike(carRentals.transmission, filters.transmission));
    if (filters?.fuelType) conditions.push(ilike(carRentals.fuelType, filters.fuelType));
    if (filters?.verified !== undefined) conditions.push(eq(carRentals.verified, filters.verified));
    return db.select().from(carRentals).where(and(...conditions)).orderBy(desc(carRentals.averageRating));
  }

  async getCarRentalById(id: string): Promise<CarRental | undefined> {
    const result = await db.select().from(carRentals).where(eq(carRentals.id, id));
    return result[0];
  }

  async createCarRental(data: InsertCarRental): Promise<CarRental> {
    const result = await db.insert(carRentals).values(data).returning();
    return result[0];
  }

  async updateCarRental(id: string, data: Partial<InsertCarRental>): Promise<CarRental | undefined> {
    const result = await db.update(carRentals).set({ ...data, updatedAt: new Date() }).where(eq(carRentals.id, id)).returning();
    return result[0];
  }

  async getCarRentalRatings(carRentalId: string): Promise<CarRentalRating[]> {
    return db.select().from(carRentalRatings).where(eq(carRentalRatings.carRentalId, carRentalId)).orderBy(desc(carRentalRatings.createdAt));
  }

  async createCarRentalRating(data: InsertCarRentalRating): Promise<CarRentalRating> {
    const result = await db.insert(carRentalRatings).values(data).returning();
    const ratings = await this.getCarRentalRatings(data.carRentalId);
    if (ratings.length > 0) {
      const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
      await db.update(carRentals).set({ averageRating: avg.toFixed(1), totalRatings: ratings.length, updatedAt: new Date() }).where(eq(carRentals.id, data.carRentalId));
    }
    return result[0];
  }

  // Rental damage reports
  async getDamageReports(carRentalId: string, bookingId?: string): Promise<RentalDamageReport[]> {
    const conditions = [eq(rentalDamageReports.carRentalId, carRentalId)];
    if (bookingId) conditions.push(eq(rentalDamageReports.bookingId, bookingId));
    return db.select().from(rentalDamageReports).where(and(...conditions)).orderBy(desc(rentalDamageReports.createdAt));
  }

  async createDamageReport(data: InsertRentalDamageReport): Promise<RentalDamageReport> {
    const result = await db.insert(rentalDamageReports).values(data).returning();
    return result[0];
  }

  // Rental agreements
  async getRentalAgreement(carRentalId: string, deviceId: string, bookingId?: string): Promise<RentalAgreement | undefined> {
    const conditions = [eq(rentalAgreements.carRentalId, carRentalId), eq(rentalAgreements.deviceId, deviceId)];
    if (bookingId) conditions.push(eq(rentalAgreements.bookingId, bookingId));
    const result = await db.select().from(rentalAgreements).where(and(...conditions)).orderBy(desc(rentalAgreements.createdAt)).limit(1);
    return result[0];
  }

  async getRentalAgreements(carRentalId: string): Promise<RentalAgreement[]> {
    return db.select().from(rentalAgreements).where(eq(rentalAgreements.carRentalId, carRentalId)).orderBy(desc(rentalAgreements.createdAt));
  }

  async createRentalAgreement(data: InsertRentalAgreement): Promise<RentalAgreement> {
    const result = await db.insert(rentalAgreements).values(data).returning();
    return result[0];
  }

  async updateRentalAgreement(id: string, data: Partial<InsertRentalAgreement>): Promise<RentalAgreement | undefined> {
    const result = await db.update(rentalAgreements).set(data).where(eq(rentalAgreements.id, id)).returning();
    return result[0];
  }

  // Trips
  async getTrips(): Promise<Trip[]> {
    return db.select().from(trips).orderBy(desc(trips.createdAt));
  }

  async getTripById(id: string): Promise<Trip | undefined> {
    const result = await db.select().from(trips).where(eq(trips.id, id));
    return result[0];
  }

  async createTrip(data: InsertTrip): Promise<Trip> {
    const result = await db.insert(trips).values(data).returning();
    return result[0];
  }

  async updateTrip(id: string, data: Partial<InsertTrip>): Promise<Trip | undefined> {
    const result = await db.update(trips).set({ ...data, updatedAt: new Date() }).where(eq(trips.id, id)).returning();
    return result[0];
  }

  async deleteTrip(id: string): Promise<void> {
    await db.delete(tripMemories).where(eq(tripMemories.tripId, id));
    await db.delete(bookings).where(eq(bookings.tripId, id));
    await db.delete(trips).where(eq(trips.id, id));
  }

  // Bookings
  async getBookings(tripId?: string): Promise<Booking[]> {
    if (tripId) {
      return db.select().from(bookings).where(eq(bookings.tripId, tripId)).orderBy(bookings.checkInDate);
    }
    return db.select().from(bookings).orderBy(desc(bookings.createdAt));
  }

  async getBookingById(id: string): Promise<Booking | undefined> {
    const result = await db.select().from(bookings).where(eq(bookings.id, id));
    return result[0];
  }

  async createBooking(data: InsertBooking): Promise<Booking> {
    const result = await db.insert(bookings).values(data).returning();
    if (data.tripId) {
      await this.updateTripTotalCost(data.tripId);
    }
    return result[0];
  }

  async updateBooking(id: string, data: Partial<InsertBooking>): Promise<Booking | undefined> {
    const result = await db.update(bookings).set({ ...data, updatedAt: new Date() }).where(eq(bookings.id, id)).returning();
    const booking = result[0];
    if (booking?.tripId) {
      await this.updateTripTotalCost(booking.tripId);
    }
    return booking;
  }

  async deleteBooking(id: string): Promise<void> {
    const booking = await this.getBookingById(id);
    await db.delete(bookings).where(eq(bookings.id, id));
    if (booking?.tripId) {
      await this.updateTripTotalCost(booking.tripId);
    }
  }

  private async updateTripTotalCost(tripId: string): Promise<void> {
    const tripBookings = await this.getBookings(tripId);
    const totalCost = tripBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    await db.update(trips).set({ totalCost, updatedAt: new Date() }).where(eq(trips.id, tripId));
  }

  // Trip Memories
  async getTripMemories(tripId: string): Promise<TripMemory[]> {
    return db.select().from(tripMemories).where(eq(tripMemories.tripId, tripId)).orderBy(desc(tripMemories.createdAt));
  }

  async getTripMemoryById(id: string): Promise<TripMemory | undefined> {
    const result = await db.select().from(tripMemories).where(eq(tripMemories.id, id));
    return result[0];
  }

  async createTripMemory(data: InsertTripMemory): Promise<TripMemory> {
    const result = await db.insert(tripMemories).values(data).returning();
    return result[0];
  }

  async updateTripMemory(id: string, data: Partial<InsertTripMemory>): Promise<TripMemory | undefined> {
    const result = await db.update(tripMemories).set(data).where(eq(tripMemories.id, id)).returning();
    return result[0];
  }

  async deleteTripMemory(id: string): Promise<void> {
    await db.delete(tripMemories).where(eq(tripMemories.id, id));
  }

  // Companion Likes
  async getCompanionLikes(likedBy: string): Promise<CompanionLike[]> {
    return db.select().from(companionLikes).where(eq(companionLikes.likedBy, likedBy)).orderBy(desc(companionLikes.createdAt));
  }

  async createCompanionLike(data: InsertCompanionLike): Promise<CompanionLike> {
    const result = await db.insert(companionLikes).values(data).returning();
    return result[0];
  }

  async getCompanionLikeByCompanionAndUser(companionId: string, likedBy: string): Promise<CompanionLike | undefined> {
    const result = await db.select().from(companionLikes)
      .where(and(eq(companionLikes.companionId, companionId), eq(companionLikes.likedBy, likedBy)));
    return result[0];
  }

  async getCompanionMatches(userId: string): Promise<CompanionMatch[]> {
    return db.select().from(companionMatches)
      .where(and(eq(companionMatches.userId, userId), eq(companionMatches.isActive, true)))
      .orderBy(desc(companionMatches.createdAt));
  }

  async createCompanionMatch(data: InsertCompanionMatch): Promise<CompanionMatch> {
    const result = await db.insert(companionMatches).values(data).returning();
    return result[0];
  }

  async getCompanionMatchByUserAndCompanion(userId: string, companionId: string): Promise<CompanionMatch | undefined> {
    const result = await db.select().from(companionMatches)
      .where(and(eq(companionMatches.userId, userId), eq(companionMatches.companionId, companionId)));
    return result[0];
  }

  // Flash Deals
  async getFlashDeals(filters?: { country?: string; city?: string; vendorType?: string; activeOnly?: boolean }): Promise<FlashDeal[]> {
    const conditions = [eq(flashDeals.isActive, true)];
    if (filters?.activeOnly !== false) {
      conditions.push(lte(flashDeals.startsAt, new Date()));
      conditions.push(gte(flashDeals.expiresAt, new Date()));
    }
    if (filters?.country) conditions.push(ilike(flashDeals.country, filters.country));
    if (filters?.city) conditions.push(ilike(flashDeals.city, filters.city));
    if (filters?.vendorType) conditions.push(eq(flashDeals.vendorType, filters.vendorType));
    return db.select().from(flashDeals).where(and(...conditions)).orderBy(flashDeals.expiresAt);
  }

  async getFlashDealById(id: string): Promise<FlashDeal | undefined> {
    const result = await db.select().from(flashDeals).where(eq(flashDeals.id, id));
    return result[0];
  }

  async createFlashDeal(data: InsertFlashDeal): Promise<FlashDeal> {
    const result = await db.insert(flashDeals).values(data).returning();
    return result[0];
  }

  async updateFlashDeal(id: string, data: Partial<InsertFlashDeal>): Promise<FlashDeal | undefined> {
    const result = await db.update(flashDeals).set(data).where(eq(flashDeals.id, id)).returning();
    return result[0];
  }

  async incrementDealRedemption(id: string): Promise<void> {
    await db.update(flashDeals).set({
      currentRedemptions: sql`${flashDeals.currentRedemptions} + 1`,
    }).where(eq(flashDeals.id, id));
  }

  // Trip Bundles
  async getTripBundles(filters?: { country?: string; destination?: string; featured?: boolean; activeOnly?: boolean }): Promise<TripBundle[]> {
    const conditions = [eq(tripBundles.isActive, true)];
    if (filters?.country) conditions.push(ilike(tripBundles.country, filters.country));
    if (filters?.destination) conditions.push(ilike(tripBundles.destination, `%${filters.destination}%`));
    if (filters?.featured) conditions.push(eq(tripBundles.isFeatured, true));
    return db.select().from(tripBundles).where(and(...conditions)).orderBy(desc(tripBundles.createdAt));
  }

  async getTripBundleById(id: string): Promise<TripBundle | undefined> {
    const result = await db.select().from(tripBundles).where(eq(tripBundles.id, id));
    return result[0];
  }

  async createTripBundle(data: InsertTripBundle): Promise<TripBundle> {
    const result = await db.insert(tripBundles).values(data).returning();
    return result[0];
  }

  async updateTripBundle(id: string, data: Partial<InsertTripBundle>): Promise<TripBundle | undefined> {
    const result = await db.update(tripBundles).set(data).where(eq(tripBundles.id, id)).returning();
    return result[0];
  }

  async incrementBundleBooking(id: string): Promise<void> {
    await db.update(tripBundles).set({
      currentBookings: sql`${tripBundles.currentBookings} + 1`,
    }).where(eq(tripBundles.id, id));
  }

  async getDiscoverCompanions(filters?: { city?: string; country?: string; gender?: string; serviceType?: string; lat?: number; lng?: number; radiusKm?: number }): Promise<Companion[]> {
    const conditions = [eq(companions.isActive, true)];
    if (filters?.country) conditions.push(ilike(companions.country, `%${filters.country}%`));
    if (filters?.city) conditions.push(ilike(companions.city, `%${filters.city}%`));
    if (filters?.gender) conditions.push(eq(companions.gender, filters.gender));
    if (filters?.serviceType) conditions.push(eq(companions.serviceType, filters.serviceType));

    let results = await db.select().from(companions).where(and(...conditions)).orderBy(desc(companions.createdAt));

    if (filters?.lat && filters?.lng && filters?.radiusKm) {
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      results = results.filter((c) => {
        if (!c.latitude || !c.longitude) return false;
        const lat1 = toRad(filters.lat!);
        const lat2 = toRad(parseFloat(c.latitude));
        const dLat = lat2 - lat1;
        const dLng = toRad(parseFloat(c.longitude) - filters.lng!);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
        const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return dist <= filters.radiusKm!;
      });
    }

    return results;
  }

  // Chat Conversations
  async getChatConversations(userId: string): Promise<ChatConversation[]> {
    return db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.userId, userId))
      .orderBy(desc(chatConversations.lastMessageAt));
  }

  async getChatConversationById(id: string): Promise<ChatConversation | undefined> {
    const result = await db.select().from(chatConversations).where(eq(chatConversations.id, id));
    return result[0];
  }

  async getChatConversationByVendor(userId: string, vendorType: string, vendorId: string): Promise<ChatConversation | undefined> {
    const result = await db
      .select()
      .from(chatConversations)
      .where(
        and(
          eq(chatConversations.userId, userId),
          eq(chatConversations.vendorType, vendorType),
          eq(chatConversations.vendorId, vendorId)
        )
      );
    return result[0];
  }

  async createChatConversation(conv: InsertChatConversation): Promise<ChatConversation> {
    const result = await db.insert(chatConversations).values(conv).returning();
    return result[0];
  }

  async updateChatConversation(id: string, data: Partial<ChatConversation>): Promise<ChatConversation | undefined> {
    const result = await db
      .update(chatConversations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(chatConversations.id, id))
      .returning();
    return result[0];
  }

  // Chat Messages
  async getChatMessages(conversationId: string): Promise<ChatMessage[]> {
    return db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(chatMessages.createdAt);
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const result = await db.insert(chatMessages).values(message).returning();
    const msg = result[0];

    await db
      .update(chatConversations)
      .set({
        lastMessage: msg.content,
        lastMessageAt: new Date(),
        unreadCount: sql`${chatConversations.unreadCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(chatConversations.id, message.conversationId));

    return msg;
  }

  // Platform Transactions
  async createPlatformTransaction(tx: InsertPlatformTransaction): Promise<PlatformTransaction> {
    const result = await db.insert(platformTransactions).values(tx).returning();
    return result[0];
  }

  async getPlatformTransactions(filters?: { vendorType?: string; userId?: string }): Promise<PlatformTransaction[]> {
    const conditions: any[] = [];
    if (filters?.vendorType) conditions.push(eq(platformTransactions.vendorType, filters.vendorType));
    if (filters?.userId) conditions.push(eq(platformTransactions.userId, filters.userId));

    if (conditions.length > 0) {
      return db.select().from(platformTransactions).where(and(...conditions)).orderBy(desc(platformTransactions.createdAt));
    }
    return db.select().from(platformTransactions).orderBy(desc(platformTransactions.createdAt));
  }
  async getTravellerProfile(deviceId: string): Promise<TravellerProfile | undefined> {
    const result = await db.select().from(travellerProfiles).where(eq(travellerProfiles.deviceId, deviceId));
    return result[0];
  }

  async createTravellerProfile(profile: InsertTravellerProfile): Promise<TravellerProfile> {
    const result = await db.insert(travellerProfiles).values(profile).returning();
    return result[0];
  }

  async updateTravellerProfile(deviceId: string, data: Partial<InsertTravellerProfile>): Promise<TravellerProfile | undefined> {
    const result = await db.update(travellerProfiles).set({ ...data, updatedAt: new Date() }).where(eq(travellerProfiles.deviceId, deviceId)).returning();
    return result[0];
  }

  async getVendorWallet(vendorId: string, vendorType: string): Promise<VendorWallet | undefined> {
    const result = await db.select().from(vendorWallets)
      .where(and(eq(vendorWallets.vendorId, vendorId), eq(vendorWallets.vendorType, vendorType)));
    return result[0];
  }

  async getVendorWalletById(id: string): Promise<VendorWallet | undefined> {
    const result = await db.select().from(vendorWallets).where(eq(vendorWallets.id, id));
    return result[0];
  }

  async createVendorWallet(wallet: InsertVendorWallet): Promise<VendorWallet> {
    const result = await db.insert(vendorWallets).values(wallet).returning();
    return result[0];
  }

  async updateVendorWallet(id: string, data: Partial<Omit<VendorWallet, "id">>): Promise<VendorWallet | undefined> {
    const result = await db.update(vendorWallets).set({ ...data, updatedAt: new Date() }).where(eq(vendorWallets.id, id)).returning();
    return result[0];
  }

  async getEscrowTransactions(vendorId: string, vendorType: string): Promise<EscrowTransaction[]> {
    return db.select().from(escrowTransactions)
      .where(and(eq(escrowTransactions.vendorId, vendorId), eq(escrowTransactions.vendorType, vendorType)))
      .orderBy(desc(escrowTransactions.createdAt));
  }

  async getEscrowTransactionById(id: string): Promise<EscrowTransaction | undefined> {
    const result = await db.select().from(escrowTransactions).where(eq(escrowTransactions.id, id));
    return result[0];
  }

  async createEscrowTransaction(tx: InsertEscrowTransaction): Promise<EscrowTransaction> {
    const result = await db.insert(escrowTransactions).values(tx).returning();
    return result[0];
  }

  async updateEscrowTransaction(id: string, data: Partial<Omit<EscrowTransaction, "id">>): Promise<EscrowTransaction | undefined> {
    const result = await db.update(escrowTransactions).set({ ...data, updatedAt: new Date() }).where(eq(escrowTransactions.id, id)).returning();
    return result[0];
  }

  async getPayoutRequests(vendorId: string, vendorType: string): Promise<PayoutRequest[]> {
    return db.select().from(payoutRequests)
      .where(and(eq(payoutRequests.vendorId, vendorId), eq(payoutRequests.vendorType, vendorType)))
      .orderBy(desc(payoutRequests.createdAt));
  }

  async getPayoutRequestById(id: string): Promise<PayoutRequest | undefined> {
    const result = await db.select().from(payoutRequests).where(eq(payoutRequests.id, id));
    return result[0];
  }

  async createPayoutRequest(req: InsertPayoutRequest): Promise<PayoutRequest> {
    const result = await db.insert(payoutRequests).values(req).returning();
    return result[0];
  }

  async updatePayoutRequest(id: string, data: Partial<Omit<PayoutRequest, "id">>): Promise<PayoutRequest | undefined> {
    const result = await db.update(payoutRequests).set({ ...data, updatedAt: new Date() }).where(eq(payoutRequests.id, id)).returning();
    return result[0];
  }

  async getGroupDiscountTiers(vendorId: string, vendorType: string): Promise<GroupDiscountTier[]> {
    return db.select().from(groupDiscountTiers)
      .where(and(eq(groupDiscountTiers.vendorId, vendorId), eq(groupDiscountTiers.vendorType, vendorType), eq(groupDiscountTiers.isActive, true)));
  }

  async createGroupDiscountTier(tier: InsertGroupDiscountTier): Promise<GroupDiscountTier> {
    const result = await db.insert(groupDiscountTiers).values(tier).returning();
    return result[0];
  }

  async deleteGroupDiscountTier(id: string): Promise<void> {
    await db.update(groupDiscountTiers).set({ isActive: false }).where(eq(groupDiscountTiers.id, id));
  }

  async calculateGroupDiscount(vendorId: string, vendorType: string, groupSize: number): Promise<number> {
    const tiers = await this.getGroupDiscountTiers(vendorId, vendorType);
    let bestDiscount = 0;
    for (const tier of tiers) {
      if (groupSize >= tier.minGroupSize && groupSize <= tier.maxGroupSize && tier.discountPercent > bestDiscount) {
        bestDiscount = tier.discountPercent;
      }
    }
    if (bestDiscount === 0 && tiers.length === 0) {
      if (groupSize >= 2 && groupSize <= 4) bestDiscount = 10;
      else if (groupSize >= 5 && groupSize <= 9) bestDiscount = 15;
      else if (groupSize >= 10) bestDiscount = 20;
    }
    return bestDiscount;
  }

  async getPriceAlerts(deviceId: string): Promise<PriceAlert[]> {
    return db.select().from(priceAlerts)
      .where(and(eq(priceAlerts.deviceId, deviceId), eq(priceAlerts.isActive, true)))
      .orderBy(desc(priceAlerts.createdAt));
  }

  async createPriceAlert(alert: InsertPriceAlert): Promise<PriceAlert> {
    const result = await db.insert(priceAlerts).values(alert).returning();
    return result[0];
  }

  async deletePriceAlert(id: string): Promise<void> {
    await db.update(priceAlerts).set({ isActive: false }).where(eq(priceAlerts.id, id));
  }

  async checkAndTriggerPriceAlerts(vendorId: string, vendorType: string, newPrice: number): Promise<PriceAlert[]> {
    const triggered = await db.select().from(priceAlerts)
      .where(and(
        eq(priceAlerts.vendorId, vendorId),
        eq(priceAlerts.vendorType, vendorType),
        eq(priceAlerts.isActive, true),
        eq(priceAlerts.isTriggered, false),
        gte(priceAlerts.targetPrice, newPrice)
      ));
    if (triggered.length > 0) {
      for (const alert of triggered) {
        await db.update(priceAlerts).set({ isTriggered: true, triggeredAt: new Date() }).where(eq(priceAlerts.id, alert.id));
      }
    }
    return triggered;
  }

  async getTriggeredAlerts(deviceId: string): Promise<PriceAlert[]> {
    return db.select().from(priceAlerts)
      .where(and(eq(priceAlerts.deviceId, deviceId), eq(priceAlerts.isTriggered, true), eq(priceAlerts.isActive, true)))
      .orderBy(desc(priceAlerts.triggeredAt));
  }

  async getSeasonalPricing(vendorId: string, vendorType: string): Promise<SeasonalPricing[]> {
    const now = new Date();
    return db.select().from(seasonalPricing)
      .where(and(
        eq(seasonalPricing.vendorId, vendorId),
        eq(seasonalPricing.vendorType, vendorType),
        eq(seasonalPricing.isActive, true),
        lte(seasonalPricing.startDate, now),
        gte(seasonalPricing.endDate, now)
      ));
  }

  async createSeasonalPricing(pricing: InsertSeasonalPricing): Promise<SeasonalPricing> {
    const result = await db.insert(seasonalPricing).values(pricing).returning();
    return result[0];
  }

  async getAllSeasonalDeals(): Promise<SeasonalPricing[]> {
    const now = new Date();
    return db.select().from(seasonalPricing)
      .where(and(
        eq(seasonalPricing.isActive, true),
        lte(seasonalPricing.startDate, now),
        gte(seasonalPricing.endDate, now)
      ))
      .orderBy(desc(seasonalPricing.discountPercent));
  }

  async getLastMinuteDeals(): Promise<FlashDeal[]> {
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    return db.select().from(flashDeals)
      .where(and(
        eq(flashDeals.isActive, true),
        gte(flashDeals.expiresAt, now),
        lte(flashDeals.expiresAt, twoDaysFromNow),
        gte(flashDeals.discountPercent, 20)
      ))
      .orderBy(flashDeals.expiresAt);
  }

  async getEarlyBirdDeals(): Promise<FlashDeal[]> {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return db.select().from(flashDeals)
      .where(and(
        eq(flashDeals.isActive, true),
        gte(flashDeals.startsAt, thirtyDaysFromNow)
      ))
      .orderBy(desc(flashDeals.discountPercent));
  }

  async createSafetyReport(report: InsertSafetyReport): Promise<SafetyReport> {
    const [created] = await db.insert(safetyReports).values(report).returning();
    return created;
  }

  async getSafetyReports(deviceId: string): Promise<SafetyReport[]> {
    return db.select().from(safetyReports)
      .where(eq(safetyReports.deviceId, deviceId))
      .orderBy(desc(safetyReports.createdAt));
  }

  async getMenuItems(restaurantId: string): Promise<MenuItem[]> {
    return db.select().from(menuItems)
      .where(eq(menuItems.restaurantId, restaurantId))
      .orderBy(menuItems.sortOrder, menuItems.category, menuItems.name);
  }

  async getMenuItemById(id: string): Promise<MenuItem | undefined> {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item;
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const [created] = await db.insert(menuItems).values(item).returning();
    return created;
  }

  async updateMenuItem(id: string, data: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const [updated] = await db.update(menuItems).set(data).where(eq(menuItems.id, id)).returning();
    return updated;
  }

  async deleteMenuItem(id: string): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  async getDeliveryOrders(filters?: { restaurantId?: string; status?: string }): Promise<DeliveryOrder[]> {
    const conditions: any[] = [];
    if (filters?.restaurantId) conditions.push(eq(deliveryOrders.restaurantId, filters.restaurantId));
    if (filters?.status) conditions.push(eq(deliveryOrders.status, filters.status));
    return db.select().from(deliveryOrders)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(deliveryOrders.createdAt));
  }

  async getDeliveryOrderById(id: string): Promise<DeliveryOrder | undefined> {
    const [order] = await db.select().from(deliveryOrders).where(eq(deliveryOrders.id, id));
    return order;
  }

  async createDeliveryOrder(order: InsertDeliveryOrder): Promise<DeliveryOrder> {
    const [created] = await db.insert(deliveryOrders).values(order).returning();
    return created;
  }

  async updateDeliveryOrderStatus(id: string, status: string): Promise<DeliveryOrder | undefined> {
    const [updated] = await db.update(deliveryOrders)
      .set({ status, updatedAt: new Date() })
      .where(eq(deliveryOrders.id, id))
      .returning();
    return updated;
  }

  async createDeliveryOrderItems(items: InsertDeliveryOrderItem[]): Promise<DeliveryOrderItem[]> {
    if (items.length === 0) return [];
    return db.insert(deliveryOrderItems).values(items).returning();
  }

  async getDeliveryOrderItems(orderId: string): Promise<DeliveryOrderItem[]> {
    return db.select().from(deliveryOrderItems)
      .where(eq(deliveryOrderItems.orderId, orderId));
  }
}

export const storage = new DatabaseStorage();
