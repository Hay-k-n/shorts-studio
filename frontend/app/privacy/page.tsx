import Link from "next/link";

export const metadata = {
  title: "Privacy Policy – Shorts Studio",
  description: "Privacy Policy for Shorts Studio",
};

const C = {
  bg: "#050508", s2: "#13131e", b1: "#23233a",
  ac: "#00e5a0", t1: "#e8e8f4", t2: "#9090a8", t3: "#55556e",
};

export default function PrivacyPolicy() {
  return (
    <main style={{ minHeight: "100vh", background: C.bg, color: C.t1, fontFamily: "'DM Sans', sans-serif", fontSize: 15, lineHeight: 1.7 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{ borderBottom: `1px solid ${C.b1}`, padding: "18px 0" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/" style={{ fontSize: 18, fontWeight: 800, background: `linear-gradient(135deg,${C.ac},#00c896,#4dabf7)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", textDecoration: "none" }}>
            Shorts Studio
          </Link>
          <Link href="/tos" style={{ fontSize: 13, color: C.t2, textDecoration: "none" }}>Terms of Service →</Link>
        </div>
      </header>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 80px" }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: C.t3, fontSize: 13, marginBottom: 40 }}>Last updated: April 28, 2025</p>

        <Section title="1. Introduction">
          <p>Shorts Studio ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our AI-powered short-form video creation platform ("Service").</p>
          <p>By using the Service, you consent to the data practices described in this Policy. If you do not agree, please discontinue use of the Service.</p>
        </Section>

        <Section title="2. Information We Collect">
          <Subsection title="2.1 Information You Provide">
            <ul>
              <li><strong>Account information:</strong> Name, email address, and password when you register</li>
              <li><strong>Workspace information:</strong> Workspace name and team member details</li>
              <li><strong>API credentials:</strong> Third-party API keys and access tokens you connect to your workspace (HeyGen, ElevenLabs, TikTok, YouTube, Instagram). These are stored encrypted and used solely to provide the Service.</li>
              <li><strong>Content:</strong> Scripts, captions, and other text content you create or input into the Service</li>
            </ul>
          </Subsection>
          <Subsection title="2.2 Information Collected Automatically">
            <ul>
              <li><strong>Usage data:</strong> How you interact with the Service, features used, and actions taken</li>
              <li><strong>Log data:</strong> IP address, browser type, operating system, pages visited, and timestamps</li>
              <li><strong>Cookies and similar technologies:</strong> Session cookies and authentication tokens necessary for the Service to function</li>
            </ul>
          </Subsection>
          <Subsection title="2.3 Data from Third-Party APIs">
            <p>When you connect third-party platform accounts, we access data through their APIs strictly to provide the Service's features:</p>
            <ul>
              <li><strong>TikTok API:</strong> Access tokens and account information necessary to publish content on your behalf to TikTok</li>
              <li><strong>YouTube Data API v3:</strong> Channel information, video upload capabilities, and account authorization tokens to enable video publishing to YouTube on your behalf</li>
              <li><strong>Instagram Graph API:</strong> Access tokens and account details to enable content publishing to Instagram on your behalf</li>
            </ul>
            <p>We access only the minimum data required for the specific features you use. We do not access, store, or process your social media followers, messages, comments, or any data beyond what is required to publish content on your behalf.</p>
          </Subsection>
        </Section>

        <Section title="3. How We Use Your Information">
          <p>We use the information we collect to:</p>
          <ul>
            <li>Create and manage your account and workspace</li>
            <li>Provide, operate, and improve the Service</li>
            <li>Authenticate you and maintain session security</li>
            <li>Process and fulfill your requests (video generation, publishing, etc.)</li>
            <li>Communicate service-related notices, updates, and support responses</li>
            <li>Monitor and analyze usage patterns to improve user experience</li>
            <li>Detect and prevent fraud, abuse, and security incidents</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p>We do not use your data, including data obtained through third-party APIs, for advertising, profiling unrelated to the Service, or any purpose other than providing and improving the Service.</p>
        </Section>

        <Section title="4. YouTube API Services Data">
          <p>Shorts Studio uses the YouTube Data API v3 to enable video upload and channel management features. Our use of YouTube API data complies with the <a href="https://developers.google.com/youtube/terms/api-services-terms-of-service" target="_blank" rel="noopener noreferrer" style={{ color: C.ac }}>YouTube API Services Terms of Service</a> and the <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: C.ac }}>Google Privacy Policy</a>.</p>
          <ul>
            <li><strong>What we access:</strong> YouTube account authorization (OAuth tokens) and the ability to upload videos to your channel</li>
            <li><strong>How we use it:</strong> Solely to upload videos you have created within the Service to your YouTube channel upon your request</li>
            <li><strong>Storage:</strong> OAuth tokens are stored encrypted and used only to perform actions you explicitly request. We do not store video metadata, channel analytics, or subscriber data.</li>
            <li><strong>Revocation:</strong> You can revoke Shorts Studio's access to your YouTube account at any time by visiting your <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={{ color: C.ac }}>Google Account permissions page</a> and removing Shorts Studio. You can also disconnect YouTube from within the Service's workspace settings.</li>
            <li><strong>Deletion:</strong> Upon revocation or account deletion, we delete your stored YouTube OAuth tokens within 30 days.</li>
          </ul>
        </Section>

        <Section title="5. TikTok API Data">
          <p>Shorts Studio uses the TikTok API to enable content publishing to TikTok. Our use of TikTok API data complies with the <a href="https://www.tiktok.com/legal/page/global/privacy-policy/en" target="_blank" rel="noopener noreferrer" style={{ color: C.ac }}>TikTok Privacy Policy</a> and <a href="https://developers.tiktok.com/doc/overview-of-developer-terms/" target="_blank" rel="noopener noreferrer" style={{ color: C.ac }}>TikTok Platform Terms</a>.</p>
          <ul>
            <li><strong>What we access:</strong> TikTok account authorization tokens and the ability to publish content to your TikTok account</li>
            <li><strong>How we use it:</strong> Solely to post videos you have created within the Service to your TikTok account upon your explicit request</li>
            <li><strong>Storage:</strong> TikTok access tokens are stored encrypted in our database and are used only to perform publishing actions you explicitly initiate</li>
            <li><strong>Revocation:</strong> You can revoke Shorts Studio's access to your TikTok account at any time through TikTok's app settings under "Manage App Permissions", or by disconnecting TikTok from within the Service's workspace settings</li>
            <li><strong>Deletion:</strong> Upon disconnection or account deletion, stored TikTok tokens are deleted within 30 days</li>
          </ul>
        </Section>

        <Section title="6. Data Sharing and Disclosure">
          <p>We do not sell, rent, or trade your personal information. We may share your data only in the following circumstances:</p>
          <ul>
            <li><strong>Service providers:</strong> Trusted third-party vendors who assist us in operating the Service (cloud hosting, database, AI processing). These vendors are bound by confidentiality obligations and may not use your data for their own purposes.</li>
            <li><strong>Third-party platforms:</strong> When you instruct us to publish content to TikTok, YouTube, Instagram, or other platforms, we transmit the necessary data to those platforms on your behalf.</li>
            <li><strong>Legal requirements:</strong> If required by law, court order, or governmental authority, or to protect the rights, property, or safety of Shorts Studio, our users, or others.</li>
            <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets, in which case we will notify you before your data is transferred and becomes subject to a different privacy policy.</li>
          </ul>
          <p>We do not share data obtained through third-party APIs (YouTube, TikTok, Instagram) with any party other than the platform itself, as required to deliver the requested feature.</p>
        </Section>

        <Section title="7. Data Retention">
          <p>We retain your personal data for as long as your account is active or as necessary to provide the Service. Specifically:</p>
          <ul>
            <li><strong>Account data:</strong> Retained until you delete your account, plus 30 days for backup purposes</li>
            <li><strong>API credentials (OAuth tokens):</strong> Retained until you disconnect the integration or delete your account, whichever comes first. Deleted within 30 days of disconnection.</li>
            <li><strong>Generated videos and content:</strong> Retained in storage for 90 days after generation unless you explicitly delete them earlier</li>
            <li><strong>Usage and log data:</strong> Retained for up to 12 months for security and analytics purposes</li>
          </ul>
          <p>To request deletion of your data, contact us at <a href="mailto:privacy@shortsstudio.app" style={{ color: C.ac }}>privacy@shortsstudio.app</a>.</p>
        </Section>

        <Section title="8. Data Security">
          <p>We implement industry-standard security measures to protect your information:</p>
          <ul>
            <li>All data is transmitted over encrypted HTTPS connections</li>
            <li>API keys, OAuth tokens, and credentials are stored encrypted at rest</li>
            <li>Access to production systems is restricted to authorized personnel only</li>
            <li>We conduct regular security reviews and vulnerability assessments</li>
          </ul>
          <p>No method of transmission over the internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your data, we cannot guarantee absolute security.</p>
        </Section>

        <Section title="9. Cookies">
          <p>We use the following types of cookies:</p>
          <ul>
            <li><strong>Authentication cookies:</strong> Necessary cookies that maintain your logged-in session. These are required for the Service to function and cannot be disabled.</li>
            <li><strong>Workspace preference cookies:</strong> Remember your selected workspace across sessions</li>
          </ul>
          <p>We do not use advertising cookies or track you across third-party websites.</p>
        </Section>

        <Section title="10. Your Rights">
          <p>Depending on your location, you may have the following rights regarding your personal data:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
            <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
            <li><strong>Deletion:</strong> Request deletion of your personal data ("right to be forgotten")</li>
            <li><strong>Portability:</strong> Request your data in a machine-readable format</li>
            <li><strong>Restriction:</strong> Request that we restrict processing of your data in certain circumstances</li>
            <li><strong>Objection:</strong> Object to certain types of processing of your data</li>
            <li><strong>Withdraw consent:</strong> Withdraw consent for data processing where consent is the legal basis</li>
          </ul>
          <p>To exercise any of these rights, contact us at <a href="mailto:privacy@shortsstudio.app" style={{ color: C.ac }}>privacy@shortsstudio.app</a>. We will respond within 30 days.</p>
        </Section>

        <Section title="11. Children's Privacy">
          <p>The Service is not directed to individuals under the age of 18. We do not knowingly collect personal information from children under 18. If we become aware that a child under 18 has provided us with personal information, we will delete it promptly. If you believe a child has provided us with personal information, please contact us at <a href="mailto:privacy@shortsstudio.app" style={{ color: C.ac }}>privacy@shortsstudio.app</a>.</p>
        </Section>

        <Section title="12. International Data Transfers">
          <p>Your information may be processed and stored in countries other than your country of residence. We ensure that any such transfers are subject to appropriate safeguards in accordance with applicable data protection law. By using the Service, you consent to the transfer of your information to countries that may have different data protection rules than your country.</p>
        </Section>

        <Section title="13. Third-Party Links and Services">
          <p>The Service may contain links to third-party websites or integrate with third-party services. This Privacy Policy does not apply to those third-party services. We encourage you to review the privacy policies of any third-party services you connect to through the Service, including:</p>
          <ul>
            <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: C.ac }}>Google / YouTube Privacy Policy</a></li>
            <li><a href="https://www.tiktok.com/legal/page/global/privacy-policy/en" target="_blank" rel="noopener noreferrer" style={{ color: C.ac }}>TikTok Privacy Policy</a></li>
            <li><a href="https://privacycenter.instagram.com/policy" target="_blank" rel="noopener noreferrer" style={{ color: C.ac }}>Instagram / Meta Privacy Policy</a></li>
          </ul>
        </Section>

        <Section title="14. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. Material changes will be communicated by updating the "Last updated" date at the top of this page and, where appropriate, notifying you by email. We encourage you to review this Policy periodically. Continued use of the Service after changes constitutes your acceptance of the updated Policy.</p>
        </Section>

        <Section title="15. Contact Us">
          <p>If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
          <p style={{ color: C.t2 }}>
            <strong style={{ color: C.t1 }}>Shorts Studio</strong><br />
            Email: <a href="mailto:privacy@shortsstudio.app" style={{ color: C.ac }}>privacy@shortsstudio.app</a>
          </p>
          <p>For data deletion requests, please email with the subject "Data Deletion Request" and include your registered email address. We will process your request within 30 days.</p>
        </Section>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${C.b1}`, display: "flex", gap: 24, fontSize: 13, color: C.t3 }}>
          <Link href="/tos" style={{ color: C.ac, textDecoration: "none" }}>Terms of Service</Link>
          <Link href="/login" style={{ color: C.t3, textDecoration: "none" }}>Back to App</Link>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e8e8f4", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #23233a" }}>{title}</h2>
      <div style={{ color: "#b0b0c8", display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </section>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 12 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#e8e8f4", marginBottom: 6 }}>{title}</h3>
      <div>{children}</div>
    </div>
  );
}
