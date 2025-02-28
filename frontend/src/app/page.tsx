import Container from "../components/Container";
import Hero from "../components/Hero";
import JustForYou from "../components/JustForYou";
import LatestArrivals from "../components/LatestArrivals";
import MainFunction from "../components/MainFunction";

export default function Home() {
  return (
    <main>
      <Hero />

      {/* <Container className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl mt-12">
        <MainFunction />
        <LatestArrivals />
      </Container>

      <Container className="w-full">
        <JustForYou />
      </Container> */}
      <div>
        <a>Main Function page</a>
      </div>
      <div>
        <a>LatestArrivals page</a>
      </div>
      <div>
        <a>JustForYou page</a>
      </div>
    </main>
  );
}
