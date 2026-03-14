import sgMail from "@sendgrid/mail";

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error("X_REPLIT_TOKEN not found for repl/depl");
  }

  connectionSettings = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=sendgrid",
    {
      headers: {
        Accept: "application/json",
        X_REPLIT_TOKEN: xReplitToken,
      },
    },
  )
    .then((res) => res.json())
    .then((data) => data.items?.[0]);

  if (
    !connectionSettings ||
    !connectionSettings.settings.api_key ||
    !connectionSettings.settings.from_email
  ) {
    throw new Error("SendGrid not connected");
  }
  return {
    apiKey: connectionSettings.settings.api_key,
    email: connectionSettings.settings.from_email,
  };
}

async function getUncachableSendGridClient() {
  const { apiKey, email } = await getCredentials();
  sgMail.setApiKey(apiKey);
  return {
    client: sgMail,
    fromEmail: email,
  };
}

export async function sendMessageEmailNotification({
  recipientEmail,
  recipientName,
  senderName,
  messageContent,
  conversationId,
}: {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  messageContent: string;
  conversationId: string;
}) {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();

    const truncatedContent =
      messageContent.length > 500
        ? messageContent.substring(0, 500) + "..."
        : messageContent;

    await client.send({
      to: recipientEmail,
      from: {
        email: fromEmail,
        name: "Tripsbnb",
      },
      subject: `New message from ${senderName} - Tripsbnb`,
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0;">
          <div style="background: linear-gradient(135deg, #1A4D2E 0%, #2D6B45 100%); padding: 32px 24px; text-align: center;">
            <h1 style="color: #DAA520; margin: 0; font-size: 28px; font-family: 'Georgia', serif;">Tripsbnb</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 12px;">Powered by TripVerse</p>
          </div>
          <div style="background: #FAFAF5; padding: 32px 24px;">
            <p style="color: #333; font-size: 16px; margin: 0 0 8px;">Hi ${recipientName},</p>
            <p style="color: #555; font-size: 14px; margin: 0 0 24px;">You have a new message from <strong style="color: #1A4D2E;">${senderName}</strong>:</p>
            <div style="background: #FFFFFF; border-left: 4px solid #DAA520; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 0 0 24px;">
              <p style="color: #333; font-size: 14px; line-height: 1.6; margin: 0;">${truncatedContent}</p>
            </div>
            <div style="text-align: center;">
              <p style="color: #888; font-size: 13px;">Open your Tripsbnb app to reply</p>
            </div>
          </div>
          <div style="background: #1A4D2E; padding: 16px 24px; text-align: center;">
            <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin: 0;">This is an automated notification from Tripsbnb. Do not reply to this email.</p>
          </div>
        </div>
      `,
    });

    console.log(`Email notification sent to ${recipientEmail} for conversation ${conversationId}`);
    return true;
  } catch (error: any) {
    console.error("Failed to send email notification:", error?.message || error);
    return false;
  }
}
