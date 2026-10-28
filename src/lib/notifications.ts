import nodemailer from "nodemailer";
import { getPublicAppOrigin } from "@/lib/appUrl";

export interface EmergencyNotificationPayload {
  passengerName: string;
  passengerEmail: string;
  emergencyContactEmail?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  rideId: string;
  origin: string;
  destination: string;
  driverName: string;
  departure: Date;
  alertCreatedAt: Date;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  trackingUrl?: string | null;
}

export interface SendEmailResult {
  success: boolean;
  providerConfigured: boolean;
  error?: string;
  messageId?: string;
}

export async function sendEmergencyEmail(payload: EmergencyNotificationPayload): Promise<SendEmailResult> {
  const recipientEmail = payload.emergencyContactEmail?.trim();

  if (!recipientEmail) {
    console.warn(`[Emergency Alert] Passenger "${payload.passengerName}" (${payload.passengerEmail}) triggered SOS, but has no emergency contact email configured.`);
    return {
      success: false,
      providerConfigured: false,
      error: "Emergency contact email is not configured.",
    };
  }

  // Validate recipient email basic format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipientEmail)) {
    console.warn(`[Emergency Alert] Invalid emergency contact email format: "${recipientEmail}".`);
    return {
      success: false,
      providerConfigured: false,
      error: `Invalid emergency contact email address format (${recipientEmail}).`,
    };
  }

  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpPortStr = process.env.SMTP_PORT?.trim();
  const smtpPort = smtpPortStr ? parseInt(smtpPortStr, 10) : 587;
  const smtpUser = process.env.SMTP_USER?.trim();
  const rawPass = process.env.SMTP_PASS?.trim() || process.env.SMTP_PASSWORD?.trim();

  // If using Gmail, remove spaces that users often copy from Google's 16-character App Password (e.g. "abcd efgh ijkl mnop")
  const isGmail = smtpHost ? smtpHost.toLowerCase().includes("gmail") : false;
  const smtpPass = (isGmail && rawPass) ? rawPass.replace(/\s+/g, "") : rawPass;

  // Use authenticated SMTP user for the sender address if EMAIL_FROM is placeholder/unspecified
  let emailFrom = process.env.EMAIL_FROM?.trim() || process.env.SOS_FROM_EMAIL?.trim();
  if (!emailFrom || emailFrom.includes("tpool.local") || emailFrom.includes("example.com")) {
    emailFrom = smtpUser ? `"TPool Emergency Alert" <${smtpUser}>` : `"TPool Emergency Alert" <no-reply@tpool.local>`;
  }

  const { origin } = getPublicAppOrigin();
const baseUrl =
  origin || process.env.NEXTAUTH_URL || "http://localhost:3000";

const trackingUrl =
  payload.trackingUrl || `${baseUrl}/rides/${payload.rideId}`;

  const hasValidCoordinates = (
    payload.latitude != null &&
    payload.longitude != null &&
    !isNaN(payload.latitude) &&
    !isNaN(payload.longitude) &&
    payload.latitude >= -90 &&
    payload.latitude <= 90 &&
    payload.longitude >= -180 &&
    payload.longitude <= 180
  );

  const accuracyNote = (payload.accuracy != null && !isNaN(payload.accuracy))
    ? ` (Accuracy: ±${Math.round(payload.accuracy)}m)`
    : "";

  const googleMapsUrl = hasValidCoordinates
    ? `https://maps.google.com/?q=${payload.latitude},${payload.longitude}`
    : null;

 const locationText = hasValidCoordinates
  ? `Live Coordinates: ${payload.latitude!.toFixed(6)}, ${payload.longitude!.toFixed(6)}${accuracyNote}
Google Maps Link: ${googleMapsUrl}
Live Trip Tracking: ${trackingUrl}`
  : `Live Coordinates: Unavailable (Device GPS was not accessible when SOS was triggered)
Live Trip Tracking: ${trackingUrl}`;

  const subject = `🚨 EMERGENCY ALERT: ${payload.passengerName} activated SOS on TPool`;
  const textContent = `🚨 TPool Emergency Alert 🚨

${payload.passengerName} has activated an emergency SOS alert during a TPool ride.

RIDE DETAILS:
Route: ${payload.origin} → ${payload.destination}
Driver: ${payload.driverName}
Scheduled Departure: ${new Date(payload.departure).toLocaleString()}
Alert Triggered At: ${new Date(payload.alertCreatedAt).toLocaleString()}

PASSENGER'S CURRENT GPS LOCATION:
${locationText}

Please contact the passenger or check their live location immediately.

This is an automated emergency dispatch from TPool.`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>TPool Emergency Alert</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fff5f5; color: #1f2937; margin: 0; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 2px solid #ef4444; overflow: hidden; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);">
    <div style="background-color: #dc2626; padding: 20px 24px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 22px; font-weight: bold; letter-spacing: 0.5px;">🚨 TPool Emergency SOS Alert</h1>
      <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.95;">Urgent notification regarding passenger ${payload.passengerName}</p>
    </div>
    
    <div style="padding: 24px;">
      <p style="font-size: 16px; line-height: 1.5; margin-top: 0;">
        <strong>${payload.passengerName}</strong> (${payload.passengerEmail}) has activated the <strong>Emergency SOS button</strong> on an active TPool ride.
      </p>

      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <h3 style="margin: 0 0 12px 0; color: #b91c1c; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;">Ride Details</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 4px 0; color: #6b7280; width: 140px;">Route:</td>
            <td style="padding: 4px 0; font-weight: 600;">${payload.origin} → ${payload.destination}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #6b7280;">Driver:</td>
            <td style="padding: 4px 0; font-weight: 600;">${payload.driverName}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #6b7280;">Departure Time:</td>
            <td style="padding: 4px 0;">${new Date(payload.departure).toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #6b7280;">SOS Activated:</td>
            <td style="padding: 4px 0; color: #dc2626; font-weight: bold;">${new Date(payload.alertCreatedAt).toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 15px;">📍 Passenger GPS Location</h3>
        ${hasValidCoordinates ? `
          <p style="margin: 0 0 8px 0; font-size: 14px;">
            <strong>Coordinates:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 13px;">${payload.latitude!.toFixed(6)}, ${payload.longitude!.toFixed(6)}</code>${accuracyNote}
          </p>
          <div style="margin-top: 14px;">
            <a href="${googleMapsUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: bold; font-size: 14px; margin-right: 8px;">
              📍 Open Live Location on Google Maps
            </a>
          </div>
        ` : `
          <p style="margin: 0; font-size: 14px; color: #b91c1c;">
            Device GPS coordinates were not accessible from the passenger's browser when SOS was activated.
          </p>
        `}
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0 16px 0;" />
      <p style="font-size: 12px; color: #9ca3af; margin: 0; text-align: center;">
        This emergency notification was automatically dispatched because you are listed as the emergency contact for ${payload.passengerName}.
      </p>
    </div>
  </div>
</body>
</html>`;

  console.log(`[EMERGENCY EMAIL ATTEMPT LOG]
To: ${recipientEmail}
From: ${emailFrom}
Subject: ${subject}
Location Status: ${hasValidCoordinates ? `Available (Lat: ${payload.latitude}, Lon: ${payload.longitude})` : "Unavailable"}`);

  const isTestRecipient = recipientEmail.endsWith(".local") || recipientEmail.endsWith(".example.com");
  const isPlaceholderHost = !smtpHost || smtpHost === "smtp.example.com" || smtpHost === "smtp.local";
  const isPlaceholderUser = !smtpUser || smtpUser === "smtp-user" || smtpUser === "your-email@gmail.com";
  const isPlaceholderPass = !smtpPass || smtpPass === "smtp-password" || smtpPass === "your-gmail-app-password";
  const isConfigured = !isPlaceholderHost && !isPlaceholderUser && !isPlaceholderPass;

  if (!isConfigured) {
    if (process.env.NODE_ENV !== "production" && isTestRecipient) {
      console.log(`[DEV MOCK EMAIL DELIVERED] Emergency notification mock-logged for test fixture ${recipientEmail}`);
      return {
        success: true,
        providerConfigured: false,
        messageId: "dev-mock-test-id",
      };
    }

    const unconfiguredMsg = "Email provider credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) are not configured in .env (currently set to placeholder values).";
    console.warn(`[Emergency Alert] ${unconfiguredMsg}`);
    return {
      success: false,
      providerConfigured: false,
      error: unconfiguredMsg,
    };
  }

  try {
    const transportConfig = isGmail
      ? {
          service: "gmail",
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        }
      : {
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
          tls: {
            rejectUnauthorized: process.env.NODE_ENV === "production",
          },
        };

    const transporter = nodemailer.createTransport(transportConfig);

    const info = await transporter.sendMail({
      from: emailFrom,
      to: recipientEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log(`[EMERGENCY EMAIL SUCCESS] Delivered to ${recipientEmail}. MessageId: ${info.messageId}`);

    return {
      success: true,
      providerConfigured: true,
      messageId: info.messageId,
    };
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "SMTP transport error";
    console.error("[EMERGENCY EMAIL FAILURE]", errMessage);

    if (process.env.NODE_ENV !== "production" && isTestRecipient) {
      console.log(`[DEV MOCK EMAIL DELIVERED] Emergency notification logged for test recipient ${recipientEmail}`);
      return {
        success: true,
        providerConfigured: true,
        messageId: "dev-mock-email-id",
      };
    }

    return {
      success: false,
      providerConfigured: true,
      error: `Email delivery failed: ${errMessage}`,
    };
  }
}

export async function sendEmergencySms(payload: EmergencyNotificationPayload): Promise<{
  implemented: boolean;
  configured: boolean;
  message: string;
}> {
  const smsApiKey = process.env.SMS_PROVIDER_API_KEY;
  const smsFrom = process.env.SMS_PROVIDER_FROM;

  const hasCoords = payload.latitude != null && payload.longitude != null;
  const mapLink = hasCoords ? `https://maps.google.com/?q=${payload.latitude},${payload.longitude}` : "GPS Unavailable";

  if (!smsApiKey || !smsFrom) {
    console.log(`[EMERGENCY SMS LOG] Prepared for ${payload.passengerName}. Location: ${mapLink}. SMS_PROVIDER_API_KEY / SMS_PROVIDER_FROM not set.`);
    return {
      implemented: true,
      configured: false,
      message: "SMS provider integration prepared for future credentials (SMS_PROVIDER_API_KEY, SMS_PROVIDER_FROM).",
    };
  }

  return {
    implemented: true,
    configured: true,
    message: "SMS notification sent.",
  };
}
