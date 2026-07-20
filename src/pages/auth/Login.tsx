import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import heroImage from '@/assets/login-hero.jpg'

const heroTitle = 'Your fleet, your trips, in one view'
const heroMessages = [
  'Plan memorable journeys with confidence.',
  'Track vehicles, drivers, payments, and guest bookings from one clear workspace.',
]

const easeOutSoft = [0.22, 1, 0.36, 1] as const

const wordContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.25,
    },
  },
}

const wordItem: Variants = {
  hidden: { opacity: 0, y: 28, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.48, ease: easeOutSoft },
  },
}

const sentenceItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 1.05 + index * 0.28, duration: 0.5, ease: easeOutSoft },
  }),
}

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(email, password)
      setShowSuccess(true)
      setTimeout(async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', authUser.id)
            .single()
          const role = userData?.role || 'logistics'
          const redirects: Record<string, string> = {
            admin: '/admin/users',
            logistics: '/logistics',
            trips: '/trips',
          }
          navigate(redirects[role] || '/logistics')
        } else {
          navigate('/logistics')
        }
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Invalid email or password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fff7ed] lg:grid lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative min-h-[48vh] lg:min-h-screen">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={heroImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-orange-950/45 via-orange-900/10 to-slate-950/20" />
        </div>

        <div className="relative z-10 flex min-h-[48vh] items-center px-6 py-10 sm:px-10 lg:min-h-screen lg:px-20">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-2xl text-white drop-shadow"
          >
            <div className="mb-8 flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-[22px] bg-white text-3xl font-black text-primary shadow-xl shadow-orange-950/20">
                S
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">SafariTour</h1>
                <p className="text-sm font-medium text-white/80">Operations Management</p>
              </div>
            </div>

            <AnimatedHeadline text={heroTitle} />
            <div className="mt-5 max-w-xl space-y-1 text-base font-medium leading-7 text-white/90 sm:text-lg">
              {heroMessages.map((message, index) => (
                <motion.p
                  key={message}
                  custom={index}
                  variants={sentenceItem}
                  initial="hidden"
                  animate="visible"
                >
                  {message}
                </motion.p>
              ))}
            </div>

          </motion.div>
        </div>
      </section>

      <section className="flex min-h-[52vh] items-center justify-center bg-[radial-gradient(circle_at_top_right,#FFEDD5_0%,#F8FAFC_36%,#ECFEFF_100%)] px-5 py-10 lg:min-h-screen lg:px-12">
        <motion.div
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="w-full max-w-md"
        >
          <div className="overflow-hidden rounded-2xl border border-white bg-white/88 shadow-2xl shadow-slate-300/50 backdrop-blur">
            <div className="h-2 bg-gradient-to-r from-orange-400 via-primary to-cyan-400" />
            <div className="p-7 sm:p-9">
              <div className="mb-7">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Secure portal</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Welcome back</h2>
                <p className="mt-2 text-sm text-slate-600">Sign in to manage tours, vehicles, bookings, and payments.</p>
              </div>

              <AnimatePresence mode="wait">
                {showSuccess ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center py-14 text-center"
                  >
                    <div className="mb-5 grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-success ring-8 ring-emerald-100">
                      <motion.svg
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5 }}
                        className="h-10 w-10"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </motion.svg>
                    </div>
                    <p className="text-lg font-bold text-success">Signed in successfully</p>
                    <p className="mt-1 text-sm text-slate-500">Redirecting to your dashboard...</p>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    className="space-y-5"
                  >
                    <FieldShell label="Email" icon={<MailIcon />}>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/12"
                      />
                    </FieldShell>

                    <FieldShell label="Password" icon={<LockIcon />}>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          required
                          className="h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 pr-12 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-primary"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </div>
                    </FieldShell>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600">
                        <input
                          type="checkbox"
                          className="h-5 w-5 rounded-md border-slate-300 text-primary focus:ring-primary/25"
                        />
                        Remember me
                      </label>
                      <button type="button" className="text-sm font-bold text-primary transition hover:text-orange-600">
                        Forgot password?
                      </button>
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: 'auto' }}
                          exit={{ opacity: 0, y: -8, height: 0 }}
                          className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                        >
                          <AlertIcon />
                          {error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-teal-600 text-base font-black text-white shadow-lg shadow-primary/25 transition hover:from-orange-500 hover:to-primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoading ? (
                        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <>
                          Sign In
                          <ArrowIcon />
                        </>
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  )
}

function AnimatedHeadline({ text }: { text: string }) {
  return (
    <motion.h2
      variants={wordContainer}
      initial="hidden"
      animate="visible"
      className="max-w-2xl text-3xl font-black leading-[1.16] sm:text-4xl lg:text-5xl"
      aria-label={text}
    >
      {text.split(' ').map((word, index) => (
  <motion.span
    key={`${word}-${index}`}
    variants={wordItem}
    className="inline-block"
    aria-hidden="true"
  >
    {word}
    {'\u00A0'}
  </motion.span>
))}
    </motion.h2>
  )
}

function FieldShell({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-800">{label}</label>
      <div className="grid grid-cols-[52px_1fr] gap-3">
        <div className="grid h-12 place-items-center rounded-lg bg-gradient-to-br from-orange-100 to-teal-50 text-primary ring-1 ring-orange-200/70">
          {icon}
        </div>
        {children}
      </div>
    </div>
  )
}

function MailIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7.5h16v9H4v-9Zm0 0 8 5.5 8-5.5" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10V8a5 5 0 0 1 10 0v2m-9 0h8a2 2 0 0 1 2 2v6H6v-6a2 2 0 0 1 2-2Z" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18M9.8 9.8A3 3 0 0 0 14.2 14.2M7.3 7.8C4.2 9.6 2.5 12 2.5 12s3.5 6 9.5 6c1.5 0 2.9-.4 4.1-1M12 6c6 0 9.5 6 9.5 6a15.5 15.5 0 0 1-2.7 3.2" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M10.3 4.9 3.7 16.3A2 2 0 0 0 5.4 19h13.2a2 2 0 0 0 1.7-2.7L13.7 4.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  )
}
