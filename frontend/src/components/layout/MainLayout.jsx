import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

/** MainLayout — navbar + page content + footer for all public pages. */

const MainLayout = () => (
  <>
    <a className="skip-link" href="#main-content">
      Skip to main content
    </a>
    <Navbar />
    <main id="main-content" className="page">
      <Outlet />
    </main>
    <Footer />
  </>
);

export default MainLayout;
