import { useState } from "react"
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  LogIn,
  ShieldCheck,
} from "lucide-react"

interface LoginProps {
  onLogin: () => void
}

function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    const cleanEmail = email.trim().toLowerCase()
    const allowedEmail =
      cleanEmail.endsWith("@gov.in") || cleanEmail.endsWith("@gmail.com")

    if (!allowedEmail) {
      setError("Please use an authorized @gov.in or @gmail.com email address.")
      return
    }

    if (!password.trim()) {
      setError("Please enter your password.")
      return
    }

    // Demo login only. Connect this handler to backend authentication later.
    onLogin()
  }

  return (
    <main className="login-shell">
      <section className="watershed-panel" aria-label="Watershed map illustration">
        <div className="map-art" aria-hidden="true">
          <svg viewBox="0 0 900 1100" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="terrain" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#092d3b" />
                <stop offset=".48" stopColor="#174d3c" />
                <stop offset="1" stopColor="#092d42" />
              </linearGradient>
              <pattern id="fields" width="150" height="128" patternUnits="userSpaceOnUse" patternTransform="rotate(-17)">
                <path d="M0 0h70v55H0zM78 0h72v55H78zM0 63h70v65H0zM78 63h72v65H78z" fill="#81a65b" fillOpacity=".18" stroke="#b5ca83" strokeOpacity=".25" strokeWidth="2" />
                <path d="M8 8h53v38H8zM87 72h53v48H87z" fill="#d4be70" fillOpacity=".13" />
              </pattern>
              <pattern id="forest" width="65" height="65" patternUnits="userSpaceOnUse">
                <circle cx="9" cy="15" r="9" fill="#276345" fillOpacity=".7" />
                <circle cx="37" cy="40" r="15" fill="#0c443d" fillOpacity=".66" />
                <circle cx="58" cy="7" r="8" fill="#52834b" fillOpacity=".58" />
              </pattern>
              <filter id="glow"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            <rect width="900" height="1100" fill="url(#terrain)" />
            <path d="M0 40 170 0l96 82-67 126 88 108-72 128 40 155-95 117 48 143-93 115L0 900zM590 0l118 76-44 97 115 103-29 118 130 75v-469zM0 1000l182-89 121 65 145-80 122 63 166-91 164 49v183H0z" fill="url(#forest)" />
            <path d="M0 0h900v1100H0z" fill="url(#fields)" opacity=".62" />
            <path d="M439 -20c-28 91 32 126 2 196s-64 81-38 145 87 82 60 145-111 88-83 159 106 74 77 141-104 85-81 151 88 106 45 203" fill="none" stroke="#138cc5" strokeOpacity=".42" strokeWidth="15" />
            <path d="M439 -20c-28 91 32 126 2 196s-64 81-38 145 87 82 60 145-111 88-83 159 106 74 77 141-104 85-81 151 88 106 45 203" fill="none" stroke="#36b8ed" strokeWidth="4" />
            <g fill="none" stroke="#5cb9dc" strokeOpacity=".66" strokeWidth="2">
              <path d="M416 177 336 230l-41 79-98 23M423 212l103 35 42 87 104 30M395 331l-96 62-53 110-100 40M455 390l116 33 67 86 125 9M378 528l-70 83-16 110-117 65M449 563l109 46 75 92 127 38M365 695l-94 67-38 112-101 50M433 786l99 43 69 110 129 37" />
              <path d="M283 140 250 230l56 72-92 74 47 68-71 87 80 83-70 94 47 76-74 78M583 145l-53 91 82 61-34 93 91 66-44 92 96 87-38 96 99 77M120 340l105 14 54 61 94-8M140 496l118 6 48 61 93-3M119 685l115 16 40 65 88-9M586 290l-89 17-49 69M691 503l-106 2-39 56M702 699l-106-4-51 58" />
            </g>
            <path d="M254 257c52-58 116-85 186-66 62-56 144-32 186 15 63 11 93 69 115 119 58 37 54 119 22 169 28 76-13 140-61 173-8 76-75 122-143 123-52 49-133 38-179 3-75 12-123-39-136-98-62-44-72-113-41-168-30-78 4-140 51-170Z" fill="none" stroke="#c9f2ff" strokeWidth="4" filter="url(#glow)" />
            <path d="M254 257c52-58 116-85 186-66 62-56 144-32 186 15 63 11 93 69 115 119 58 37 54 119 22 169 28 76-13 140-61 173-8 76-75 122-143 123-52 49-133 38-179 3-75 12-123-39-136-98-62-44-72-113-41-168-30-78 4-140 51-170Z" fill="#46a8b5" fillOpacity=".08" />
            <path d="M413 516c35-27 63-36 84-31 36 9 47 49 34 89-15 48-1 70-34 104-34 35-53 69-70 107-17 39-57 43-65 7-9-39 14-80 7-118-7-37-30-63-23-102 8-38 32-37 67-56Z" fill="#14a8d2" fillOpacity=".55" stroke="#72d9f1" strokeWidth="3" />
          </svg>
        </div>
        <div className="map-shade" />

        <div className="map-brand">
          <div className="map-brand-mark"><ShieldCheck size={24} /></div>
          <div>
            <p>JalDrishti</p>
            <span>GeoAI Watershed Intelligence</span>
          </div>
        </div>

        <p className="map-tagline">Data to Decisions<br />for Water Secure India</p>

        <div className="map-label label-boundary"><i />Watershed Boundary</div>
        <div className="map-label label-drainage"><i />Drainage Network</div>
        <div className="map-label label-water"><i />Water Body</div>
        <div className="map-label label-agri"><i />Agricultural Area</div>

        <div className="map-legend">
          <div><b className="legend-boundary" /> Watershed Boundary</div>
          <div><b className="legend-river" /> Drainage Network</div>
          <div><b className="legend-water" /> Water Body</div>
          <div><b className="legend-land" /> Agriculture &amp; Forest</div>
          <div className="scale"><span>0</span><i /><span>2.5</span><i /><span>5</span><i /><span>10 km</span></div>
        </div>

        <div className="map-footer"><span className="leaf-mark">✦</span> Healthy Watersheds <span className="footer-divider">|</span> Prosperous Rural India</div>
      </section>

      <section className="login-panel">
        <div className="login-content">
          <div className="login-logo-lockup">
            <img
              src="/logos/jaldrishti-icon.png"
              alt=""
              className="login-logo"
            />
            <div className="login-logo-copy">
              <strong><span>Jal</span>Drishti</strong>
              <small>GeoAI Watershed Intelligence</small>
            </div>
          </div>
          <div className="login-rule" />
          <header className="login-heading">
            <h1>Sign in to JalDrishti</h1>
            <p>Access geospatial data, field evidence and AI-powered insights for watershed planning and monitoring.</p>
          </header>

          <form onSubmit={handleLogin} className="login-form">
            <div className="field-group">
              <label htmlFor="email">Official Email</label>
              <div className="input-wrap">
                <Mail aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); setError("") }}
                  placeholder="name@government.in"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrap">
                <LockKeyhole aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => { setPassword(event.target.value); setError("") }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="remember-option">
                <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
                Remember me
              </label>
              <button type="button" className="forgot-button">Forgot password?</button>
            </div>

            {error && <div className="login-error" role="alert">{error}</div>}

            <button type="submit" className="sign-in-button"><LogIn />Sign In</button>
          </form>

          <div className="authorized-note"><span /><LockKeyhole />Authorized government and project users only.<span /></div>

          <aside className="secure-card">
            <div className="secure-icon"><ShieldCheck /></div>
            <div><strong>Secure access</strong><p>Your data and session are protected with industry-standard security measures.</p></div>
          </aside>
        </div>

        <div className="rural-horizon" aria-hidden="true">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0 55 80 38l70 21 78-35 95 44 85-24 80 22 79-41 91 35 64-18 85 29 74-37 73 34 86-27v79H0z" fill="#c6e2fa" opacity=".55" />
            <path d="M0 83c170-16 254-5 398-17 146-12 239 13 389-2 141-14 279 8 413-9v65H0z" fill="#d7eafa" opacity=".86" />
            <g fill="#8ab5d8" opacity=".55"><path d="M80 90c-4-14 5-22 17-27-2 10-3 17-1 27h7c-5-20 2-28 15-37-1 12-5 23-10 37h11v8H61v-8zm147 1c-1-10 5-16 15-20-1 8-3 13-2 20h7c-3-15 3-22 13-28 0 9-3 18-8 28h12v7h-57v-7zm685 2c-4-16 4-24 17-31-2 11-3 19-1 31h7c-4-22 3-29 17-39-1 13-5 25-10 39h12v8h-64v-8zm152-1c-2-12 5-20 15-25-1 9-3 16-2 25h7c-4-18 3-26 14-33-1 11-4 22-9 33h11v8h-55v-8z" /></g>
          </svg>
        </div>
        <footer className="login-footer">Ministry of Rural Development <span>|</span> Department of Land Resources <span>|</span> Government of India</footer>
      </section>
    </main>
  )
}

export default Login
