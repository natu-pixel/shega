import { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Terms of Service",
  description: `${SITE_NAME} terms of service — terms governing use of our website and services.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main className="shega-legal-page">
      <section className="shega-legal-section">
        <div className="shega-container shega-legal-grid">
          <div className="shega-legal-left">
            <h1 className="shega-legal-title">Terms of Service</h1>
            <p className="shega-legal-intro">
              Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
            <nav className="shega-legal-nav">
              <a href="#acceptance-of-terms">Acceptance of terms</a>
              <a href="#use-of-website">Use of website</a>
              <a href="#intellectual-property">Intellectual property</a>
              <a href="#limitation-of-liability">Limitation of liability</a>
              <a href="#governing-law">Governing law</a>
              <a href="#contact-us">Contact us</a>
            </nav>
          </div>
          <div className="shega-legal-right">
            <section id="acceptance-of-terms" className="shega-legal-block">
              <h2>Acceptance of terms</h2>
              <p>
                By accessing or using our website, you agree to be bound by these Terms of Service. If
                you do not agree, you may not use our website or services.
              </p>
            </section>
            <section id="use-of-website" className="shega-legal-block">
              <h2>Use of website</h2>
              <p>
                You agree to use our website only for lawful purposes and in accordance with these terms.
                You may not misuse our services, attempt to interfere with the website's operation, or
                post content that is unlawful, harmful, or objectionable.
              </p>
            </section>
            <section id="intellectual-property" className="shega-legal-block">
              <h2>Intellectual property</h2>
              <p>
                All content on this website, including text, images, logos, and designs, is owned by
                {SITE_NAME} or its licensors and is protected by copyright and trademark law. You may not
                reproduce or distribute any content without our prior written consent.
              </p>
            </section>
            <section id="limitation-of-liability" className="shega-legal-block">
              <h2>Limitation of liability</h2>
              <p>
                To the fullest extent permitted by law, {SITE_NAME} is not liable for any indirect,
                incidental, or consequential damages arising out of your use of our website or services.
              </p>
            </section>
            <section id="governing-law" className="shega-legal-block">
              <h2>Governing law</h2>
              <p>
                These terms are governed by and construed in accordance with the laws of Ethiopia,
                without regard to its conflict of law principles.
              </p>
            </section>
            <section id="contact-us" className="shega-legal-block">
              <h2>Contact us</h2>
              <p>
                If you have questions about these Terms of Service, please contact us at
                <a href="mailto:info@shega.events">info@shega.events</a> or through our Instagram at
                <a href="https://www.instagram.com/shega_events/">@shega_events</a>.
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
