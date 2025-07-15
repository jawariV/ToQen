import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Users, Smartphone, Shield, ArrowRight, CheckCircle } from 'lucide-react';

const Home: React.FC = () => {
  const features = [
    {
      icon: Clock,
      title: 'Real-Time Queue Tracking',
      description: 'See your exact position in line and estimated wait time, updated every 10 seconds.',
    },
    {
      icon: Smartphone,
      title: 'Mobile-First Design',
      description: 'Book appointments and track queues seamlessly on any device, anywhere.',
    },
    {
      icon: Users,
      title: 'Multi-Hospital Support',
      description: 'Connect with multiple hospitals and departments in your area.',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your health data is protected with enterprise-grade security.',
    },
  ];

  const benefits = [
    'Reduce waiting room crowding',
    'Save time with accurate estimates',
    'Get notified when your turn approaches',
    'Book appointments 24/7',
    'Track multiple appointments',
    'Contactless check-in options',
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#2A5D9B] to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Skip the Wait,<br />
                <span className="text-[#F7941D]">Track Your Queue</span>
              </h1>
              <p className="text-xl mb-8 text-blue-100">
                ToQen revolutionizes hospital visits with real-time queue tracking, 
                smart appointment booking, and instant notifications. Never wait in 
                uncertainty again.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/book"
                  className="bg-[#F7941D] text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-orange-600 transition-colors flex items-center justify-center group"
                >
                  Book Appointment
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/track"
                  className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-[#2A5D9B] transition-colors text-center"
                >
                  Track Queue
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <div className="flex items-center justify-center mb-6">
                  <Clock className="h-24 w-24 text-[#F7941D]" />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-2">Your Token: T#42</h3>
                  <p className="text-blue-100 mb-4">You are #5 in line</p>
                  <div className="bg-[#3EA96F] text-white px-4 py-2 rounded-full text-sm font-medium">
                    Estimated wait: 25 minutes
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose ToQen?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience the future of healthcare queue management with features designed 
              for both patients and healthcare providers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center group">
                <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#2A5D9B] transition-colors">
                  <feature.icon className="h-8 w-8 text-[#2A5D9B] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Transform Your Hospital Experience
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Say goodbye to crowded waiting rooms and uncertain wait times. 
                ToQen puts you in control of your healthcare journey.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-[#3EA96F] flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">General Medicine</p>
                      <p className="text-sm text-gray-600">Dr. Smith</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#3EA96F]">T#15</p>
                      <p className="text-sm text-gray-600">Ready</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">Cardiology</p>
                      <p className="text-sm text-gray-600">Dr. Johnson</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#F7941D]">T#08</p>
                      <p className="text-sm text-gray-600">5 mins</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">Dermatology</p>
                      <p className="text-sm text-gray-600">Dr. Williams</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-500">T#23</p>
                      <p className="text-sm text-gray-600">45 mins</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#2A5D9B]">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Skip the Wait?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of patients who have already transformed their hospital experience with ToQen.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/book"
              className="bg-[#F7941D] text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-orange-600 transition-colors"
            >
              Book Your First Appointment
            </Link>
            <Link
              to="/admin"
              className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-[#2A5D9B] transition-colors"
            >
              Hospital Admin Portal
            </Link>
            <Link
              to="/admin/register"
              className="bg-white text-[#2A5D9B] px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors"
            >
              Register Hospital
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;