import { useState } from 'react';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { useLoaderData, useSubmit, useNavigation } from 'react-router';
import { authenticate } from '../shopify.server';
import { supabase } from '../lib/supabase.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Fetch existing settings from Supabase
  const { data: settings } = await supabase
    .from('reward_settings')
    .select('*')
    .eq('shop_domain', shop)
    .single();

  return {
    shop,
    settings: settings || {
      affiliate_reward_type: 'percentage',
      affiliate_reward_value: 10,
      customer_reward_type: 'percentage',
      customer_reward_value: 5,
      next_order_discount_type: 'percentage',
      next_order_discount_value: 5
    }
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();

  const settingsData = {
    shop_domain: shop,
    affiliate_reward_type: formData.get('affiliate_reward_type') as string,
    affiliate_reward_value: parseFloat(formData.get('affiliate_reward_value') as string),
    customer_reward_type: formData.get('customer_reward_type') as string,
    customer_reward_value: parseFloat(formData.get('customer_reward_value') as string),
    next_order_discount_type: formData.get('next_order_discount_type') as string,
    next_order_discount_value: parseFloat(formData.get('next_order_discount_value') as string),
    updated_at: new Date().toISOString()
  };

  // Upsert settings
  const { error } = await supabase
    .from('reward_settings')
    .upsert(settingsData, { onConflict: 'shop_domain' });

  if (error) {
    throw new Error(error.message);
  }

  return { success: true };
};

export default function SettingsPage() {
  const data = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  
  const [affiliateRewardType, setAffiliateRewardType] = useState(data.settings.affiliate_reward_type);
  const [affiliateRewardValue, setAffiliateRewardValue] = useState(data.settings.affiliate_reward_value.toString());
  const [customerRewardType, setCustomerRewardType] = useState(data.settings.customer_reward_type);
  const [customerRewardValue, setCustomerRewardValue] = useState(data.settings.customer_reward_value.toString());
  const [nextOrderDiscountType, setNextOrderDiscountType] = useState(data.settings.next_order_discount_type);
  const [nextOrderDiscountValue, setNextOrderDiscountValue] = useState(data.settings.next_order_discount_value.toString());

  const isSubmitting = navigation.state === 'submitting';

  const handleSave = () => {
    const formData = new FormData();
    formData.append('affiliate_reward_type', affiliateRewardType);
    formData.append('affiliate_reward_value', affiliateRewardValue);
    formData.append('customer_reward_type', customerRewardType);
    formData.append('customer_reward_value', customerRewardValue);
    formData.append('next_order_discount_type', nextOrderDiscountType);
    formData.append('next_order_discount_value', nextOrderDiscountValue);
    submit(formData, { method: 'post' });
  };

  return (
    <s-page heading="Affiliate Settings">
      <s-button slot="primary-action" onClick={handleSave} loading={isSubmitting}>
        Save Settings
      </s-button>

      <s-section heading="Affiliate Rewards">
        <s-paragraph>Set commission for affiliates when their referrals make a purchase</s-paragraph>
        
        <s-stack direction="block" gap="large">
          <s-stack direction="block" gap="base">
            <s-text variant="heading-sm" as="h3">Reward Type</s-text>
            <s-stack direction="inline" gap="base">
              <s-button
                onClick={() => setAffiliateRewardType('percentage')}
                variant={affiliateRewardType === 'percentage' ? 'primary' : 'secondary'}
              >
                Percentage
              </s-button>
              <s-button
                onClick={() => setAffiliateRewardType('fixed')}
                variant={affiliateRewardType === 'fixed' ? 'primary' : 'secondary'}
              >
                Fixed Amount
              </s-button>
            </s-stack>
          </s-stack>

          <s-stack direction="block" gap="base">
            <s-text variant="heading-sm" as="h3">
              {affiliateRewardType === 'percentage' ? 'Commission Percentage' : 'Commission Amount'}
            </s-text>
            <s-text-field
              type="number"
              value={affiliateRewardValue}
              onChange={(e: any) => setAffiliateRewardValue(e.target.value)}
              suffix={affiliateRewardType === 'percentage' ? '%' : '$'}
            />
            <s-text tone="subdued">
              {affiliateRewardType === 'percentage' 
                ? 'Affiliates earn this percentage of each sale' 
                : 'Affiliates earn this fixed amount per sale'}
            </s-text>
          </s-stack>
        </s-stack>
      </s-section>

      <s-section heading="Customer Rewards">
        <s-paragraph>Set discount for customers who use an affiliate link</s-paragraph>
        
        <s-stack direction="block" gap="large">
          <s-stack direction="block" gap="base">
            <s-text variant="heading-sm" as="h3">Reward Type</s-text>
            <s-stack direction="inline" gap="base">
              <s-button
                onClick={() => setCustomerRewardType('percentage')}
                variant={customerRewardType === 'percentage' ? 'primary' : 'secondary'}
              >
                Percentage
              </s-button>
              <s-button
                onClick={() => setCustomerRewardType('fixed')}
                variant={customerRewardType === 'fixed' ? 'primary' : 'secondary'}
              >
                Fixed Amount
              </s-button>
            </s-stack>
          </s-stack>

          <s-stack direction="block" gap="base">
            <s-text variant="heading-sm" as="h3">
              {customerRewardType === 'percentage' ? 'Discount Percentage' : 'Discount Amount'}
            </s-text>
            <s-text-field
              type="number"
              value={customerRewardValue}
              onChange={(e: any) => setCustomerRewardValue(e.target.value)}
              suffix={customerRewardType === 'percentage' ? '%' : '$'}
            />
            <s-text tone="subdued">
              {customerRewardType === 'percentage' 
                ? 'Customers get this percentage off their order' 
                : 'Customers get this fixed amount off their order'}
            </s-text>
          </s-stack>
        </s-stack>
      </s-section>

      <s-section heading="Next Order Discount">
        <s-paragraph>Automatically create a discount coupon for customers after their order (only if they didn't use a coupon)</s-paragraph>
        
        <s-stack direction="block" gap="large">
          <s-stack direction="block" gap="base">
            <s-text variant="heading-sm" as="h3">Discount Type</s-text>
            <s-stack direction="inline" gap="base">
              <s-button
                onClick={() => setNextOrderDiscountType('percentage')}
                variant={nextOrderDiscountType === 'percentage' ? 'primary' : 'secondary'}
              >
                Percentage
              </s-button>
              <s-button
                onClick={() => setNextOrderDiscountType('fixed')}
                variant={nextOrderDiscountType === 'fixed' ? 'primary' : 'secondary'}
              >
                Fixed Amount
              </s-button>
            </s-stack>
          </s-stack>

          <s-stack direction="block" gap="base">
            <s-text variant="heading-sm" as="h3">
              {nextOrderDiscountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount'}
            </s-text>
            <s-text-field
              type="number"
              value={nextOrderDiscountValue}
              onChange={(e: any) => setNextOrderDiscountValue(e.target.value)}
              suffix={nextOrderDiscountType === 'percentage' ? '%' : '$'}
            />
            <s-text tone="subdued">
              Single-use coupon created automatically for next purchase
            </s-text>
          </s-stack>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Rewards Preview">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            <s-text weight="bold">Affiliates earn: </s-text>
            {affiliateRewardType === 'percentage' ? `${affiliateRewardValue}%` : `$${affiliateRewardValue}`} per sale
          </s-paragraph>
          <s-paragraph>
            <s-text weight="bold">Customers get: </s-text>
            {customerRewardType === 'percentage' ? `${customerRewardValue}%` : `$${customerRewardValue}`} off
          </s-paragraph>
          <s-paragraph>
            <s-text weight="bold">Next order coupon: </s-text>
            {nextOrderDiscountType === 'percentage' ? `${nextOrderDiscountValue}%` : `$${nextOrderDiscountValue}`} off
          </s-paragraph>
        </s-stack>
      </s-section>
    </s-page>
  );
}

