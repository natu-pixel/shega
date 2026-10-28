import { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Privacy Policy",
  description: `${SITE_NAME} information about personal data used through this website.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="shega-legal-page">
      <section className="shega-legal-section">
        <div className="shega-container shega-legal-grid">
          <div className="shega-legal-left">
            <h1 className="shega-legal-title">Privacy Policy</h1>
            <p className="shega-legal-intro">Last updated: October 17, 2026</p>
            <nav className="shega-legal-nav">
              <a href="#who-we-are">Who we are</a>
              <a href="#information-we-handle">Information we handle</a>
              <a href="#how-we-use-information">How we use information</a>
              <a href="#retention-and-rights">Retention and your rights</a>
              <a href="#contact-us">Contact us</a>
            </nav>
          </div>
          <div className="shega-legal-right">
            <section id="who-we-are" className="shega-legal-block">
              <h2>Who we are</h2>
              <p>
                Shega Events operates this website from Addis Ababa, Ethiopia. For privacy requests,
                contact <a href="mailto:info@shega.events">info@shega.events</a>.
              </p>
            </section>
            <section id="information-we-handle" className="shega-legal-block">
              <h2>Information we handle</h2>
              <p>
                If you fill out the event inquiry form, the details you enter (name, email address,
                event type, and any optional date, guest estimate, and message) stay in your browser
                until you choose to open your email app. The form prepares a draft addressed to
                info@shega.events; it does not submit the details to this website. If you send that
                email, your email provider and the recipient’s email service will handle and store it.
              </p>
              <p>
                Our hosting and security providers may process technical request information, such
                as IP address, browser information, and request time, to deliver and protect the site.
                The site code does not include analytics or advertising trackers. See our <a href="/cookies">Cookies Policy</a>.
              </p>
            </section>
            <section id="how-we-use-information" className="shega-legal-block">
              <h2>How we use information</h2>
              <p>
                We use an inquiry you choose to send to respond to your event request and discuss
                related services. We use technical request information for website delivery and
                security. The website has no user registration, account, or checkout feature.
              </p>
            </section>
            <section id="retention-and-rights" className="shega-legal-block">
              <h2>Retention and your rights</h2>
              <p>
                We do not retain inquiry details through this website. If you email us, we retain the
                message in our email systems only as long as needed to respond, manage the business
                relationship, and meet legal requirements. You may ask us for access to, correction
                of, or erasure of personal data we hold, or object to or ask us to restrict its
                processing, by emailing <a href="mailto:info@shega.events">info@shega.events</a>.
                Legal retention duties may limit erasure. You may also contact the competent Ethiopian
                data protection authority.
              </p>
              <p>
                The project is configured for deployment on Cloudflare Workers. We have not
                verified the live hosting, security, or email providers’ data handling terms or
                physical data locations. Do not send sensitive personal information through the
                inquiry form.
              </p>
            </section>
            <section id="contact-us" className="shega-legal-block">
              <h2>Contact us</h2>
              <p>
                For privacy questions or requests, email <a href="mailto:info@shega.events">info@shega.events</a>.
                This notice describes the website as currently built; our actual business and service
                provider details should be confirmed by Shega Events before launch.
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
