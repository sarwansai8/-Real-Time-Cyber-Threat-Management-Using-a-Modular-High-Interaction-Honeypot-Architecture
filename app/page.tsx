'use client'

import { Button } from '@/components/ui/button'
import { CardContainer, CardBody, CardItem } from '@/components/ui/3d-card'
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid'
import { ShieldCheck, Calendar, Activity, FileText, Search, Menu, X, ArrowRight, Pill, HeartPulse, Stethoscope } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const services = [
    {
      title: "Medical Records",
      description: "Securely access your complete medical history, lab results, and imaging reports in one centralized vault.",
      header: <div className="h-full w-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-xl" />,
      icon: <FileText className="h-6 w-6 text-cyan-400" />,
    },
    {
      title: "Instant Appointments",
      description: "Book consultations with top specialists. AI-powered matching ensures you find the right doctor, fast.",
      header: <div className="h-full w-full bg-gradient-to-br from-purple-500/20 to-indigo-600/20 rounded-xl" />,
      icon: <Calendar className="h-6 w-6 text-purple-400" />,
    },
    {
      title: "Live Health Vitals",
      description: "Connect your wearables to monitor heart rate, BP, and sleep patterns in real-time dashboards.",
      header: <div className="h-full w-full bg-gradient-to-br from-pink-500/20 to-rose-600/20 rounded-xl" />,
      icon: <Activity className="h-6 w-6 text-pink-400" />,
    },
    {
      title: "Vaccination Tracker",
      description: "Never miss a booster. Digital vaccination certificates available offline for travel and school.",
      header: <div className="h-full w-full bg-gradient-to-br from-emerald-500/20 to-teal-600/20 rounded-xl" />,
      icon: <ShieldCheck className="h-6 w-6 text-emerald-400" />,
    },
    {
      title: "Pharmacy & Prescriptions",
      description: "Auto-refills and doorstep delivery for your chronic medications. Manage family prescriptions easily.",
      header: <div className="h-full w-full bg-gradient-to-br from-amber-500/20 to-orange-600/20 rounded-xl" />,
      icon: <Pill className="h-6 w-6 text-amber-400" />,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30">

      {/* Navigation - Glassmorphic */}
      <nav className="fixed w-full z-50 top-0 transition-all duration-300 border-b border-white/5 bg-background/5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-tr from-primary to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                <HeartPulse className="text-white w-6 h-6" />
              </div>
              <span className="text-xl font-bold tracking-tight">Health<span className="text-primary">Gov</span></span>
            </div>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="#services" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Services</Link>
              <Link href="#data" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Public Health</Link>
              <Link href="#about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">About</Link>
            </div>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Link href="/auth/login" className="text-sm font-medium hover:text-primary transition-colors">Sign In</Link>
              <Button asChild className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 rounded-full px-6">
                <Link href="/auth/register">Get Started</Link>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-foreground"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/5 bg-background/95 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-4">
              <Link href="#services" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors" onClick={() => setMobileMenuOpen(false)}>
                Services
              </Link>
              <Link href="#data" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors" onClick={() => setMobileMenuOpen(false)}>
                Public Health
              </Link>
              <Link href="#about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors" onClick={() => setMobileMenuOpen(false)}>
                About
              </Link>
              <div className="flex flex-col gap-3 pt-2">
                <Button asChild variant="outline" className="justify-center">
                  <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
                </Button>
                <Button asChild className="justify-center bg-primary hover:bg-primary/90 text-white">
                  <Link href="/auth/register" onClick={() => setMobileMenuOpen(false)}>Get Started</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section - Immersive 3D */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Ambient Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/20 blur-[120px] rounded-full opacity-50 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

            {/* Hero Text */}
            <div className="flex-1 text-center lg:text-left space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-primary"
              >
                <ShieldCheck className="w-4 h-4" /> Official Government Portal
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]"
              >
                Healthcare <br />
                <span className="text-gradient-premium">Reimagined.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-lg text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed"
              >
                Experience the future of public health. Secure, interconnected, and designed around you. Access medical records, book appointments, and monitor vitals in one seamless interface.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
              >
                <Button asChild size="lg" className="h-12 px-8 bg-primary hover:bg-primary/90 text-white rounded-full shadow-xl shadow-primary/20 transition-all hover:scale-105">
                  <Link href="/auth/login">
                    Access Portal <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-8 border-white/10 hover:bg-white/5 rounded-full backdrop-blur-sm">
                  <Link href="/appointments">Find Provider</Link>
                </Button>
              </motion.div>
            </div>

            {/* Hero Visual - 3D Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="flex-1 w-full max-w-lg lg:max-w-none"
            >
              <CardContainer className="inter-var">
                <CardBody className="bg-gray-50 relative group/card dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-auto sm:w-[30rem] h-auto rounded-xl p-6 border transition-all duration-300 ease-out">
                  <CardItem translateZ="50" className="text-xl font-bold text-neutral-600 dark:text-white">
                    Your HealthID Card
                  </CardItem>
                  <CardItem as="p" translateZ="60" className="text-neutral-500 text-sm max-w-sm mt-2 dark:text-neutral-300">
                    Universal access to national health services.
                  </CardItem>
                  <CardItem translateZ="100" className="w-full mt-4">
                    <div className="h-48 w-full bg-gradient-to-br from-primary to-cyan-600 rounded-xl shadow-lg flex flex-col justify-between p-6 overflow-hidden relative">
                      {/* Abstract Pattern */}
                      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                      <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl" />

                      <div className="flex justify-between items-start">
                        <HeartPulse className="text-white w-8 h-8" />
                        <ShieldCheck className="text-white/80 w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-white/80 text-xs font-medium uppercase tracking-wider">Citizen Name</p>
                        <p className="text-white text-lg font-semibold tracking-wide">ALEXANDER SMITH</p>
                        <p className="text-white/60 text-xs font-mono pt-2">ID: 8824 9910 2234</p>
                      </div>
                    </div>
                  </CardItem>
                </CardBody>
              </CardContainer>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Section - Bento Grid */}
      <section id="services" className="py-24 relative bg-muted/50 dark:bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Connected Care Ecosystem</h2>
            <p className="text-muted-foreground text-lg">
              Everything you need to manage your health, seamlessly integrated into one powerful dashboard.
            </p>
          </div>

          <BentoGrid>
            {services.map((service, i) => (
              <BentoGridItem
                key={i}
                title={service.title}
                description={service.description}
                header={service.header}
                icon={service.icon}
                className={i === 3 || i === 6 ? "md:col-span-2" : ""}
              />
            ))}
          </BentoGrid>
        </div>
      </section>

      <section id="data" className="py-24 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-4">
                <Search className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-semibold">Public Health Intelligence</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Monitor vaccination coverage, outbreak notices, and regional advisories from a single verified source.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-4">
                <Stethoscope className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-semibold">Clinical Access Tools</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Patients and administrators can securely access records, appointments, and preventative care guidance without switching systems.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="py-24 bg-muted/30 border-t border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold">Built For Trust, Speed, and Care</h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            HealthGov brings together public health programs, appointment booking, and personal medical records in one secure digital experience designed for citizens first.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10 bg-black/40 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <HeartPulse className="text-primary w-5 h-5" />
            <span className="font-semibold text-lg">HealthGov</span>
          </div>
          <div className="flex gap-8 text-sm text-muted-foreground">
            <Link href="#about" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="#services" className="hover:text-primary transition-colors">Terms</Link>
            <Link href="#data" className="hover:text-primary transition-colors">Accessibility</Link>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 HealthGov Official Portal</p>
        </div>
      </footer>

    </div>
  )
}
