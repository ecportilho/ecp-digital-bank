/**
 * Route configuration for ECP Digital Bank
 *
 * Routes are registered in App.tsx via React Router v6.
 * This file documents all available routes for reference.
 */

export const ROUTES = {
  // Public
  LOGIN: '/login',
  REGISTER: '/register',

  // Protected - Main
  DASHBOARD: '/',
  EXTRATO: '/extrato',

  // Protected - Pix
  PIX_ENVIAR: '/pix/enviar',
  PIX_RECEBER: '/pix/receber',
  PIX_CHAVES: '/pix/chaves',

  // Protected - Cards
  CARTOES: '/cartoes',

  // Protected - Payments
  PAGAMENTOS: '/pagamentos',

  // Protected - Profile
  PERFIL: '/perfil',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]
