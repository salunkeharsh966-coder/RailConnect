import HeroSection from "../components/home/HeroSection";
import BookingSearchForm from "../components/home/BookingSearchForm";
import PopularRoutes from "../components/home/PopularRoutes";
import WhyRailConnect from "../components/home/WhyRailConnect";
import HowItWorks from "../components/home/HowItWorks";
import ServicesSection from "../components/home/ServicesSection";

/** HomePage — the landing page. */

const HomePage = () => (
  <>
    <HeroSection>
      <BookingSearchForm />
    </HeroSection>
    <PopularRoutes />
    <WhyRailConnect />
    <HowItWorks />
    <ServicesSection />
  </>
);

export default HomePage;
