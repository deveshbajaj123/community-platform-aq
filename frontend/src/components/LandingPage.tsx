import { Link } from 'react-router-dom'
import Button from './Button'

const LandingPage = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 animate-fade-in">
            Welcome to{' '}
            <span className="text-forest-500">AquaTerra</span>{' '}
            Community
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Connect with fellow students, share your initiatives, and be part of a
            movement creating positive change in our world.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Link to="/login">
              <Button size="lg" className="bg-forest-500 hover:bg-forest-600 text-white">
                Join Our Community
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="secondary">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Wavy Divider */}
      <div className="wavy-divider bg-forest-500" />

      {/* Features Section */}
      <section className="bg-forest-500 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            What We're About
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '🌱',
                title: 'Community Drives',
                description: 'Organize and participate in environmental and social initiatives'
              },
              {
                icon: '🚀',
                title: 'Startup Ventures',
                description: 'Share your entrepreneurial ideas and get feedback from peers'
              },
              {
                icon: '💪',
                title: 'Self Improvement',
                description: 'Grow together through shared learning and experiences'
              }
            ].map((feature, i) => (
              <div
                key={feature.title}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white animate-fade-in"
                style={{ animationDelay: `${0.1 * (i + 1)}s` }}
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-white/80">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Wavy Divider (reversed) */}
      <div className="wavy-divider bg-cream-100" style={{ transform: 'rotate(180deg)' }} />

      {/* CTA Section */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Make a Difference?
          </h2>
          <p className="text-gray-600 mb-8">
            Join thousands of students who are already part of the AquaTerra community.
            Together, we can create lasting positive change.
          </p>
          <Link to="/login">
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white">
              Get Started Today
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

export default LandingPage
