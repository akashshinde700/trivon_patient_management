import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaWhatsapp, FaPhoneAlt, FaEnvelope, FaStar } from 'react-icons/fa';
import axios from 'axios';
import { useToast } from '../hooks/useToast';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const clinicServices = [
  {
    name: 'General Consultation (Physician)',
    description: 'BP , Sugar / Diabetes, Heart Disease, Thyroid , Arthritis , Paralysis , Asthma , Fever , Migraine / Headache.'
  },
  {
    name: 'Cardiac & Diagnostic Services',
    description: 'ECG testing and Nebuliser treatment.'
  },
  {
    name: 'Diabetes & BP Monitoring',
    description: 'Continuous Glucose Monitoring and Blood Pressure monitoring.'
  },
  {
    name: 'Adult Vaccination',
    description: 'All adult vaccines available like flu, etc.'
  },
  {
    name: 'Pediatric Consultation',
    description: 'Treatment of all childhood illnesses and recurring cough / asthma.'
  },
  {
    name: 'Child Growth & Nutrition',
    description: 'Growth and development monitoring , assessment of child not gaining weight, and nutritional consultation.'
  },
  {
    name: 'Pediatric Vaccination',
    description: 'Complete vaccination services for children.'
  },
  {
    name: 'Pediatric Allergy & Skin Care',
    description: 'Allergy diagnosis and treatment  and treatment of paediatric skin diseases.'
  }
];

const featuredDoctors = [
  {
    name: 'Dr. Gopal Jaju',
    speciality: 'Internal Medicine, Diabetology & Cardiology',
    summary: 'MBBS, MD Medicine. Consultant Physician, Diabetologist, Intensivist and Cardiologist. Ex ICU Registrar at Lilavati & Nanavati Hospital, Mumbai; Ex Consultant Physician at Navneet Hi Tech Hospital, Mumbai.',
    registrationNo: 'MMC-2022051089'
  }
];

const patientStories = [
  { name: 'Sarah J.', tag: 'Satisfied Patient', quote: 'Booking an appointment was simple and the follow-up care was excellent. The team genuinely cares about patient wellbeing.' },
  { name: 'Michael B.', tag: 'Post-Treatment', quote: 'From reception to doctors, everyone was reassuring and professional. The clinic is modern and very well organised.' },
  { name: 'Emily K.', tag: 'Routine Check-up', quote: 'Timely reminders, very short waiting time and doctors who listen patiently. Highly recommended.' },
];

// Working gallery images matched to services
const galleryImages = [
  { 
    id: 1, 
    src: 'https://images.unsplash.com/photo-1551076805-e1869033e561?w=400&h=400&fit=crop', 
    alt: 'Doctor Consultation',
    service: 'General Consultation'
  },
  { 
    id: 2, 
    src: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=400&h=400&fit=crop', 
    alt: 'Heart & Cardiac Care',
    service: 'Cardiac Services'
  },
  { 
    id: 3, 
    src: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400&h=400&fit=crop', 
    alt: 'Diabetes Testing',
    service: 'Diabetes Monitoring'
  },
  { 
    id: 4, 
    src: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=400&h=400&fit=crop', 
    alt: 'Vaccination',
    service: 'Adult Vaccination'
  },
  { 
    id: 5, 
    src: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop', 
    alt: 'Pediatric Care',
    service: 'Pediatric Consultation'
  },
  { 
    id: 6, 
    src: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=400&fit=crop', 
    alt: 'Medical Equipment',
    service: 'Diagnostic Services'
  },
];

const whatsappNumber = '+91 85303 45858';
const whatsappLink = 'https://wa.me/918530345858';

const LandingPage = () => {
  const { addToast } = useToast();

  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingData, setBookingData] = useState({ service: '', name: '', email: '', phone: '', preferred_date: '', appointment_time: '' });
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeSection, setActiveSection] = useState('home');
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [allTimeSlots, setAllTimeSlots] = useState([]);
  const [doctorAvailability, setDoctorAvailability] = useState([]);

  // Fetch doctor's time slots and availability on component mount
  useEffect(() => {
    const api = axios.create({
      baseURL,
      headers: { 'Content-Type': 'application/json' }
    });

    const fetchDoctorSettings = async () => {
      try {
        // Fetch time slots
        const slotsResponse = await api.get('/api/doctor-availability/1/slots');
        const slots = (slotsResponse.data.slots || [])
          .filter(slot => slot.is_active)
          .map(slot => ({
            dbTime: slot.slot_time.substring(0, 5), // Convert "12:15:00" to "12:15"
            displayTime: slot.display_time
          }));
        setAllTimeSlots(slots);

        // Fetch availability (working days)
        const availResponse = await api.get('/api/doctor-availability/1/availability');
        setDoctorAvailability(availResponse.data.availability || []);
      } catch (error) {
        console.error('Error fetching doctor settings:', error);
        // Fallback to default slots if API fails
        setAllTimeSlots([
          { dbTime: '12:15', displayTime: '12:15 PM' },
          { dbTime: '12:30', displayTime: '12:30 PM' },
          { dbTime: '12:45', displayTime: '12:45 PM' },
          { dbTime: '13:00', displayTime: '01:00 PM' },
          { dbTime: '13:15', displayTime: '01:15 PM' },
          { dbTime: '13:30', displayTime: '01:30 PM' },
          { dbTime: '13:45', displayTime: '01:45 PM' },
          { dbTime: '18:00', displayTime: '06:00 PM' },
          { dbTime: '18:15', displayTime: '06:15 PM' },
          { dbTime: '18:30', displayTime: '06:30 PM' },
          { dbTime: '18:45', displayTime: '06:45 PM' },
          { dbTime: '19:00', displayTime: '07:00 PM' },
          { dbTime: '19:15', displayTime: '07:15 PM' },
          { dbTime: '19:30', displayTime: '07:30 PM' },
          { dbTime: '19:45', displayTime: '07:45 PM' },
          { dbTime: '20:00', displayTime: '08:00 PM' },
          { dbTime: '20:15', displayTime: '08:15 PM' },
          { dbTime: '20:30', displayTime: '08:30 PM' },
          { dbTime: '20:45', displayTime: '08:45 PM' }
        ]);
      }
    };

    fetchDoctorSettings();
  }, []); // Empty dependency array - run only once on mount

  // Fetch booked slots when date changes
  useEffect(() => {
    const api = axios.create({
      baseURL,
      headers: { 'Content-Type': 'application/json' }
    });

    const fetchBookedSlots = async () => {
      if (!bookingData.preferred_date) {
        setBookedSlots([]);
        return;
      }

      setLoadingSlots(true);
      try {
        // Dr. Gopal Jaju's doctor_id is 1 (from database)
        const response = await api.get('/api/appointments/booked-slots', {
          params: {
            doctor_id: 1,
            date: bookingData.preferred_date
          }
        });
        setBookedSlots(response.data.bookedSlots || []);
      } catch (error) {
        console.error('Error fetching booked slots:', error);
        setBookedSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchBookedSlots();
  }, [bookingData.preferred_date]); // Only depends on date, not api

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'about', 'services', 'doctors', 'gallery', 'contact'];
      const scrollPosition = window.scrollY + 100;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i]);
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      e.preventDefault();
      const href = link.getAttribute('href');
      if (href === '#') return;
      
      const target = document.querySelector(href);
      if (target) {
        const headerOffset = 100;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: 'smooth'
        });
        window.history.pushState(null, '', href);
        
        const sectionId = href.replace('#', '');
        if (sectionId) {
          setActiveSection(sectionId);
        }
      }
    };
    
    document.addEventListener('click', handleClick);
    
    if (window.location.hash) {
      setTimeout(() => {
        const target = document.querySelector(window.location.hash);
        if (target) {
          const headerOffset = 80;
          const elementPosition = target.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
    
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleContactChange = (e) => {
    const { name, value } = e.target;
    setContactForm(prev => ({ ...prev, [name]: value }));
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback('');

    const api = axios.create({
      baseURL,
      headers: { 'Content-Type': 'application/json' }
    });

    try {
      await api.post('/api/appointment-intents', {
        full_name: contactForm.name,
        phone: contactForm.phone,
        message: contactForm.message,
        speciality: 'General Inquiry'
      });
      setFeedback('success');
      setContactForm({ name: '', email: '', phone: '', message: '' });
      addToast('Message sent successfully!', 'success');
    } catch {
      setFeedback('error');
      addToast('Failed to send message', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();

    if (!bookingData.appointment_time) {
      addToast('Please select an appointment time', 'error');
      return;
    }

    const api = axios.create({
      baseURL,
      headers: { 'Content-Type': 'application/json' }
    });

    try {
      await api.post('/api/appointment-intents', {
        full_name: bookingData.name,
        phone: bookingData.phone,
        email: bookingData.email,
        speciality: bookingData.service,
        preferred_date: bookingData.preferred_date,
        preferred_time: bookingData.appointment_time,
        message: `Appointment request for ${bookingData.service} on ${bookingData.preferred_date} at ${bookingData.appointment_time}`,
        auto_create: true
      });
      addToast('Appointment booked successfully!', 'success');
      setShowBookingModal(false);
      setBookingData({ service: '', name: '', email: '', phone: '', preferred_date: '', appointment_time: '' });
      setBookedSlots([]);
    } catch (error) {
      console.error('Booking error:', error);
      // Check if error response has specific message about slot being booked
      const errorMessage = error.response?.data?.error || 'Failed to book appointment';
      addToast(errorMessage, 'error');

      // If slot was already booked, refresh the booked slots list
      if (errorMessage.includes('already booked')) {
        // Re-fetch booked slots to update the UI
        try {
          const response = await api.get('/api/appointments/booked-slots', {
            params: {
              doctor_id: 1,
              date: bookingData.preferred_date
            }
          });
          setBookedSlots(response.data.bookedSlots || []);
        } catch (refreshError) {
          console.error('Error refreshing slots:', refreshError);
        }
      }
    }
  };

  const handleServiceClick = (serviceName) => {
    setBookingData({ ...bookingData, service: serviceName });
    setShowBookingModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col relative">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">+</div>
            <div>
              <p className="font-semibold text-gray-900 text-sm sm:text-base">Om clinic And Diagnostic Center</p>
              <p className="text-xs text-gray-500 hidden sm:block">Your partners in health & wellness</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm text-gray-700">
            <a href="#home" onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
              window.history.pushState(null, '', '#home');
              setActiveSection('home');
            }} className={`transition ${activeSection === 'home' ? 'font-semibold text-blue-600' : 'hover:text-blue-600'}`}>Home</a>
            <a href="#about" className={`transition ${activeSection === 'about' ? 'font-semibold text-blue-600' : 'hover:text-blue-600'}`}>About Us</a>
            <a href="#services" className={`transition ${activeSection === 'services' ? 'font-semibold text-blue-600' : 'hover:text-blue-600'}`}>Services</a>
            <a href="#doctors" className={`transition ${activeSection === 'doctors' ? 'font-semibold text-blue-600' : 'hover:text-blue-600'}`}>Doctors</a>
            <a href="#gallery" className={`transition ${activeSection === 'gallery' ? 'font-semibold text-blue-600' : 'hover:text-blue-600'}`}>Gallery</a>
            <a href="#contact" className={`transition ${activeSection === 'contact' ? 'font-semibold text-blue-600' : 'hover:text-blue-600'}`}>Contact</a>
          </nav>
          
          <button 
            onClick={() => {
              const nav = document.getElementById('mobile-nav');
              if (nav) {
                nav.classList.toggle('hidden');
              }
            }}
            className="md:hidden p-2 text-gray-700 hover:text-blue-600"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <nav id="mobile-nav" className="hidden md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-100 shadow-lg">
            <div className="flex flex-col p-4 space-y-3">
              <a href="#home" onClick={() => document.getElementById('mobile-nav')?.classList.add('hidden')} className="font-semibold text-blue-600 hover:text-blue-700 py-2">Home</a>
              <a href="#about" onClick={() => document.getElementById('mobile-nav')?.classList.add('hidden')} className="hover:text-blue-600 transition py-2">About Us</a>
              <a href="#services" onClick={() => document.getElementById('mobile-nav')?.classList.add('hidden')} className="hover:text-blue-600 transition py-2">Services</a>
              <a href="#doctors" onClick={() => document.getElementById('mobile-nav')?.classList.add('hidden')} className="hover:text-blue-600 transition py-2">Doctors</a>
              <a href="#gallery" onClick={() => document.getElementById('mobile-nav')?.classList.add('hidden')} className="hover:text-blue-600 transition py-2">Gallery</a>
              <a href="#contact" onClick={() => document.getElementById('mobile-nav')?.classList.add('hidden')} className="hover:text-blue-600 transition py-2">Contact</a>
            </div>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login" className="hidden sm:inline-flex px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-blue-700 border border-blue-100 rounded-full hover:bg-blue-50 transition">
              Login
            </Link>
            <button onClick={() => setShowBookingModal(true)} className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-full bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition">
              Book Appointment
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div>
            <p className="uppercase text-xs tracking-[0.3em] text-blue-200 mb-3">ONLINE BOOKING</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4 text-white">Book an Appointment</h1>
            <p className="text-blue-100 mb-8 text-sm sm:text-base md:text-lg leading-relaxed">
              Follow a few simple steps to schedule your visit with one of our specialists. Manage bookings, reminders and medical records from a single clinic account.
            </p>
            <div className="flex flex-wrap gap-4 mb-8">
              <button onClick={() => setShowBookingModal(true)} className="px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-white text-blue-900 font-bold text-base sm:text-lg shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition transform">
                Book Appointment
              </button>
            </div>
            <div className="flex flex-wrap gap-4 sm:gap-6 lg:gap-8 text-xs sm:text-sm text-blue-100">
              <div className="flex flex-col">
                <p className="font-semibold text-white mb-1">Step 1</p>
                <p className="text-blue-200">Select Service</p>
              </div>
              <div className="flex flex-col">
                <p className="font-semibold text-white mb-1">Step 2</p>
                <p className="text-blue-200">Select Doctor</p>
              </div>
              <div className="flex flex-col">
                <p className="font-semibold text-white mb-1">Step 3</p>
                <p className="text-blue-200">Choose Date & Time</p>
              </div>
              <div className="flex flex-col">
                <p className="font-semibold text-white mb-1">Step 4</p>
                <p className="text-blue-200">Confirm</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-4 sm:p-6 md:p-8 border border-white/20 shadow-2xl">
            <p className="text-sm sm:text-base font-medium text-blue-100 mb-4 sm:mb-6">1. Choose a Service</p>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
              {clinicServices.slice(0, 4).map(service => (
                <button 
                  key={service.name} 
                  onClick={() => handleServiceClick(service.name)} 
                  className="bg-white/90 hover:bg-white text-gray-900 rounded-2xl p-3 sm:p-4 cursor-pointer border border-blue-50 hover:border-blue-400 hover:shadow-lg transition text-left"
                >
                  <p className="font-semibold text-xs sm:text-sm mb-1">{service.name}</p>
                  <p className="text-xs text-gray-600 line-clamp-3">{service.description}</p>
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowBookingModal(true)} 
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-3 sm:py-4 flex items-center justify-center transition shadow-lg"
            >
              Book Appointment
            </button>
          </div>
        </div>
      </section>

      <main className="flex-1">
        {/* Services */}
        <section id="services" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
            <div>
              <p className="uppercase text-xs tracking-[0.3em] text-blue-600 mb-2">OUR TREATMENTS & SERVICES</p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Care designed around you.</h2>
              <p className="mt-3 text-gray-600 max-w-xl text-sm sm:text-base">
                Explore our range of services from routine check-ups to specialised treatments, all supported by your digital patient record.
              </p>
            </div>
            <button onClick={() => setShowBookingModal(true)} className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow hover:bg-blue-700 transition">
              Book a Consultation
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {clinicServices.map(service => (
              <article key={service.name} className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden flex flex-col hover:shadow-lg transition">
                <div className="p-4 sm:p-5 flex-1">
                  <h3 className="text-base font-semibold text-gray-900">{service.name}</h3>
                  <p className="mt-2 text-sm text-gray-600">{service.description}</p>
                </div>
                <div className="px-4 sm:px-5 py-4 border-t border-gray-100 flex gap-2 sm:gap-3">
                  <a href="#services" className="flex-1 text-center text-sm font-medium px-3 sm:px-4 py-2 rounded-lg border border-blue-100 text-blue-700 hover:bg-blue-50 transition">Learn More</a>
                  <button onClick={() => handleServiceClick(service.name)} className="flex-1 text-center text-sm font-semibold px-3 sm:px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition">
                    Book Now
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* About */}
        <section id="about" className="bg-white border-t border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div className="max-w-3xl mb-10">
              <p className="uppercase text-xs tracking-[0.3em] text-blue-600 mb-2">OUR MISSION & VALUES</p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Your partners in health.</h2>
              <p className="mt-3 text-gray-600 text-sm sm:text-base">
                We combine compassionate care with modern medical technology to deliver safe, high-quality treatment for every family member.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12">
              {[
                { title: 'Compassion', body: 'Empathy, respect and time to listen at every visit.', icon: '❤️' },
                { title: 'Excellence', body: 'Experienced clinicians and evidence-based protocols.', icon: '⭐' },
                { title: 'Integrity', body: 'Transparent communication and ethical medical practice.', icon: '🛡️' },
              ].map(item => (
                <div key={item.title} className="bg-gray-50 rounded-2xl p-4 sm:p-6 border border-gray-100 flex flex-col gap-2">
                  <span className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-lg">{item.icon}</span>
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Doctors - CENTERED for single doctor */}
        <section id="doctors" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="mb-10 text-center">
            <p className="uppercase text-xs tracking-[0.3em] text-blue-600 mb-2">OUR DOCTORS</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Meet Our Medical Team</h2>
            <p className="mt-3 text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">
              A carefully selected team of specialists working together to provide complete care for you and your family.
            </p>
          </div>
          
          {/* Centered Doctor Card */}
          <div className="flex justify-center">
            {featuredDoctors.map(doc => (
              <article 
                key={doc.name} 
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 hover:shadow-xl transition-all duration-300 w-full max-w-lg"
              >
                <div className="flex flex-col items-center text-center">
                  {/* Doctor Photo */}
                  <div className="h-32 w-32 rounded-full overflow-hidden mb-4 shadow-lg border-4 border-blue-100">
                    <img
                      src="/dr-gopal-jaju.jpg"
                      alt={doc.name}
                      className="h-full w-full object-cover object-center"
                      style={{ objectPosition: 'center top' }}
                    />
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900">
                    {doc.name}
                  </h3>
                  <p className="text-base text-blue-600 font-medium mt-1">
                    {doc.speciality}
                  </p>
                  
                  {/* Registration Badge */}
                  <div className="mt-3 inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-medium px-3 py-1 rounded-full">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Reg: {doc.registrationNo}
                  </div>
                  
                  {/* Description */}
                  <p className="mt-4 text-base text-gray-600 leading-relaxed">
                    {doc.summary}
                  </p>
                  
                  {/* Book Button */}
                  <button 
                    onClick={() => {
                      setBookingData({ ...bookingData, service: doc.speciality });
                      setShowBookingModal(true);
                    }} 
                    className="mt-6 w-full bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-md hover:shadow-lg py-4 text-base"
                  >
                    Book Appointment with {doc.name.split(' ')[0]}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Gallery - Working Images */}
        <section id="gallery" className="bg-white border-t border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div className="mb-10 text-center">
              <p className="uppercase text-xs tracking-[0.3em] text-blue-600 mb-2">Our Clinic</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Gallery</h2>
              <p className="mt-3 text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">
                Take a virtual tour of our modern facilities and the care we provide.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {galleryImages.map(image => (
                <button 
                  key={image.id} 
                  onClick={() => setSelectedImage(image)} 
                  className="relative group overflow-hidden rounded-xl aspect-square shadow-md hover:shadow-xl transition-shadow"
                >
                  <img 
                    src={image.src} 
                    alt={image.alt} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={e => { 
                      e.target.onerror = null; 
                      e.target.src = `https://via.placeholder.com/400x400/3b82f6/ffffff?text=${encodeURIComponent(image.alt)}`; 
                    }} 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-end p-4">
                    <span className="text-white font-medium text-sm">{image.alt}</span>
                    <span className="text-blue-200 text-xs mt-1">{image.service}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div className="mb-10 text-center">
              <p className="uppercase text-xs tracking-[0.3em] text-blue-600 mb-2">OUR CLINIC & PATIENT STORIES</p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">What Our Patients Say</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {patientStories.map(story => (
                <article key={story.name} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 flex flex-col gap-3 shadow-sm hover:shadow-md transition">
                  <div className="flex text-yellow-400 text-sm gap-1">
                    {Array.from({ length: 5 }).map((_, i) => <FaStar key={i} />)}
                  </div>
                  <p className="text-sm text-gray-700 italic">"{story.quote}"</p>
                  <div className="mt-2">
                    <p className="font-semibold text-gray-900 text-sm">{story.name}</p>
                    <p className="text-xs text-gray-500">{story.tag}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="mt-10 flex justify-center">
              <button onClick={() => setShowBookingModal(true)} className="px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow hover:bg-blue-700 transition">
                Book a Consultation
              </button>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 grid lg:grid-cols-2 gap-8 sm:gap-10">
          <div className="space-y-6">
            <div>
              <p className="uppercase text-xs tracking-[0.3em] text-blue-600 mb-2">GET IN TOUCH</p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">We're here to help.</h2>
              <p className="mt-3 text-gray-600 text-sm sm:text-base">
                Reach out for appointments, second opinions or general queries. Our front-desk team will get back to you shortly.
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-blue-50 p-4 rounded-2xl">
                <FaPhoneAlt className="text-blue-700 text-xl flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-blue-900 uppercase tracking-widest">Phone</p>
                  <a href="tel:1800123456" className="text-lg font-semibold text-blue-900 hover:underline">+91 85303 45858</a>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-green-50 p-4 rounded-2xl">
                <FaWhatsapp className="text-green-600 text-2xl flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-green-900 uppercase tracking-widest">WhatsApp</p>
                  <a href={whatsappLink} target="_blank" rel="noreferrer" className="text-lg font-semibold text-green-700 underline hover:text-green-800">{whatsappNumber}</a>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-amber-50 p-4 rounded-2xl">
                <FaEnvelope className="text-amber-600 text-xl flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-900 uppercase tracking-widest">Email</p>
                  <a href="mailto:drjajugopal@gmail.com" className="text-lg font-semibold text-amber-900 hover:underline">drjajugopal@gmail.com</a>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-gray-100">
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">Send us a message</h3>
            <form className="space-y-4" onSubmit={handleContactSubmit}>
              <div>
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <input type="text" name="name" required value={contactForm.name} onChange={handleContactChange} className="w-full mt-2 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email Address</label>
                <input type="email" name="email" required value={contactForm.email} onChange={handleContactChange} className="w-full mt-2 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Phone Number</label>
                <input type="tel" name="phone" value={contactForm.phone} onChange={handleContactChange} className="w-full mt-2 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Message</label>
                <textarea rows="4" required name="message" value={contactForm.message} onChange={handleContactChange} className="w-full mt-2 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none" />
              </div>
              <button type="submit" disabled={submitting} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:bg-blue-700 disabled:opacity-60 transition">
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
              {feedback && (
                <p className={`text-sm mt-2 text-center ${feedback === 'success' ? 'text-green-600' : 'text-red-600'}`} aria-live="polite">
                  {feedback === 'success' ? 'Thank you! Our team will contact you shortly.' : 'Unable to send your message. Please try again.'}
                </p>
              )}
            </form>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm">© 2024 Om clinic And Diagnostic Center. All rights reserved.</p>
        </div>
      </footer>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-2xl font-semibold">Book an Appointment</h2>
              <button onClick={() => {
                setShowBookingModal(false);
                setBookingData({ service: '', name: '', email: '', phone: '', preferred_date: '' });
              }} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <form onSubmit={handleBookingSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Select Service *</label>
                <select required value={bookingData.service} onChange={e => setBookingData({ ...bookingData, service: e.target.value })} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                  <option value="">Choose a service...</option>
                  {clinicServices.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Full Name *</label>
                <input type="text" required value={bookingData.name} onChange={e => setBookingData({ ...bookingData, name: e.target.value })} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone Number *</label>
                <input type="tel" required value={bookingData.phone} onChange={e => setBookingData({ ...bookingData, phone: e.target.value })} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input type="email" value={bookingData.email} onChange={e => setBookingData({ ...bookingData, email: e.target.value })} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Preferred Date *</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={bookingData.preferred_date}
                  onChange={e => {
                    const selectedDate = new Date(e.target.value + 'T00:00:00');
                    const dayOfWeek = selectedDate.getDay();

                    // Check if doctor is available on selected day
                    const dayAvailability = doctorAvailability.find(d => d.day_of_week === dayOfWeek);
                    if (dayAvailability && !dayAvailability.is_available) {
                      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
                      addToast(`Clinic is closed on ${dayName}s. Please select another date.`, 'error');
                      return;
                    }

                    setBookingData({ ...bookingData, preferred_date: e.target.value, appointment_time: '' });
                  }}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">* Clinic is closed on Sundays</p>
              </div>

              {bookingData.preferred_date && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Time Slot *
                    {loadingSlots && <span className="text-xs text-gray-500 ml-2">(Loading slots...)</span>}
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto border rounded-xl p-3">
                    {allTimeSlots.map((slot) => {
                      const isBooked = bookedSlots.includes(slot.dbTime);
                      const isSelected = bookingData.appointment_time === slot.dbTime;

                      return (
                        <button
                          key={slot.dbTime}
                          type="button"
                          disabled={isBooked}
                          onClick={() => setBookingData({ ...bookingData, appointment_time: slot.dbTime })}
                          className={`
                            px-3 py-2 text-xs sm:text-sm rounded-lg font-medium transition-all
                            ${isBooked
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                              : isSelected
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                            }
                          `}
                        >
                          {slot.displayTime}
                        </button>
                      );
                    })}
                  </div>
                  {bookedSlots.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      {bookedSlots.length} slot(s) already booked
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => {
                  setShowBookingModal(false);
                  setBookingData({ service: '', name: '', email: '', phone: '', preferred_date: '', appointment_time: '' });
                  setBookedSlots([]);
                }} className="flex-1 px-6 py-3 border rounded-xl hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gallery Lightbox */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl w-full">
            <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 z-10">×</button>
            <img 
              src={selectedImage.src} 
              alt={selectedImage.alt} 
              className="w-full h-auto rounded-lg"
              onError={e => { e.target.src = `https://via.placeholder.com/800x600/3b82f6/ffffff?text=${encodeURIComponent(selectedImage.alt)}`; }} 
            />
            <div className="text-center mt-4">
              <p className="text-white text-lg font-medium">{selectedImage.alt}</p>
              <p className="text-blue-300 text-sm mt-1">{selectedImage.service}</p>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Floating Button */}
      <a 
        href={whatsappLink} 
        target="_blank" 
        rel="noreferrer" 
        className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-2xl p-4 sm:p-5 flex items-center justify-center z-[9999] transition-all duration-300 hover:scale-110 hover:shadow-green-500/50"
        aria-label="Contact us on WhatsApp"
        title="Chat with us on WhatsApp"
      >
        <FaWhatsapp className="text-2xl sm:text-3xl md:text-4xl" />
      </a>
    </div>
  );
};

export default LandingPage;