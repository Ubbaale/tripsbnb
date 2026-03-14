import { stripeStorage } from './stripeStorage';
import { getUncachableStripeClient } from './stripeClient';

interface CreateVendorProductOptions {
  vendorType: 'restaurant' | 'safari' | 'accommodation' | 'companion' | 'car_rental';
  vendorId: string;
  name: string;
  description?: string;
  priceInCents: number;
  currency?: string;
  metadata?: Record<string, string>;
}

export class StripeService {
  async createVendorProduct(options: CreateVendorProductOptions) {
    const stripe = await getUncachableStripeClient();
    
    const product = await stripe.products.create({
      name: options.name,
      description: options.description,
      metadata: {
        vendorType: options.vendorType,
        vendorId: options.vendorId,
        ...options.metadata,
      },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: options.priceInCents,
      currency: options.currency || 'usd',
    });

    return {
      productId: product.id,
      priceId: price.id,
    };
  }

  async updateVendorPrice(productId: string, newPriceInCents: number, currency = 'usd') {
    const stripe = await getUncachableStripeClient();
    
    // Create new price (Stripe prices are immutable)
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: newPriceInCents,
      currency,
    });

    // Deactivate old prices for this product
    const oldPrices = await stripe.prices.list({ product: productId, active: true });
    for (const oldPrice of oldPrices.data) {
      if (oldPrice.id !== price.id) {
        await stripe.prices.update(oldPrice.id, { active: false });
      }
    }

    return price.id;
  }

  async deactivateVendorProduct(productId: string) {
    const stripe = await getUncachableStripeClient();
    await stripe.products.update(productId, { active: false });
  }
  async createCustomer(email: string, name?: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.customers.create({
      email,
      name,
    });
  }

  async createCheckoutSession(options: {
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    customerId?: string;
    mode?: 'payment' | 'subscription';
    metadata?: Record<string, string>;
  }) {
    const stripe = await getUncachableStripeClient();
    
    const sessionParams: any = {
      payment_method_types: ['card'],
      line_items: [{ price: options.priceId, quantity: 1 }],
      mode: options.mode || 'payment',
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
    };

    if (options.customerId) {
      sessionParams.customer = options.customerId;
    }

    if (options.metadata) {
      sessionParams.metadata = options.metadata;
    }

    return await stripe.checkout.sessions.create(sessionParams);
  }

  async createCustomerPortalSession(customerId: string, returnUrl: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  async getProduct(productId: string) {
    return await stripeStorage.getProduct(productId);
  }

  async listProducts() {
    return await stripeStorage.listProducts();
  }

  async listProductsWithPrices() {
    return await stripeStorage.listProductsWithPrices();
  }

  async listProductsFromStripeAPI(limit = 20) {
    const stripe = await getUncachableStripeClient();
    
    const products = await stripe.products.list({
      active: true,
      limit,
      expand: ['data.default_price'],
    });

    const productsWithPrices = await Promise.all(
      products.data.map(async (product) => {
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
          limit: 10,
        });
        
        return {
          id: product.id,
          name: product.name,
          description: product.description,
          active: product.active,
          metadata: product.metadata,
          images: product.images,
          prices: prices.data.map(price => ({
            id: price.id,
            unit_amount: price.unit_amount,
            currency: price.currency,
            recurring: price.recurring,
            active: price.active,
            metadata: price.metadata,
          })),
        };
      })
    );

    return productsWithPrices;
  }

  async getProductFromStripeAPI(productId: string) {
    const stripe = await getUncachableStripeClient();
    
    const product = await stripe.products.retrieve(productId);
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 10,
    });

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      active: product.active,
      metadata: product.metadata,
      images: product.images,
      prices: prices.data.map(price => ({
        id: price.id,
        unit_amount: price.unit_amount,
        currency: price.currency,
        recurring: price.recurring,
        active: price.active,
        metadata: price.metadata,
      })),
    };
  }

  async getSubscription(subscriptionId: string) {
    return await stripeStorage.getSubscription(subscriptionId);
  }

  async getOrCreateCustomerByDeviceId(deviceId: string) {
    const stripe = await getUncachableStripeClient();
    const existing = await stripe.customers.search({
      query: `metadata['deviceId']:'${deviceId}'`,
    });
    if (existing.data.length > 0) {
      return existing.data[0];
    }
    return await stripe.customers.create({
      metadata: { deviceId },
    });
  }

  async createSetupIntent(customerId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
    });
  }

  async listPaymentMethods(customerId: string) {
    const stripe = await getUncachableStripeClient();
    const methods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    return methods.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand || 'unknown',
      last4: pm.card?.last4 || '****',
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
      isDefault: false,
    }));
  }

  async deletePaymentMethod(paymentMethodId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.paymentMethods.detach(paymentMethodId);
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
  }
}

export const stripeService = new StripeService();
