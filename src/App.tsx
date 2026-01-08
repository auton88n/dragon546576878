import { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import "@/lib/i18n";
import LoadingSpinner from "./components/shared/LoadingSpinner";
import ScrollToTop from "./components/shared/ScrollToTop";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AuthBootstrap from "./components/auth/AuthBootstrap";
import { lazyWithPreload, registerPreloader } from "./lib/lazyWithPreload";
import { useAuthStore } from "./stores/authStore";

// Eager load - critical path (homepage)
import Index from "./pages/Index";

// Lazy load with preload capability - secondary pages
const { Component: AboutPage, preload: preloadAbout } = lazyWithPreload(() => import('./pages/AboutPage'));
const { Component: ContactPage, preload: preloadContact } = lazyWithPreload(() => import('./pages/ContactPage'));
const { Component: BookingPage, preload: preloadBooking } = lazyWithPreload(() => import('./pages/BookingPage'));
const { Component: ConfirmationPage } = lazyWithPreload(() => import('./pages/ConfirmationPage'));
const { Component: PaymentCallbackPage } = lazyWithPreload(() => import('./pages/PaymentCallbackPage'));
const { Component: PaymentPage } = lazyWithPreload(() => import('./pages/PaymentPage'));
const { Component: MyTicketsPage, preload: preloadMyTickets } = lazyWithPreload(() => import('./pages/MyTicketsPage'));
const { Component: LoginPage } = lazyWithPreload(() => import('./pages/LoginPage'));
const { Component: ScannerPage } = lazyWithPreload(() => import('./pages/ScannerPage'));
const { Component: AdminPage } = lazyWithPreload(() => import('./pages/AdminPage'));
const { Component: SupportDashboardPage } = lazyWithPreload(() => import('./pages/SupportDashboardPage'));
const { Component: GroupBookingsPage, preload: preloadGroupBookings } = lazyWithPreload(() => import('./pages/GroupBookingsPage'));
const { Component: SupportPage, preload: preloadSupport } = lazyWithPreload(() => import('./pages/SupportPage'));
const { Component: TermsPage, preload: preloadTerms } = lazyWithPreload(() => import('./pages/TermsPage'));
const { Component: NotFound } = lazyWithPreload(() => import('./pages/NotFound'));

// Redirect helper for resume-payment route
const ResumePaymentRedirect = () => {
  const { bookingId } = useParams();
  return <Navigate to={`/pay/${bookingId}`} replace />;
};

// Lazy load chat widget - use direct import to avoid ref warning
const { Component: ChatWidgetComponent } = lazyWithPreload(() => import('./components/support/ChatWidget'));

// Register preloaders for header navigation
registerPreloader('/about', preloadAbout);
registerPreloader('/contact', preloadContact);
registerPreloader('/book', preloadBooking);
registerPreloader('/my-tickets', preloadMyTickets);
registerPreloader('/group-bookings', preloadGroupBookings);
registerPreloader('/support', preloadSupport);
registerPreloader('/terms', preloadTerms);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

// Minimal suspense fallback - just the loading spinner centered
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <LoadingSpinner size="lg" />
  </div>
);

// Gate component to conditionally render ChatWidget
const ChatWidgetGate = () => {
  const location = useLocation();
  const role = useAuthStore((s) => s.role);
  
  // Hide for staff users everywhere
  const isStaffUser = !!role;
  
  // Hide on specific routes
  const excludedRoutes = ['/login', '/admin', '/scan', '/support-dashboard', '/support'];
  const isExcludedPath = excludedRoutes.some(route => 
    location.pathname === route || location.pathname.startsWith(route + '/')
  );
  
  if (isStaffUser || isExcludedPath) return null;
  
  return <ChatWidgetComponent />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthBootstrap />
        <Suspense fallback={<PageLoader />}>
          <ScrollToTop />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/book" element={<BookingPage />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/confirmation/:bookingId" element={<ConfirmationPage />} />
            <Route path="/payment-callback" element={<PaymentCallbackPage />} />
            <Route path="/payment-callback/:bookingId" element={<PaymentCallbackPage />} />
            <Route path="/pay/:bookingId" element={<PaymentPage />} />
            <Route path="/resume-payment/:bookingId" element={<ResumePaymentRedirect />} />
            <Route path="/my-tickets" element={<MyTicketsPage />} />
            <Route path="/group-bookings" element={<GroupBookingsPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected Routes - Scanner */}
            <Route
              path="/scan"
              element={
                <ProtectedRoute allowedRoles={['scanner', 'admin']}>
                  <ScannerPage />
                </ProtectedRoute>
              }
            />
            
            {/* Protected Routes - Admin */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            
            {/* Protected Routes - Support */}
            <Route
              path="/support-dashboard"
              element={
                <ProtectedRoute allowedRoles={['support', 'admin', 'manager']}>
                  <SupportDashboardPage />
                </ProtectedRoute>
              }
            />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ChatWidgetGate />
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
