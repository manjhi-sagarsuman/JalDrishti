import { useState } from "react"
import DashboardLayout from "./layouts/DashboardLayout"
import Dashboard from "./pages/Dashboard"
import Login from "./pages/Login"

function App() {
  const [loggedIn, setLoggedIn] = useState(false)

  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />
  }

  return (
    <DashboardLayout>
      <Dashboard />
    </DashboardLayout>
  )
}

export default App