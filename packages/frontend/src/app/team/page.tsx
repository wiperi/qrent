export default function Team() {
  const team = [
    {
      name: 'Zhiyang Yu',
      role: '',
      bio: 'Product visionary with a strong business background. Zhiyang drives QRent&apos;s strategic direction, ensuring the platform meets real market needs while building sustainable growth for the company.',
      expertise: 'Product Strategy, Business Development',
    },
    {
      name: 'Tianyang(Cliff) Chen',
      role: '',
      bio: 'System architect and DevOps expert who designed QRent&apos;s scalable infrastructure. Cliff ensures seamless deployment pipelines and robust full-stack solutions that power our platform.',
      expertise: 'System Architecture, DevOps, Full Stack',
    },
    {
      name: 'Yibin(Zack) Zhang',
      role: '',
      bio: 'Data specialist who transforms raw property information into actionable insights. Yibin builds the data pipelines and analytics that help users make informed rental decisions.',
      expertise: 'Data Engineering, Data Analytics',
    },
    {
      name: 'Yuting Bai',
      role: '',
      bio: 'Frontend developer focused on creating intuitive and responsive user experiences. Yuting crafts the interfaces that make property searching effortless and enjoyable.',
      expertise: 'Frontend Development, React, UI/UX',
    },
    {
      name: 'Qixin Yang',
      role: '',
      bio: 'Frontend engineer passionate about performance and accessibility. Qixin ensures QRent delivers a fast, polished experience across all devices and browsers.',
      expertise: 'Frontend Development, Performance Optimization',
    },
    {
      name: 'Zhongtao Du',
      role: '',
      bio: 'AI specialist building intelligent chatbot solutions. Zhongtao develops conversational interfaces that help users find their perfect rental through natural language interactions.',
      expertise: 'AI, Chatbots',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Meet Our Team</h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            We&apos;re a diverse group of developers, designers, and rental market enthusiasts working
            together to revolutionize the way people find their homes.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {team.map(member => (
            <div
              key={member.name}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6"
            >
              <div className="mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">
                    {member.name
                      .split(' ')
                      .map(n => n[0])
                      .join('')}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900">{member.name}</h3>
                {/* <p className="text-blue-600 font-medium">{member.role}</p> */}
              </div>
              <p className="text-slate-600 mb-4 leading-relaxed">{member.bio}</p>
              <div className="pt-4 border-t border-slate-100">
                <p className="text-sm text-slate-500">
                  <span className="font-semibold">Expertise:</span> {member.expertise}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-blue-50 rounded-2xl p-8 border border-blue-100">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4 text-center">Join Our Team</h2>
          <p className="text-slate-600 text-center max-w-2xl mx-auto mb-6">
            We&apos;re always looking for passionate individuals who want to make a difference in the
            rental market. If you&apos;re interested in joining QRent, we&apos;d love to hear from you!
          </p>
          <div className="text-center">
            <a
              href="/contact"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors"
            >
              Get in Touch
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
