'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ShieldCheck,
  Truck,
  Wallet,
  Search,
  PackageCheck,
  Smile,
  Sparkles,
  Building2,
  Wrench,
  Layers,
  Clock,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import AuroraBackground from '@/components/ui/AuroraBackground';
import Magnetic from '@/components/ui/Magnetic';
import { fadeInUp, staggerContainer } from '@/lib/motion';
import { getRoleHomePath } from '@/lib/roleRedirect';

const FEATURES = [
  {
    icon: Wallet,
    title: 'Rent, don’t buy',
    body: 'Furnish your place for a fraction of the cost — pay monthly, return when you move.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified vendors',
    body: 'Every independent vendor is verified by our Admin team before they can list inventory.',
  },
  {
    icon: Truck,
    title: 'Doorstep delivery',
    body: 'Pick a delivery slot, track your order, and get installation help — free delivery over ₹5000/mo.',
  },
];

const STEPS = [
  { icon: Search, title: 'Browse your city', body: 'Pick from Hyderabad, Bengaluru, Chennai or Mumbai inventory.' },
  { icon: PackageCheck, title: 'Choose a plan', body: 'Pick a 1, 3, 6 or 12-month plan — longer terms unlock discounts.' },
  { icon: Smile, title: 'Move in, worry-free', body: 'Scheduled delivery, easy maintenance, hassle-free returns.' },
];

const STATS = [
  { label: 'Cities live', value: '4' },
  { label: 'Categories', value: '2' },
  { label: 'Rental plans', value: '4' },
  { label: 'Platform roles', value: '4' },
];

const CITIES = ['Hyderabad', 'Bengaluru', 'Chennai', 'Mumbai'];

function FloatingShowcase() {
  return (
    <div className="relative mx-auto hidden h-96 w-full max-w-md lg:block">
      <motion.div
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="glass-strong absolute left-2 top-4 w-52 rounded-2xl p-4 shadow-glass dark:shadow-glass-dark"
      >
        <Building2 className="text-brand-500" size={22} />
        <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">3-Seater Sofa</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">₹1,499/mo · Hyderabad</p>
        <Badge variant="success" className="mt-3">
          Available now
        </Badge>
      </motion.div>

      <motion.div
        animate={{ y: [0, 16, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        className="glass-strong absolute bottom-6 right-2 w-56 rounded-2xl p-4 shadow-glass dark:shadow-glass-dark"
      >
        <Wrench className="text-accent-500" size={22} />
        <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">Double-Door Fridge</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">₹899/mo · Bengaluru</p>
        <Badge variant="brand" className="mt-3">
          Free delivery
        </Badge>
      </motion.div>

      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="glass-strong absolute right-10 top-32 flex items-center gap-2 rounded-full px-4 py-2 shadow-glass dark:shadow-glass-dark"
      >
        <Sparkles size={15} className="text-accent-500" />
        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">12-month plans save 20%</span>
      </motion.div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { status, user } = useSelector((state) => state.auth);

  // A logged-in customer should never be stuck looking at the marketing landing page —
  // send them to their dashboard even if they navigate back here (e.g. via the logo).
  useEffect(() => {
    if (status === 'authenticated' && user?.role === 'customer') {
      router.replace(getRoleHomePath(user.role));
    }
  }, [status, user, router]);

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative mx-auto max-w-[1600px] px-4 pb-20 pt-16 sm:px-8 sm:pt-24 lg:px-16 xl:px-20">
        <AuroraBackground className="opacity-100" />
        <div className="grid items-center gap-12 lg:grid-cols-2 xl:gap-20">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="text-center lg:text-left">
            <motion.div variants={fadeInUp}>
              <Badge variant="brand" className="shadow-sm">
                <Sparkles size={13} /> Now live in 4 cities
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="mt-5 font-display text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl"
            >
              Furniture & appliances,{' '}
              <span className="text-gradient bg-[length:200%_auto] animate-gradient-shift">rented monthly.</span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="mx-auto mt-5 max-w-xl text-lg text-slate-600 dark:text-slate-300 lg:mx-0"
            >
              Built for students and professionals on the move. Pick your city, choose a plan, and get set up in
              days — not weeks.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="mt-6 flex flex-wrap items-center justify-center gap-2 lg:justify-start"
            >
              {CITIES.map((city) => (
                <span
                  key={city}
                  className="rounded-full border border-slate-200/70 bg-white/60 px-3 py-1 text-sm font-medium text-slate-600 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                >
                  {city}
                </span>
              ))}
            </motion.div>

            <motion.div variants={fadeInUp} className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Magnetic>
                <Link href="/register">
                  <motion.span
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-3.5 text-sm font-semibold text-white shadow-premium hover:shadow-glow"
                  >
                    Get started <ArrowRight size={16} />
                  </motion.span>
                </Link>
              </Magnetic>
              <Magnetic>
                <Link href="/login">
                  <motion.span
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    className="glass inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-slate-700 dark:text-white"
                  >
                    Log in
                  </motion.span>
                </Link>
              </Magnetic>
            </motion.div>
          </motion.div>

          <FloatingShowcase />
        </div>

        {/* Stats strip */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={staggerContainer}
          className="glass mt-16 grid grid-cols-2 gap-6 rounded-2xl p-6 shadow-glass dark:shadow-glass-dark sm:grid-cols-4"
        >
          {STATS.map((stat) => (
            <motion.div key={stat.label} variants={fadeInUp} className="text-center">
              <p className="text-gradient font-display text-3xl font-bold">{stat.value}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-8 lg:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={staggerContainer}
          className="text-center"
        >
          <motion.p variants={fadeInUp} className="text-sm font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
            How it works
          </motion.p>
          <motion.h2 variants={fadeInUp} className="mt-2 font-display text-3xl font-bold text-slate-900 dark:text-white">
            Three steps to a furnished home
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={staggerContainer}
          className="relative mt-14 grid gap-8 sm:grid-cols-3"
        >
          <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-white/20 sm:block" />
          {STEPS.map((step, i) => (
            <motion.div key={step.title} variants={fadeInUp} className="relative text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-premium">
                <step.icon size={26} />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Step {i + 1}</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{step.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-8 lg:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={staggerContainer}
          className="grid gap-6 sm:grid-cols-3"
        >
          {FEATURES.map((f) => (
            <motion.div key={f.title} variants={fadeInUp}>
              <Card variant="glass" tilt className="h-full p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-400/10 dark:text-brand-300">
                  <f.icon size={20} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{f.body}</p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-8 lg:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeInUp}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-accent-500 px-8 py-14 text-center shadow-glow sm:px-16"
        >
          <div className="pointer-events-none absolute -left-10 -top-10 h-56 w-56 animate-blob rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-56 w-56 animate-blob rounded-full bg-white/10 blur-3xl [animation-delay:5s]" />
          <div className="relative flex items-center justify-center gap-1.5 text-white/80">
            <Layers size={16} />
            <span className="text-sm font-medium">Furniture · Appliances · One platform</span>
          </div>
          <h2 className="relative mt-4 font-display text-3xl font-bold text-white sm:text-4xl">
            Ready to furnish your next home?
          </h2>
          <p className="relative mx-auto mt-3 max-w-lg text-white/85">
            Create your account in minutes and start browsing city-specific inventory today.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Magnetic>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-brand-700 shadow-lg transition-transform hover:scale-[1.03]"
              >
                Create free account <ArrowRight size={16} />
              </Link>
            </Magnetic>
            <span className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 text-sm font-medium text-white/90">
              <Clock size={16} /> Set up in under 5 minutes
            </span>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
