import PageHeader from "../components/common/PageHeader";
import ServicesSection from "../components/home/ServicesSection";
import HowItWorks from "../components/home/HowItWorks";

/** ServicesPage — the services overview. */

const ServicesPage = () => (
  <>
    <div className="container">
      <PageHeader
        title="Our services"
        subtitle="Everything you need around a rail journey, in one place."
        crumbs={[{ label: "Home", to: "/" }, { label: "Services" }]}
      />
    </div>
    <ServicesSection />
    <HowItWorks />
  </>
);

export default ServicesPage;
