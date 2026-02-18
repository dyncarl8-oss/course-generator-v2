import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function sendWithdrawRequestEmail(params: {
  adminName: string;
  adminEmail: string | null;
  adminUsername: string | null;
  whopUserId: string;
  amount: number;
  availableBalance: number;
  totalEarnings: number;
}) {
  const { adminName, adminEmail, adminUsername, whopUserId, amount, availableBalance, totalEarnings } = params;
  
  const notificationEmail = process.env.NOTIFICATION_EMAIL;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  
  if (!resend) {
    console.error("RESEND_API_KEY is missing. Email not sent.");
    return null;
  }

  if (!notificationEmail || !fromEmail) {
    console.error("Email configuration (NOTIFICATION_EMAIL or RESEND_FROM_EMAIL) is missing.");
    return null;
  }

  const emailContent = `
    <h2>Withdraw Request from Admin</h2>
    <p>An admin has requested a withdrawal from their course earnings.</p>
    
    <h3>Admin Information:</h3>
    <ul>
      <li><strong>Name:</strong> ${adminName}</li>
      <li><strong>Username:</strong> ${adminUsername || "N/A"}</li>
      <li><strong>Email:</strong> ${adminEmail || "N/A"}</li>
      <li><strong>Whop User ID:</strong> ${whopUserId}</li>
    </ul>
    
    <h3>Withdrawal Details:</h3>
    <ul>
      <li><strong>Requested Amount:</strong> $${amount.toFixed(2)}</li>
      <li><strong>Available Balance:</strong> $${availableBalance.toFixed(2)}</li>
      <li><strong>Total Earnings:</strong> $${totalEarnings.toFixed(2)}</li>
    </ul>
    
    <p>Please process this withdrawal manually via Whop.</p>
  `;

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: notificationEmail,
      subject: `Withdraw Request from ${adminName || adminUsername || "Admin"}`,
      html: emailContent,
    });
    
    return result;
  } catch (error) {
    console.error("Failed to send withdraw request email:", error);
    throw error;
  }
}
