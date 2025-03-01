import Container from "../components/Container";
import Hero from "../components/Hero";
import JustForYou from "../components/JustForYou";
import LatestArrivals from "../components/LatestArrivals";
import MainFunction from "../components/MainFunction";

export default function Home() {
  return (
    <main>
      <Hero />

      <div>
        <a href="rentalGuide">Rental Guide</a>
      </div>
      <div>
        <a href="findAHome">Find a Home</a>
      </div>
      <div>
        <a href="prepareDocuments">Prepare Documents</a>
      </div>

      <div>
        <a>LatestArrivals component</a>
      </div>
      <div>
        <a>JustForYou component</a>
      </div>
    </main>
  );
}
