import Whop from "@whop/sdk";


export const whop = new Whop({
  apiKey: process.env.WHOP_API_KEY || "",
  appID: process.env.WHOP_APP_ID || undefined,
});

export interface WhopUser {
  userId: string;
  appId: string;
}

export async function verifyUserToken(token: string): Promise<WhopUser | null> {
  try {
    const result = await whop.verifyUserToken(token);

    if (result && result.userId) {
      return { userId: result.userId, appId: result.appId };
    }
    return null;
  } catch {
    return null;
  }
}

export interface AccessCheckResult {
  has_access: boolean;
  access_level: "customer" | "admin" | "no_access";
}

export async function checkAccess(
  resourceId: string,
  userId: string
): Promise<AccessCheckResult> {
  try {
    const response = await whop.users.checkAccess(resourceId, { id: userId });
    console.log(`[Whop SDK] checkAccess for user ${userId} on resource ${resourceId}: has_access=${response.has_access}, level=${response.access_level}`);
    return {
      has_access: response.has_access || false,
      access_level: (response.access_level as AccessCheckResult["access_level"]) || "no_access",
    };
  } catch (error) {
    console.error(`[Whop SDK] checkAccess failed for user ${userId} on resource ${resourceId}:`, error);
    return { has_access: false, access_level: "no_access" };
  }
}

export async function getUser(userId: string) {
  try {
    const user = await whop.users.retrieve(userId);
    return user;
  } catch {
    return null;
  }
}

export async function getCompanyIdFromExperience(experienceId: string): Promise<string | null> {
  try {
    const experience = await whop.experiences.retrieve(experienceId);
    const companyId = experience?.company?.id || null;
    console.log(`[Whop SDK] Resolved companyId ${companyId} from experience ${experienceId}`);
    return companyId;
  } catch (error) {
    console.error(`[Whop SDK] Failed to get company ID from experience ${experienceId}:`, error);
    return null;
  }
}

export interface CheckoutMetadata {
  courseId: string;
  buyerId: string;
  creatorId: string;
}

export async function createCheckoutConfiguration(
  price: number,
  metadata: CheckoutMetadata
): Promise<{ checkoutId: string } | null> {
  try {
    const companyId = process.env.WHOP_COMPANY_ID;

    if (!companyId) {
      console.error("WHOP_COMPANY_ID environment variable is not set");
      return null;
    }

    const checkoutConfig = await whop.checkoutConfigurations.create({
      plan: {
        company_id: companyId,
        initial_price: price,
        plan_type: "one_time",
        currency: "usd",
      },
      metadata: metadata as any,
    } as any);

    return { checkoutId: checkoutConfig.id };
  } catch (error) {
    console.error("Failed to create checkout configuration:", error);
    return null;
  }
}

// Verify payment by checking the checkout configuration status
export async function verifyPaymentComplete(checkoutId: string): Promise<{ success: boolean; paymentId?: string }> {
  try {
    // Retrieve the checkout configuration to check its status
    const checkout = await whop.checkoutConfigurations.retrieve(checkoutId);

    // Check if there's a completed payment associated
    if (checkout && (checkout as any).payment_id) {
      return { success: true, paymentId: (checkout as any).payment_id };
    }

    // Alternative: check if status indicates completion
    if (checkout && ((checkout as any).status === "completed" || (checkout as any).status === "paid")) {
      return { success: true, paymentId: (checkout as any).payment_id || checkoutId };
    }

    return { success: false };
  } catch (error) {
    console.error("Failed to verify payment:", error);
    return { success: false };
  }
}

// Send a notification to a company's team members
export async function sendNotification(options: {
  companyId: string;
  title: string;
  content: string;
  subtitle?: string;
  userIds?: string[];
  restPath?: string;
}): Promise<boolean> {
  try {
    const result = await whop.notifications.create({
      company_id: options.companyId,
      title: options.title,
      content: options.content,
      subtitle: options.subtitle,
      user_ids: options.userIds,
      rest_path: options.restPath,
    });

    console.log("Whop notification sent:", result);
    return result.success === true;
  } catch (error) {
    console.error("Failed to send Whop notification:", error);
    return false;
  }
}
