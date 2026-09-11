export type ToastType = 'info' | 'success' | 'warning' | 'error' | 'loading';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

export interface ToastOptions {
  type: ToastType;
  title: string;
  message?: string;
}

export type Theme = 'light' | 'dark';

export type RoutePath = '/' | '/admin' | '/users' | '/pos' | '404';

export type AdminTab = 'dashboard' | 'profile' | 'personnel' | 'catalog-hub' | 'welfare' | 'batches' | 'folders' | 'products' | 'sellers' | 'promotions' | 'orders' | 'import' | 'pos';
