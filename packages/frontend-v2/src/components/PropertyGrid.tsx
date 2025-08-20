import PropertyCard from './PropertyCard'
import Section from './Section'

const sampleProperties = [
  {
    id: 1,
    title: "[Fully Furnished] Three-bedroom Apartment, Close to the Metro",
    location: "123 Main St, Anytown",
    price: 2500,
    description: "Move-in ready · Near metro · South-facing · Bright and airy",
    imageUrl: "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?q=80&w=1600&auto=format&fit=crop"
  },
  {
    id: 2,
    title: "Sunny Two-bedroom with Balcony, City Center",
    location: "Downtown District",
    price: 1980,
    description: "Convenient transportation · Shopping nearby · Pet friendly",
    imageUrl: "https://images.unsplash.com/photo-1560185008-b033106af2f6?q=80&w=1600&auto=format&fit=crop"
  },
  {
    id: 3,
    title: "[Newly Renovated] One-bedroom Loft Near Park",
    location: "Green Park Area",
    price: 1450,
    description: "Quiet neighborhood · Fully equipped kitchen · Ready to move in",
    imageUrl: "https://images.unsplash.com/photo-1502005229762-cf1b2da7c54a?q=80&w=1600&auto=format&fit=crop"
  },
  {
    id: 4,
    title: "Spacious Three-bed with Garden, Family Friendly",
    location: "Lakeside Community",
    price: 2750,
    description: "Private garden · Nearby schools · Two parking spaces",
    imageUrl: "https://images.unsplash.com/photo-1597047084890-89e55f18a8b2?q=80&w=1600&auto=format&fit=crop"
  },
  {
    id: 5,
    title: "Compact Studio Near University",
    location: "Campus East",
    price: 980,
    description: "Furnished · Walk to campus · Laundry on-site",
    imageUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1600&auto=format&fit=crop"
  },
  {
    id: 6,
    title: "High-rise Two-bedroom with City View",
    location: "Financial District",
    price: 3100,
    description: "Gym · 24/7 security · Subway downstairs",
    imageUrl: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1600&auto=format&fit=crop"
  },
  {
    id: 7,
    title: "Cozy One-bedroom Near Riverwalk",
    location: "Riverside",
    price: 1350,
    description: "Scenic views · Bike friendly · Cafes nearby",
    imageUrl: "https://images.unsplash.com/photo-1600607687920-4ce8c559d8df?q=80&w=1600&auto=format&fit=crop"
  },
  {
    id: 8,
    title: "Townhouse with Garage and Patio",
    location: "Maple Street, Suburbs",
    price: 2200,
    description: "Quiet cul-de-sac · Storage space · Recently updated",
    imageUrl: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1600&auto=format&fit=crop"
  }
]

export default function PropertyGrid() {
  return (
    <Section title="Daily New Houses">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sampleProperties.map((property) => (
          <PropertyCard
            key={property.id}
            title={property.title}
            location={property.location}
            price={property.price}
            description={property.description}
            imageUrl={property.imageUrl}
          />
        ))}
      </div>
    </Section>
  )
}


