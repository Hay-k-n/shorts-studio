import Link from "next/link";

export const metadata = {
  title: "Terms of Service – Shorts Studio",
  description: "Terms of Service for Shorts Studio",
};

const C = {
  bg: "#050508", s2: "#13131e", b1: "#23233a",
  ac: "#00e5a0", t1: "#e8e8f4", t2: "#9090a8", t3: "#55556e",
};

export default function TermsOfService() {
  return (
    <main style={{ minHeight: "100vh", background: C.bg, color: C.t1, fontFamily: "'DM Sans', sans-serif", fontSize: 15, lineHeight: 1.7 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{ borderBottom: `1px solid ${C.b1}`, padding: "18px 0" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/" style={{ fontSize: 18, fontWeight: 800, background: `linear-gradient(135deg,${C.ac},#00c896,#4dabf7)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", textDecoration: "none" }}>
            Shorts Studio
          </Link>
          <Link href="/privacy" style={{ fontSize: 13, color: C.t2, textDecoration: "none" }}>Privacy Policy →</Link>
        </div>
      </header>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 80px" }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ color: C.t3, fontSize: 13, marginBottom: 40 }}>Last updated: April 28, 2025</p>

        <Section title="1. Acceptance of Terms">
          <p>By accessing or using Shorts Studio ("Service", "we", "our"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service. These Terms apply to all users, including visitors, registered users, and any other individuals who access the Service.</p>
        </Section>

        <Section title="2. Description of Service">
          <p>Shorts Studio is an AI-powered platform that helps creators produce short-form video content for distribution on platforms including TikTok, YouTube Shorts, and Instagram Reels. The Service integrates with third-party APIs including the TikTok API, YouTube Data API v3, Instagram Graph API, HeyGen, ElevenLabs, Twelve Labs, and Anthropic Claude.</p>
        </Section>

        <Section title="3. Account Registration">
          <p>You must create an account to use the Service. You agree to:</p>
          <ul>
            <li>Provide accurate and complete registration information</li>
            <li>Maintain the security and confidentiality of your account credentials</li>
            <li>Notify us immediately of any unauthorized use of your account</li>
            <li>Accept responsibility for all activity under your account</li>
          </ul>
          <p>You must be at least 18 years old to create an account. By creating an account, you represent that you meet this age requirement.</p>
        </Section>

        <Section title="4. Acceptable Use">
          <p>You agree to use the Service only for lawful purposes and in accordance with these Terms. You must not use the Service to:</p>
          <ul>
            <li>Create, distribute, or promote content that is illegal, harmful, defamatory, obscene, hateful, or violates any third party's rights</li>
            <li>Violate any applicable local, national, or international law or regulation</li>
            <li>Infringe upon the intellectual property rights of any third party</li>
            <li>Engage in any conduct that restricts or inhibits any other person's use of the Service</li>
            <li>Upload or transmit viruses, malware, or any other malicious code</li>
            <li>Attempt to gain unauthorized access to any part of the Service or its related systems</li>
            <li>Use the Service to generate spam, unsolicited communications, or automated bulk content</li>
            <li>Scrape, data-mine, or reverse-engineer any part of the Service</li>
          </ul>
        </Section>

        <Section title="5. Third-Party Platform Compliance">
          <p>The Service integrates with third-party platforms. By using the Service, you agree to comply with the terms and policies of each platform you connect:</p>
          <Subsection title="5.1 TikTok">
            <p>Use of TikTok integration is subject to the <a href="https://www.tiktok.com/legal/page/global/terms-of-service/en" target="_blank" rel="noopener noreferrer" style={{ color: C.ac }}>TikTok Terms of Service</a> and <a href="https://developers.tiktok.com/doc/overview-of-developer-terms/" target="_blank" rel="noopener noreferrer" style={{ color: C.ac }}>TikTok Platform Terms</a>. You may only publish content that complies with TikTok Community Guidelines. You are solely responsible for all content you post to TikTok through the Service.</p>
          </Subsection>
          <Subsection title="5.2 YouTube">
            <p>Use of YouTube integration is subject to the <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" style={{ color: C.ac }}>YouTube Terms of Service</a> and <a href="https://developers.google.com/youtube/terms/api-services-terms-of-service" target="_blank" rel="noopener noreferrer" style={{ color: C.ac }}>YouTube API Services Terms of Service</a>. By connecting a YouTube account, you authorize the Service to access and interact with the YouTube Data API v3 on your behalf. You may revoke this access at any time through your <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={{ color: C.ac }}>Google Account permissions page</a>.</p>
          </Subsection>
          <Subsection title="5.3 Instagram">
            <p>Use of Instagram integration is subject to the <a href="https://help.instagram.com/581066165581870" target="_blank" rel="noopener noreferrer" style={{ color: C.ac }}>Instagram Terms of Use</a> and <a href="https://developers.facebook.com/terms" target="_blank" rel="noopener noreferrer" style={{ color: C.ac }}>Meta Platform Terms</a>. You may only publish content that complies with Instagram Community Guidelines.</p>
          </Subsection>
        </Section>

        <Section title="6. Content and Intellectual Property">
          <Subsection title="6.1 Your Content">
            <p>You retain all ownership rights to the content you create using the Service. By submitting content through the Service, you grant Shorts Studio a limited, non-exclusive, royalty-free license to process, store, and transmit that content solely as necessary to provide the Service.</p>
          </Subsection>
          <Subsection title="6.2 Our Intellectual Property">
            <p>The Service and its original content, features, and functionality are and will remain the exclusive property of Shorts Studio and its licensors. You may not copy, modify, distribute, sell, or lease any part of the Service without our prior written consent.</p>
          </Subsection>
          <Subsection title="6.3 AI-Generated Content">
            <p>Content generated by AI tools within the Service (scripts, voice-overs, avatars) may be subject to limitations on ownership under applicable law. You are responsible for reviewing AI-generated content before publication and ensuring it does not infringe upon third-party rights.</p>
          </Subsection>
        </Section>

        <Section title="7. API Data and Third-Party Data Usage">
          <p>The Service accesses data from third-party platforms via their APIs on your behalf. This data is used solely to provide the Service's features. We do not sell, share, or use API-sourced data (including YouTube API data and TikTok API data) for any purpose other than operating the Service as described in our Privacy Policy.</p>
          <p>Data obtained through the YouTube API Services is used exclusively to enable video upload and management features as authorized by you. Such data is handled in accordance with the <a href="https://developers.google.com/youtube/terms/api-services-terms-of-service" target="_blank" rel="noopener noreferrer" style={{ color: C.ac }}>YouTube API Services Terms of Service</a> and the <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: C.ac }}>Google Privacy Policy</a>.</p>
        </Section>

        <Section title="8. Prohibited Content">
          <p>You must not use the Service to create or distribute:</p>
          <ul>
            <li>Content that depicts or promotes illegal activity</li>
            <li>Sexually explicit, pornographic, or adult content</li>
            <li>Content that harasses, bullies, or threatens individuals</li>
            <li>Misinformation, disinformation, or deliberately deceptive content</li>
            <li>Content that violates any platform's community guidelines where you intend to publish</li>
            <li>Content that infringes copyrights, trademarks, or other intellectual property rights</li>
            <li>Deepfakes or synthetic media designed to deceive without appropriate disclosure</li>
          </ul>
        </Section>

        <Section title="9. Subscriptions and Billing">
          <p>Certain features of the Service may be offered on a subscription or pay-per-use basis. All fees are stated at the point of purchase. Subscriptions automatically renew unless cancelled before the renewal date. Fees are non-refundable except where required by applicable law. We reserve the right to change pricing with reasonable notice.</p>
        </Section>

        <Section title="10. Disclaimers">
          <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.</p>
          <p>WE ARE NOT RESPONSIBLE FOR THE CONTENT, POLICIES, OR PRACTICES OF ANY THIRD-PARTY PLATFORM INTEGRATED WITH THE SERVICE, INCLUDING TIKTOK, YOUTUBE, INSTAGRAM, OR ANY OTHER PLATFORM.</p>
        </Section>

        <Section title="11. Limitation of Liability">
          <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SHORTS STUDIO SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</p>
          <p>OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING FROM THESE TERMS OR YOUR USE OF THE SERVICE SHALL NOT EXCEED THE AMOUNT PAID BY YOU TO US IN THE TWELVE MONTHS PRECEDING THE CLAIM, OR $100, WHICHEVER IS GREATER.</p>
        </Section>

        <Section title="12. Indemnification">
          <p>You agree to indemnify, defend, and hold harmless Shorts Studio and its officers, directors, employees, and agents from any claim, liability, damage, or expense (including reasonable attorneys' fees) arising from: (a) your use of the Service; (b) content you create or publish using the Service; (c) your violation of these Terms; or (d) your violation of any third party's rights.</p>
        </Section>

        <Section title="13. Termination">
          <p>We may suspend or terminate your account at any time for violations of these Terms, illegal activity, or for any other reason with reasonable notice. You may terminate your account at any time by contacting us. Upon termination, your right to use the Service ceases immediately. Provisions that by their nature should survive termination will survive, including intellectual property provisions, disclaimers, and limitations of liability.</p>
        </Section>

        <Section title="14. Modifications to Terms">
          <p>We reserve the right to modify these Terms at any time. Material changes will be communicated by updating the "Last updated" date and, where appropriate, notifying registered users by email. Continued use of the Service after changes constitutes acceptance of the revised Terms.</p>
        </Section>

        <Section title="15. Governing Law">
          <p>These Terms shall be governed by and construed in accordance with applicable law. Any disputes arising from these Terms or your use of the Service shall be subject to the exclusive jurisdiction of the competent courts.</p>
        </Section>

        <Section title="16. Contact Us">
          <p>If you have questions about these Terms of Service, please contact us:</p>
          <p style={{ color: C.t2 }}>
            <strong style={{ color: C.t1 }}>Shorts Studio</strong><br />
            Email: <a href="mailto:legal@shortsstudio.app" style={{ color: C.ac }}>legal@shortsstudio.app</a>
          </p>
        </Section>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${C.b1}`, display: "flex", gap: 24, fontSize: 13, color: C.t3 }}>
          <Link href="/privacy" style={{ color: C.ac, textDecoration: "none" }}>Privacy Policy</Link>
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
