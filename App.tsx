import "./global.css";

import "@/lib/fullstoryNamespace";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthGate from "@/components/auth/AuthGate";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Trips from "./pages/Trips";
import Wallet from "./pages/Wallet";
import Profile from "./pages/Profile";
import FigmaApp from "./pages/FigmaApp";
import Splash from "./pages/Splash";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import RegisterName from "./pages/RegisterName";
import RegisterContact from "./pages/RegisterContact";
import UserOtp from "./pages/UserOtp";
import VehicleChoice from "./pages/VehicleChoice";
import UserRegisterName from "./pages/UserRegisterName";
import UserRegisterContact from "./pages/UserRegisterContact";
import UserPersonalDetails from "./pages/UserPersonalDetails";
import UserDocuments from "./pages/UserDocuments";
import PersonalDetails from "./pages/PersonalDetails";
import Documents from "./pages/Documents";
import DriverDetails from "./pages/DriverDetails";
import Search from "./pages/Search";
import TripSummary from "./pages/TripSummary";
import UserVerify from "./pages/UserVerify";
import UserDetails from "./pages/UserDetails";
import Safety from "./pages/Safety";
import Admin from "./pages/Admin";
import TrackPage from "./pages/Track";
import AdminOverview from "./pages/admin/Overview";
import AdminUsers from "./pages/admin/Users";
import AdminDrivers from "./pages/admin/Drivers";
import AdminTrips from "./pages/admin/Trips";
import AdminReports from "./pages/admin/Reports";
import AdminSettings from "./pages/admin/Settings";
import AdminCommissions from "./pages/admin/Commissions";
import AdminLogin from "./pages/admin/Login";
import { AppStoreProvider } from "./lib/store";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppStoreProvider>
        <BrowserRouter>
          <React.Suspense fallback={null}>
            <Routes>
              <Route path="/splash" element={<Splash />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/register/name" element={<RegisterName />} />
              <Route path="/register/contact" element={<RegisterContact />} />
              <Route path="/user/register/name" element={<UserRegisterName />} />
              <Route path="/user/register/contact" element={<UserRegisterContact />} />
              <Route path="/user/register/details" element={<UserPersonalDetails />} />
              <Route path="/user/register/documents" element={<UserDocuments />} />
              <Route path="/user/otp" element={<UserOtp />} />
              <Route path="/vehicle" element={<VehicleChoice />} />
              <Route path="/register/details" element={<PersonalDetails />} />
              <Route path="/register/documents" element={<Documents />} />

              {/* Protected routes: require login */}
              <Route path="/" element={<AuthGate><Index /></AuthGate>} />
              <Route path="/search" element={<AuthGate><Search /></AuthGate>} />
              <Route path="/user/verify" element={<AuthGate><UserVerify /></AuthGate>} />
              <Route path="/user/:id" element={<AuthGate><UserDetails /></AuthGate>} />
              <Route path="/safety" element={<AuthGate><Safety /></AuthGate>} />
              <Route path="/driver/:id" element={<AuthGate><DriverDetails /></AuthGate>} />
              <Route path="/driver/trips" element={<AuthGate><Trips /></AuthGate>} />
              <Route path="/driver/wallet" element={<AuthGate><Wallet /></AuthGate>} />
              <Route path="/driver/profile" element={<AuthGate><Profile /></AuthGate>} />
              <Route path="/trip/summary" element={<AuthGate><TripSummary /></AuthGate>} />
              <Route path="/app" element={<AuthGate><FigmaApp /></AuthGate>} />
              <Route path="/trips" element={<AuthGate><Trips /></AuthGate>} />
              <Route path="/wallet" element={<AuthGate><Wallet /></AuthGate>} />
              <Route path="/profile" element={<AuthGate><Profile /></AuthGate>} />
              <Route path="/admin" element={<AuthGate><Admin /></AuthGate>}>
                <Route index element={<AdminOverview />} />
                <Route path="dashboard" element={<AdminOverview />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="drivers" element={<AdminDrivers />} />
                <Route path="trips" element={<AdminTrips />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="commissions" element={<AdminCommissions />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              {/* Public tracking page */}
              <Route path="/track/:id" element={<TrackPage />} />

              {/* catch-all */}
              <Route path="*" element={<AuthGate><NotFound /></AuthGate>} />
            </Routes>
          </React.Suspense>
        </BrowserRouter>
      </AppStoreProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
